/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 322:
/***/ ((__unused_webpack_module, __unused_webpack___webpack_exports__, __webpack_require__) => {


// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js
var injectStylesIntoStyleTag = __webpack_require__(72);
var injectStylesIntoStyleTag_default = /*#__PURE__*/__webpack_require__.n(injectStylesIntoStyleTag);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/styleDomAPI.js
var styleDomAPI = __webpack_require__(825);
var styleDomAPI_default = /*#__PURE__*/__webpack_require__.n(styleDomAPI);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/insertBySelector.js
var insertBySelector = __webpack_require__(659);
var insertBySelector_default = /*#__PURE__*/__webpack_require__.n(insertBySelector);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js
var setAttributesWithoutAttributes = __webpack_require__(56);
var setAttributesWithoutAttributes_default = /*#__PURE__*/__webpack_require__.n(setAttributesWithoutAttributes);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/insertStyleElement.js
var insertStyleElement = __webpack_require__(540);
var insertStyleElement_default = /*#__PURE__*/__webpack_require__.n(insertStyleElement);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/styleTagTransform.js
var styleTagTransform = __webpack_require__(113);
var styleTagTransform_default = /*#__PURE__*/__webpack_require__.n(styleTagTransform);
// EXTERNAL MODULE: ./node_modules/css-loader/dist/cjs.js!./src/ui/options.css
var options = __webpack_require__(634);
;// ./src/ui/options.css

      
      
      
      
      
      
      
      
      

var options_options = {};

options_options.styleTagTransform = (styleTagTransform_default());
options_options.setAttributes = (setAttributesWithoutAttributes_default());
options_options.insert = insertBySelector_default().bind(null, "head");
options_options.domAPI = (styleDomAPI_default());
options_options.insertStyleElement = (insertStyleElement_default());

var update = injectStylesIntoStyleTag_default()(options/* default */.A, options_options);




       /* harmony default export */ const ui_options = (options/* default */.A && options/* default */.A.locals ? options/* default */.A.locals : undefined);

;// ./src/core/database.ts
const APP_CONFIG = {
    DB_NAME: 'browselog',
    DB_VERSION: 7,
};
const STORE_NAMES = {
    VISITS: 'visits',
};
const INDEX_NAMES = {
    BY_URL: 'by_url',
    BY_DOMAIN: 'by_domain',
    BY_STARTED_AT: 'by_started_at',
};
class DatabaseManager {
    constructor() {
        this.dbPromise = null;
        this.isConnecting = false;
    }
    static getInstance() {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }
    openDB() {
        if (this.dbPromise && !this.isConnecting)
            return this.dbPromise;
        this.isConnecting = true;
        this.dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(APP_CONFIG.DB_NAME, APP_CONFIG.DB_VERSION);
            req.onupgradeneeded = () => {
                this.createDatabaseSchema(req.result);
            };
            req.onsuccess = () => {
                this.isConnecting = false;
                const db = req.result;
                db.onclose = () => {
                    console.warn('Database connection closed unexpectedly');
                    this.resetConnection();
                };
                resolve(db);
            };
            req.onerror = () => {
                this.isConnecting = false;
                this.dbPromise = null;
                reject(req.error);
            };
        });
        return this.dbPromise;
    }
    resetConnection() {
        this.dbPromise = null;
        this.isConnecting = false;
    }
    createDatabaseSchema(db) {
        if (db.objectStoreNames.contains(STORE_NAMES.VISITS)) {
            db.deleteObjectStore(STORE_NAMES.VISITS);
        }
        const visitsStore = db.createObjectStore(STORE_NAMES.VISITS, {
            keyPath: 'id',
            autoIncrement: true,
        });
        visitsStore.createIndex(INDEX_NAMES.BY_URL, 'url', { unique: false });
        visitsStore.createIndex(INDEX_NAMES.BY_DOMAIN, 'domain');
        visitsStore.createIndex(INDEX_NAMES.BY_STARTED_AT, 'startedAt');
    }
    async transaction(storeName, mode, fn) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            try {
                const tx = db.transaction(storeName, mode);
                const store = tx.objectStore(storeName);
                fn(store).then(resolve).catch(reject);
                tx.onerror = () => reject(tx.error);
            }
            catch (error) {
                if (error instanceof Error && error.name === 'InvalidStateError') {
                    this.resetConnection();
                    reject(error);
                }
                else {
                    reject(error);
                }
            }
        });
    }
    async addVisit(visit) {
        return this.transaction(STORE_NAMES.VISITS, 'readwrite', store => {
            const request = store.add(visit);
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        });
    }
    async updateVisit(id, updates) {
        return this.transaction(STORE_NAMES.VISITS, 'readwrite', store => {
            const getRequest = store.get(id);
            return new Promise((resolve, reject) => {
                getRequest.onsuccess = () => {
                    const existingData = getRequest.result;
                    if (existingData) {
                        const updatedData = { ...existingData, ...updates };
                        const putRequest = store.put(updatedData);
                        putRequest.onsuccess = () => resolve();
                        putRequest.onerror = () => reject(putRequest.error);
                    }
                    else {
                        reject(new Error(`Visit with id ${id} not found`));
                    }
                };
                getRequest.onerror = () => reject(getRequest.error);
            });
        });
    }
    async findVisitByUrl(url, retryCount = 0) {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                try {
                    const tx = db.transaction(STORE_NAMES.VISITS, 'readonly');
                    const store = tx.objectStore(STORE_NAMES.VISITS);
                    const index = store.index(INDEX_NAMES.BY_URL);
                    const req = index.getAll(url);
                    req.onsuccess = () => {
                        const results = req.result;
                        if (results.length === 0) {
                            resolve(null);
                            return;
                        }
                        const latestVisit = results.reduce((latest, current) => {
                            return current.startedAt > latest.startedAt ? current : latest;
                        });
                        resolve(latestVisit);
                    };
                    req.onerror = () => reject(req.error);
                }
                catch (error) {
                    reject(error);
                }
            });
        }
        catch (error) {
            if (error instanceof Error && error.name === 'InvalidStateError' && retryCount === 0) {
                console.warn('Database connection error, retrying findVisitByUrl...', error);
                this.resetConnection();
                await new Promise(resolve => window.setTimeout(resolve, 100));
                return this.findVisitByUrl(url, retryCount + 1);
            }
            else {
                throw error;
            }
        }
    }
    async queryVisits(from, to, keyword, retryCount = 0) {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                try {
                    const tx = db.transaction(STORE_NAMES.VISITS, 'readonly');
                    const store = tx.objectStore(STORE_NAMES.VISITS);
                    const req = store.getAll();
                    req.onsuccess = () => {
                        let results = req.result;
                        if (from !== undefined) {
                            results = results.filter(v => v.startedAt >= from);
                        }
                        if (to !== undefined) {
                            results = results.filter(v => v.startedAt < to);
                        }
                        if (keyword) {
                            const kw = keyword.toLowerCase();
                            results = results.filter(v => v.url.toLowerCase().includes(kw) ||
                                v.title.toLowerCase().includes(kw) ||
                                v.domain.toLowerCase().includes(kw));
                        }
                        results.sort((a, b) => b.startedAt - a.startedAt);
                        resolve(results);
                    };
                    req.onerror = () => reject(req.error);
                }
                catch (error) {
                    reject(error);
                }
            });
        }
        catch (error) {
            if (error instanceof Error && error.name === 'InvalidStateError' && retryCount === 0) {
                console.warn('Database connection error, retrying...', error);
                this.resetConnection();
                await new Promise(resolve => window.setTimeout(resolve, 100));
                return this.queryVisits(from, to, keyword, retryCount + 1);
            }
            else {
                throw error;
            }
        }
    }
    async deleteVisit(id) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAMES.VISITS, 'readwrite');
            const store = tx.objectStore(STORE_NAMES.VISITS);
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
    async clearAllVisits() {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAMES.VISITS, 'readwrite');
            const store = tx.objectStore(STORE_NAMES.VISITS);
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
}

;// ./src/ui/options/HistoryManager.ts

class HistoryManager {
    constructor() {
        this.allVisits = [];
        this.filteredVisits = [];
        this.selectedVisits = new Set();
        this.db = DatabaseManager.getInstance();
    }
    async loadVisits(from, to) {
        this.allVisits = await this.db.queryVisits(from, to, '');
        this.filteredVisits = [...this.allVisits];
    }
    filterByKeyword(keyword) {
        if (keyword) {
            this.filteredVisits = this.allVisits.filter(visit => {
                const title = (visit.title || '').toLowerCase();
                const url = (visit.url || '').toLowerCase();
                const searchTerm = keyword.toLowerCase();
                return title.includes(searchTerm) || url.includes(searchTerm);
            });
        }
        else {
            this.filteredVisits = [...this.allVisits];
        }
    }
    getFilteredVisits() {
        return this.filteredVisits;
    }
    getAllVisits() {
        return this.allVisits;
    }
    selectVisit(visitId, checked) {
        if (checked) {
            this.selectedVisits.add(visitId);
        }
        else {
            this.selectedVisits.delete(visitId);
        }
    }
    getSelectedVisits() {
        return this.selectedVisits;
    }
    clearSelectedVisits() {
        this.selectedVisits.clear();
    }
    async deleteSelectedVisits() {
        for (const visitId of this.selectedVisits) {
            await this.db.deleteVisit(parseInt(visitId));
        }
        this.selectedVisits.clear();
    }
    async deleteAllVisits() {
        await this.db.clearAllVisits();
        this.allVisits = [];
        this.filteredVisits = [];
        this.selectedVisits.clear();
    }
}

;// ./src/ui/options/PaginationManager.ts
class PaginationManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.totalItems = 0;
    }
    setTotalItems(total) {
        this.totalItems = total;
    }
    getTotalItems() {
        return this.totalItems;
    }
    getCurrentPage() {
        return this.currentPage;
    }
    getItemsPerPage() {
        return this.itemsPerPage;
    }
    getTotalPages() {
        return Math.ceil(this.totalItems / this.itemsPerPage);
    }
    getStartIndex() {
        return (this.currentPage - 1) * this.itemsPerPage;
    }
    getEndIndex() {
        return Math.min(this.startIndex + this.itemsPerPage, this.totalItems);
    }
    goToPage(page) {
        const totalPages = this.getTotalPages();
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            return true;
        }
        return false;
    }
    goToFirstPage() {
        return this.goToPage(1);
    }
    goToLastPage() {
        return this.goToPage(this.getTotalPages());
    }
    goToPrevPage() {
        return this.goToPage(this.currentPage - 1);
    }
    goToNextPage() {
        return this.goToPage(this.currentPage + 1);
    }
    resetToFirstPage() {
        this.currentPage = 1;
    }
    hasNextPage() {
        return this.currentPage < this.getTotalPages();
    }
    hasPrevPage() {
        return this.currentPage > 1;
    }
    get startIndex() {
        return this.getStartIndex();
    }
    get endIndex() {
        return this.getEndIndex();
    }
}

;// ./src/ui/options/SortManager.ts
class SortManager {
    constructor() {
        this.currentSortField = 'lastVisitedAt';
        this.currentSortDirection = 'desc';
    }
    getCurrentSortField() {
        return this.currentSortField;
    }
    getCurrentSortDirection() {
        return this.currentSortDirection;
    }
    setSort(field) {
        if (this.currentSortField === field) {
            this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
        }
        else {
            this.currentSortField = field;
            this.currentSortDirection = 'desc';
        }
    }
    sortVisits(visits) {
        const sortedVisits = [...visits];
        sortedVisits.sort((a, b) => {
            let aValue;
            let bValue;
            switch (this.currentSortField) {
                case 'lastVisitedAt':
                    aValue = a.lastVisitedAt || a.startedAt;
                    bValue = b.lastVisitedAt || b.startedAt;
                    break;
                case 'startedAt':
                    aValue = a.startedAt;
                    bValue = b.startedAt;
                    break;
                case 'totalDwellTime':
                    aValue = a.totalDwellTime || 0;
                    bValue = b.totalDwellTime || 0;
                    break;
                case 'totalVisits':
                    aValue = a.totalVisits || 0;
                    bValue = b.totalVisits || 0;
                    break;
                default:
                    return 0;
            }
            if (aValue < bValue) {
                return this.currentSortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return this.currentSortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
        return sortedVisits;
    }
    updateSortUI() {
        const sortableHeaders = document.querySelectorAll('.history-table th.sortable');
        sortableHeaders.forEach(header => {
            const sortField = header.getAttribute('data-sort');
            const sortIcon = header.querySelector('.sort-icon');
            if (sortIcon) {
                if (sortField === this.currentSortField) {
                    sortIcon.textContent = this.currentSortDirection === 'asc' ? '↑' : '↓';
                }
                else {
                    sortIcon.textContent = '↕';
                }
            }
        });
    }
}

;// ./src/utils/timeUtils.ts
function calculateSecondsBetween(startTime, endTime) {
    return Math.round((endTime - startTime) / 1000);
}
function formatDuration(seconds) {
    if (seconds < 60) {
        return `${seconds}s`;
    }
    else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }
    else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
}

;// ./src/services/VisitService.ts


class VisitService {
    constructor() {
        this.db = DatabaseManager.getInstance();
    }
    async startVisit(msg) {
        try {
            const existingVisit = await this.db.findVisitByUrl(msg.url);
            if (existingVisit && existingVisit.id) {
                await this.db.updateVisit(existingVisit.id, {
                    lastVisitedAt: msg.ts,
                    totalVisits: existingVisit.totalVisits + 1,
                });
            }
            else {
                await this.db.addVisit({
                    url: msg.url,
                    domain: msg.domain,
                    title: msg.title || '',
                    startedAt: msg.ts,
                    lastVisitedAt: msg.ts,
                    totalVisits: 1,
                    totalDwellTime: 0,
                });
            }
        }
        catch (error) {
            console.error('VisitService: Error in startVisit', error);
        }
    }
    async endVisit(msg) {
        try {
            const existingVisit = await this.db.findVisitByUrl(msg.url);
            if (!existingVisit || !existingVisit.id) {
                return;
            }
            const sessionTime = calculateSecondsBetween(existingVisit.lastVisitedAt, msg.ts);
            const totalDwellTime = (existingVisit.totalDwellTime || 0) + sessionTime;
            await this.db.updateVisit(existingVisit.id, {
                lastVisitedAt: msg.ts,
                totalDwellTime: totalDwellTime,
            });
        }
        catch (error) {
            console.error('VisitService: Error in endVisit', error);
        }
    }
    async updateVisit(msg) {
        try {
            const existingVisit = await this.db.findVisitByUrl(msg.url);
            if (!existingVisit || !existingVisit.id) {
                return;
            }
            const totalDwellTime = (existingVisit.totalDwellTime || 0) + 30;
            await this.db.updateVisit(existingVisit.id, {
                totalDwellTime: totalDwellTime,
            });
        }
        catch (error) {
            console.error('VisitService: Error in updateVisit', error);
        }
    }
    async pauseVisit(msg) {
        try {
            const existingVisit = await this.db.findVisitByUrl(msg.url);
            if (!existingVisit || !existingVisit.id) {
                return;
            }
            const sessionTime = calculateSecondsBetween(existingVisit.lastVisitedAt, msg.ts);
            const totalDwellTime = (existingVisit.totalDwellTime || 0) + sessionTime;
            await this.db.updateVisit(existingVisit.id, {
                totalDwellTime: totalDwellTime,
            });
        }
        catch (error) {
            console.error('VisitService: Error in pauseVisit', error);
        }
    }
    async resumeVisit(msg) {
        try {
            const existingVisit = await this.db.findVisitByUrl(msg.url);
            if (!existingVisit || !existingVisit.id) {
                return;
            }
            await this.db.updateVisit(existingVisit.id, {
                lastVisitedAt: msg.ts,
                totalVisits: existingVisit.totalVisits + 1,
            });
        }
        catch (error) {
            console.error('VisitService: Error in resumeVisit', error);
        }
    }
    async queryVisits(from, to, keyword) {
        try {
            const visits = await this.db.queryVisits(from, to, keyword);
            return visits;
        }
        catch {
            return [];
        }
    }
}

;// ./src/utils/chartUtils.ts
function groupVisitsByDay(visits) {
    const dailyMap = new Map();
    visits.forEach(visit => {
        const date = new Date(visit.startedAt).toISOString().split('T')[0];
        const dwellTime = visit.totalDwellTime || 0;
        if (!dailyMap.has(date)) {
            dailyMap.set(date, {
                date,
                visits: 0,
                totalTime: 0,
                avgTime: 0,
            });
        }
        const dayStats = dailyMap.get(date);
        if (dayStats) {
            dayStats.visits += 1;
            dayStats.totalTime += dwellTime;
            dayStats.avgTime = dayStats.totalTime / dayStats.visits;
        }
    });
    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}
function groupVisitsByDomain(visits) {
    const domainMap = new Map();
    visits.forEach(visit => {
        const domain = visit.domain;
        const dwellTime = visit.totalDwellTime || 0;
        if (!domainMap.has(domain)) {
            domainMap.set(domain, {
                domain,
                visits: 0,
                totalTime: 0,
                avgTime: 0,
            });
        }
        const domainStats = domainMap.get(domain);
        if (domainStats) {
            domainStats.visits += 1;
            domainStats.totalTime += dwellTime;
            domainStats.avgTime = domainStats.totalTime / domainStats.visits;
        }
    });
    return Array.from(domainMap.values()).sort((a, b) => b.totalTime - a.totalTime);
}
function groupVisitsByHour(visits) {
    const hourlyMap = new Map();
    for (let hour = 0; hour < 24; hour++) {
        hourlyMap.set(hour, {
            hour,
            visits: 0,
            totalTime: 0,
        });
    }
    visits.forEach(visit => {
        const hour = new Date(visit.startedAt).getHours();
        const dwellTime = visit.totalDwellTime || 0;
        const hourStats = hourlyMap.get(hour);
        if (hourStats) {
            hourStats.visits += 1;
            hourStats.totalTime += dwellTime;
        }
    });
    return Array.from(hourlyMap.values());
}
function createDailyLineChart(dailyStats) {
    const labels = dailyStats.map(stat => {
        const date = new Date(stat.date + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    return {
        labels,
        datasets: [
            {
                label: 'Dwell Time (min)',
                data: dailyStats.map(stat => Math.round(stat.totalTime / 60)),
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
            },
            {
                label: 'Visit Count',
                data: dailyStats.map(stat => stat.visits),
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                borderWidth: 2,
                fill: false,
            },
        ],
    };
}
function createDomainBarChart(domainStats, topN = 10) {
    const topDomains = domainStats.slice(0, topN);
    const labels = topDomains.map(stat => {
        const domain = stat.domain;
        return domain.length > 20 ? domain.substring(0, 17) + '...' : domain;
    });
    const colors = [
        '#3498db',
        '#e74c3c',
        '#2ecc71',
        '#f39c12',
        '#9b59b6',
        '#1abc9c',
        '#34495e',
        '#e67e22',
        '#95a5a6',
        '#16a085',
    ];
    return {
        labels,
        datasets: [
            {
                label: 'Dwell Time (min)',
                data: topDomains.map(stat => Math.round(stat.totalTime / 60)),
                backgroundColor: colors.slice(0, topDomains.length),
                borderWidth: 1,
            },
        ],
    };
}
function createHourlyRadarChart(hourlyStats) {
    const labels = hourlyStats.map(stat => `${stat.hour}:00`);
    return {
        labels,
        datasets: [
            {
                label: 'Dwell Time (min)',
                data: hourlyStats.map(stat => Math.round(stat.totalTime / 60)),
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: '#3498db',
                borderWidth: 2,
            },
            {
                label: 'Visit Count',
                data: hourlyStats.map(stat => stat.visits),
                backgroundColor: 'rgba(231, 76, 60, 0.2)',
                borderColor: '#e74c3c',
                borderWidth: 2,
            },
        ],
    };
}
function filterVisitsByDateRange(visits, startDate, endDate) {
    return visits.filter(visit => {
        const visitDate = new Date(visit.startedAt).toISOString().split('T')[0];
        if (startDate) {
            const startDateStr = typeof startDate === 'number'
                ? new Date(startDate).toISOString().split('T')[0]
                : startDate;
            if (visitDate < startDateStr) {
                return false;
            }
        }
        if (endDate) {
            const endDateStr = typeof endDate === 'number'
                ? new Date(endDate).toISOString().split('T')[0]
                : endDate;
            if (visitDate > endDateStr) {
                return false;
            }
        }
        return true;
    });
}
function getColorPalette(count) {
    const baseColors = [
        '#3498db',
        '#e74c3c',
        '#2ecc71',
        '#f39c12',
        '#9b59b6',
        '#1abc9c',
        '#34495e',
        '#e67e22',
        '#95a5a6',
        '#16a085',
        '#27ae60',
        '#8e44ad',
        '#2980b9',
        '#d35400',
        '#c0392b',
    ];
    if (count <= baseColors.length) {
        return baseColors.slice(0, count);
    }
    const colors = [...baseColors];
    for (let i = baseColors.length; i < count; i++) {
        const hue = (i * 137.5) % 360;
        colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return colors;
}

;// ./src/services/ChartService.ts


class ChartService {
    constructor() {
        this.charts = new Map();
        this.visitService = new VisitService();
    }
    async createChart(chartId, canvasElement, config, _description) {
        try {
            this.destroyChart(chartId);
            // Dynamically import Chart.js with only needed components
            const { Chart } = await Promise.all(/* import() */[__webpack_require__.e(552), __webpack_require__.e(96)]).then(__webpack_require__.bind(__webpack_require__, 4));
            const chart = new Chart(canvasElement, config);
            this.charts.set(chartId, chart);
            return { success: true, chart };
        }
        catch (error) {
            const errorMessage = error.message;
            return { success: false, error: errorMessage };
        }
    }
    createDailyChartConfig(chartData) {
        return {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Daily Dwell Time',
                        font: {
                            size: 16,
                            weight: 'bold',
                        },
                    },
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const ctx = context;
                                const label = ctx.dataset.label || '';
                                const value = ctx.parsed.y;
                                if (label.includes('Time')) {
                                    return `${label}: ${value} min`;
                                }
                                return `${label}: ${value} times`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date',
                        },
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Dwell Time (min) / Visit Count',
                        },
                        beginAtZero: true,
                    },
                },
            },
        };
    }
    async createDailyChart(canvasElement, _days = 30, startDate, endDate, visits) {
        try {
            let filteredVisits;
            if (visits) {
                filteredVisits = filterVisitsByDateRange(visits, startDate, endDate);
            }
            else {
                const allVisits = await this.visitService.queryVisits();
                filteredVisits = filterVisitsByDateRange(allVisits, startDate, endDate);
            }
            if (filteredVisits.length === 0) {
                const emptyChartData = {
                    labels: ['No Data'],
                    datasets: [
                        {
                            label: 'No data found',
                            data: [0],
                            borderColor: '#95a5a6',
                            backgroundColor: 'rgba(149, 165, 166, 0.1)',
                            borderWidth: 2,
                        },
                    ],
                };
                const config = this.createDailyChartConfig(emptyChartData);
                const result = await this.createChart('daily', canvasElement, config, 'daily chart (empty)');
                return result.success ? result.chart || null : null;
            }
            const dailyStats = groupVisitsByDay(filteredVisits);
            const chartData = createDailyLineChart(dailyStats);
            const config = this.createDailyChartConfig(chartData);
            const result = await this.createChart('daily', canvasElement, config, 'daily chart');
            return result.success ? result.chart || null : null;
        }
        catch {
            return null;
        }
    }
    async createDomainChart(canvasElement, topN = 10, startDate, endDate, visits) {
        try {
            let filteredVisits;
            if (visits) {
                filteredVisits = filterVisitsByDateRange(visits, startDate, endDate);
            }
            else {
                const allVisits = await this.visitService.queryVisits();
                filteredVisits = filterVisitsByDateRange(allVisits, startDate, endDate);
            }
            const domainStats = groupVisitsByDomain(filteredVisits);
            const chartData = createDomainBarChart(domainStats, topN);
            const config = this.createDomainChartConfig(chartData, topN, domainStats);
            const result = await this.createChart('domain', canvasElement, config, 'domain chart');
            return result.success ? result.chart || null : null;
        }
        catch {
            return null;
        }
    }
    createDomainChartConfig(chartData, topN, domainStats) {
        return {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Domain Dwell Time (Top ${topN})`,
                        font: {
                            size: 16,
                            weight: 'bold',
                        },
                    },
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const ctx = context;
                                const value = ctx.parsed.y;
                                const domain = domainStats[ctx.dataIndex].domain;
                                const visits = domainStats[ctx.dataIndex].visits;
                                return [
                                    `Domain: ${domain}`,
                                    `Dwell Time: ${value} min`,
                                    `Visit Count: ${visits} times`,
                                ];
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Domain',
                        },
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Dwell Time (min)',
                        },
                        beginAtZero: true,
                    },
                },
            },
        };
    }
    async createHourlyChart(canvasElement, startDate, endDate, visits) {
        try {
            let filteredVisits;
            if (visits) {
                filteredVisits = filterVisitsByDateRange(visits, startDate, endDate);
            }
            else {
                const allVisits = await this.visitService.queryVisits();
                filteredVisits = filterVisitsByDateRange(allVisits, startDate, endDate);
            }
            const hourlyStats = groupVisitsByHour(filteredVisits);
            const chartData = createHourlyRadarChart(hourlyStats);
            const config = this.createHourlyChartConfig(chartData);
            const result = await this.createChart('hourly', canvasElement, config, 'hourly chart');
            return result.success ? result.chart || null : null;
        }
        catch {
            return null;
        }
    }
    createHourlyChartConfig(chartData) {
        return {
            type: 'radar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Hourly Activity Pattern',
                        font: {
                            size: 16,
                            weight: 'bold',
                        },
                    },
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const ctx = context;
                                const label = ctx.dataset.label || '';
                                const value = ctx.parsed.r;
                                if (label.includes('Time')) {
                                    return `${label}: ${value} min`;
                                }
                                return `${label}: ${value} times`;
                            },
                        },
                    },
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                        },
                    },
                },
            },
        };
    }
    destroyChart(chartId) {
        const existingChart = this.charts.get(chartId);
        if (existingChart) {
            existingChart.destroy();
            this.charts.delete(chartId);
        }
    }
    destroyAllCharts() {
        this.charts.forEach((chart, _chartId) => {
            chart.destroy();
        });
        this.charts.clear();
    }
}

;// ./src/ui/options/ChartManager.ts

class ChartManager {
    constructor() {
        this.currentChartType = 'history';
        this.chartService = new ChartService();
    }
    getCurrentChartType() {
        return this.currentChartType;
    }
    setCurrentChartType(type) {
        this.currentChartType = type;
    }
    async createDailyChart(canvasElement, days = 30, startDate, endDate, visits) {
        return await this.chartService.createDailyChart(canvasElement, days, startDate, endDate, visits);
    }
    async createDomainChart(canvasElement, topN = 10, startDate, endDate, visits) {
        return await this.chartService.createDomainChart(canvasElement, topN, startDate, endDate, visits);
    }
    async createHourlyChart(canvasElement, startDate, endDate, visits) {
        return await this.chartService.createHourlyChart(canvasElement, startDate, endDate, visits);
    }
    destroyChart(chartId) {
        this.chartService.destroyChart(chartId);
    }
    destroyAllCharts() {
        this.chartService.destroyAllCharts();
    }
}

;// ./src/ui/options/ExportManager.ts
class ExportManager {
    async exportData(visits, from, to) {
        const filteredVisits = visits.filter(visit => {
            const visitTime = visit.startedAt;
            return visitTime >= from && visitTime < to;
        });
        const csvData = this.convertToCSV(filteredVisits);
        const filename = `browselog_${new Date(from).toISOString().split('T')[0]}_${new Date(to).toISOString().split('T')[0]}.csv`;
        this.downloadFile(csvData, filename, 'text/csv');
    }
    convertToCSV(visits) {
        const headers = [
            'URL',
            'Title',
            'Domain',
            'Start Time',
            'Last Visited Time',
            'Dwell Time (seconds)',
            'Visit Count',
        ];
        const rows = visits.map(visit => [
            visit.url,
            visit.title || '',
            visit.domain,
            new Date(visit.startedAt).toLocaleString('en-US'),
            new Date(visit.lastVisitedAt || visit.startedAt).toLocaleString('en-US'),
            visit.totalDwellTime || 0,
            visit.totalVisits || 0,
        ]);
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
        return '\ufeff' + csvContent; // BOM for Excel
    }
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

;// ./src/ui/options/UIManager.ts
class UIManager {
    constructor(paginationManager) {
        this.selectedVisitIds = new Set();
        this.paginationManager = paginationManager;
    }
    displayVisits(visits) {
        const tableBody = document.querySelector('.history-table tbody');
        if (!tableBody) {
            console.error('historyTableBody element not found');
            return;
        }
        tableBody.innerHTML = '';
        const startIndex = this.paginationManager.getStartIndex();
        const endIndex = this.paginationManager.getEndIndex();
        const pageVisits = visits.slice(startIndex, endIndex);
        pageVisits.forEach(visit => {
            this.createVisitTableRow(visit, tableBody);
        });
        this.updatePagination();
    }
    createVisitTableRow(visit, tableBody) {
        const mainRow = document.createElement('tr');
        mainRow.innerHTML = `
            <td class="action-cell">
                <input type="checkbox" class="visit-checkbox" data-visit-id="${visit.id}">
            </td>
            <td class="time-cell">${this.formatDate(visit.lastVisitedAt || visit.startedAt)}</td>
            <td class="title-cell" title="${visit.title || '(no title)'}">
                <a href="${visit.url}" target="_blank" class="title-link">${this.truncateText(visit.title || '(no title)', 30)}</a>
            </td>
            <td class="duration-cell">${visit.totalDwellTime ?? 0}s</td>
            <td class="visit-count-cell">${visit.totalVisits}</td>
        `;
        // Add event listener to checkbox
        const checkbox = mainRow.querySelector('.visit-checkbox');
        if (checkbox) {
            // Set initial state based on selected visits
            checkbox.checked = this.selectedVisitIds.has(visit.id.toString());
            checkbox.addEventListener('change', e => {
                const target = e.target;
                const visitId = target.getAttribute('data-visit-id') || '';
                this.onVisitCheckboxChange?.(visitId, target.checked);
            });
        }
        tableBody.appendChild(mainRow);
    }
    updatePagination() {
        const totalPages = this.paginationManager.getTotalPages();
        const totalItems = this.paginationManager.getTotalItems();
        const startIndex = this.paginationManager.getStartIndex();
        const endIndex = this.paginationManager.getEndIndex();
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            if (totalItems === 0) {
                paginationInfo.textContent = 'Showing: 0-0 / 0 items';
            }
            else {
                paginationInfo.textContent = `Showing: ${startIndex + 1}-${endIndex} / ${totalItems} items`;
            }
        }
        const firstPageBtn = document.getElementById('firstPage');
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        const lastPageBtn = document.getElementById('lastPage');
        if (firstPageBtn)
            firstPageBtn.disabled = !this.paginationManager.hasPrevPage();
        if (prevPageBtn)
            prevPageBtn.disabled = !this.paginationManager.hasPrevPage();
        if (nextPageBtn)
            nextPageBtn.disabled = !this.paginationManager.hasNextPage();
        if (lastPageBtn)
            lastPageBtn.disabled = !this.paginationManager.hasNextPage();
        this.displayPageNumbers(totalPages);
    }
    displayPageNumbers(totalPages) {
        const pageNumbersContainer = document.getElementById('pageNumbers');
        if (!pageNumbersContainer)
            return;
        pageNumbersContainer.innerHTML = '';
        const currentPage = this.paginationManager.getCurrentPage();
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i.toString();
            pageButton.className = i === currentPage ? 'page-btn active' : 'page-btn';
            pageButton.onclick = () => this.onPageNumberClick?.(i);
            pageNumbersContainer.appendChild(pageButton);
        }
    }
    updateDeleteSelectedButton(selectedCount) {
        const deleteSelectedButton = document.getElementById('deleteSelected');
        if (deleteSelectedButton) {
            deleteSelectedButton.disabled = selectedCount === 0;
        }
    }
    switchMainTab(tabType) {
        const mainTabs = document.querySelectorAll('.main-tab');
        const tabPanels = document.querySelectorAll('.tab-panel');
        mainTabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === tabType) {
                tab.classList.add('active');
            }
        });
        tabPanels.forEach(panel => {
            panel.classList.remove('active');
            if (panel.id === `${tabType}Panel`) {
                panel.classList.add('active');
            }
        });
    }
    formatDate(timestamp) {
        return new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    setOnVisitCheckboxChange(handler) {
        this.onVisitCheckboxChange = handler;
    }
    setOnPageNumberClick(handler) {
        this.onPageNumberClick = handler;
    }
    setSelectedVisitIds(selectedIds) {
        this.selectedVisitIds = new Set(selectedIds);
    }
    clearSelectedVisitIds() {
        this.selectedVisitIds.clear();
    }
}

;// ./src/ui/options/EventManager.ts
class EventManager {
    initializeMainTabListeners() {
        const mainTabs = document.querySelectorAll('.main-tab');
        mainTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabType = tab.getAttribute('data-tab');
                this.onMainTabSwitch?.(tabType);
            });
        });
    }
    initializeSearchListeners() {
        const searchInput = document.getElementById('q');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                if (searchTimeout) {
                    window.clearTimeout(searchTimeout);
                }
                searchTimeout = window.setTimeout(() => {
                    this.onKeywordFilter?.();
                }, 100);
            });
        }
        const exportDataButton = document.getElementById('exportData');
        if (exportDataButton) {
            exportDataButton.onclick = () => this.onExportData?.();
        }
        const deleteDataButton = document.getElementById('deleteData');
        if (deleteDataButton) {
            deleteDataButton.onclick = () => this.onDeleteData?.();
        }
        const deleteSelectedButton = document.getElementById('deleteSelected');
        if (deleteSelectedButton) {
            deleteSelectedButton.onclick = () => this.onDeleteSelected?.();
        }
    }
    initializeChartEventListeners() {
        this.addPeriodChangeListener('historyPeriod', 'history');
        this.addPeriodChangeListener('chartPeriod', 'daily');
        this.addPeriodChangeListener('chartPeriodDomain', 'domain');
        this.addPeriodChangeListener('chartPeriodHourly', 'hourly');
        this.addChartUpdateListener('updateChart', 'daily');
        this.addChartUpdateListener('updateChartDomain', 'domain');
        this.addChartUpdateListener('updateChartHourly', 'hourly');
        this.addHistoryUpdateListener();
        this.addTopNChangeListener();
    }
    initializePaginationListeners() {
        const firstPageBtn = document.getElementById('firstPage');
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        const lastPageBtn = document.getElementById('lastPage');
        if (firstPageBtn) {
            firstPageBtn.addEventListener('click', () => this.onPaginationChange?.('first'));
        }
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => this.onPaginationChange?.('prev'));
        }
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => this.onPaginationChange?.('next'));
        }
        if (lastPageBtn) {
            lastPageBtn.addEventListener('click', () => this.onPaginationChange?.('last'));
        }
    }
    initializeSortListeners() {
        const sortableHeaders = document.querySelectorAll('.history-table th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', e => {
                const target = e.target;
                const sortField = target.closest('th')?.getAttribute('data-sort');
                if (sortField) {
                    this.onSort?.(sortField);
                }
            });
        });
    }
    addPeriodChangeListener(elementId, chartType) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('change', () => {
                this.onPeriodChange?.(element.value, chartType);
            });
        }
    }
    addChartUpdateListener(elementId, chartType) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('click', () => {
                this.onChartUpdate?.(chartType);
            });
        }
    }
    addHistoryUpdateListener() {
        const element = document.getElementById('updateHistory');
        if (element) {
            element.addEventListener('click', () => {
                this.onHistoryUpdate?.();
            });
        }
    }
    addTopNChangeListener() {
        const element = document.getElementById('topN');
        if (element) {
            element.addEventListener('change', () => {
                this.onTopNChange?.();
            });
        }
    }
    // Event handlers setters
    setOnMainTabSwitch(handler) {
        this.onMainTabSwitch = handler;
    }
    setOnKeywordFilter(handler) {
        this.onKeywordFilter = handler;
    }
    setOnExportData(handler) {
        this.onExportData = handler;
    }
    setOnDeleteData(handler) {
        this.onDeleteData = handler;
    }
    setOnDeleteSelected(handler) {
        this.onDeleteSelected = handler;
    }
    setOnPeriodChange(handler) {
        this.onPeriodChange = handler;
    }
    setOnChartUpdate(handler) {
        this.onChartUpdate = handler;
    }
    setOnHistoryUpdate(handler) {
        this.onHistoryUpdate = handler;
    }
    setOnTopNChange(handler) {
        this.onTopNChange = handler;
    }
    setOnPaginationChange(handler) {
        this.onPaginationChange = handler;
    }
    setOnSort(handler) {
        this.onSort = handler;
    }
    setOnVisitCheckboxChange(handler) {
        this.onVisitCheckboxChange = handler;
    }
}

;// ./src/ui/options/index.ts








class OptionsManager {
    constructor() {
        this.historyManager = new HistoryManager();
        this.paginationManager = new PaginationManager();
        this.sortManager = new SortManager();
        this.chartManager = new ChartManager();
        this.exportManager = new ExportManager();
        this.uiManager = new UIManager(this.paginationManager);
        this.eventManager = new EventManager();
        this.initializeEventHandlers();
        this.initializeEventListeners();
        this.loadInitialHistory();
        this.initializeDefaultChart();
    }
    initializeEventHandlers() {
        this.eventManager.setOnMainTabSwitch(tabType => this.switchMainTab(tabType));
        this.eventManager.setOnKeywordFilter(() => this.handleKeywordFilter());
        this.eventManager.setOnExportData(() => this.handleExportData());
        this.eventManager.setOnDeleteData(() => this.handleDeleteData());
        this.eventManager.setOnDeleteSelected(() => this.handleDeleteSelected());
        this.eventManager.setOnPeriodChange((period, chartType) => this.handlePeriodChange(period, chartType));
        this.eventManager.setOnChartUpdate(chartType => this.handleChartUpdate(chartType));
        this.eventManager.setOnHistoryUpdate(() => this.handleHistoryUpdate());
        this.eventManager.setOnTopNChange(() => this.handleTopNChange());
        this.eventManager.setOnPaginationChange(action => this.handlePaginationChange(action));
        this.eventManager.setOnSort(field => this.handleSort(field));
        this.eventManager.setOnVisitCheckboxChange((visitId, checked) => this.handleVisitCheckboxChange(visitId, checked));
        this.uiManager.setOnVisitCheckboxChange((visitId, checked) => this.handleVisitCheckboxChange(visitId, checked));
        this.uiManager.setOnPageNumberClick(page => this.handlePageNumberClick(page));
    }
    initializeEventListeners() {
        this.eventManager.initializeMainTabListeners();
        this.eventManager.initializeSearchListeners();
        this.eventManager.initializeChartEventListeners();
        this.eventManager.initializePaginationListeners();
        this.eventManager.initializeSortListeners();
    }
    async loadInitialHistory() {
        try {
            const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
            await this.historyManager.loadVisits(thirtyDaysAgo, undefined);
            const filteredVisits = this.historyManager.getFilteredVisits();
            this.paginationManager.setTotalItems(filteredVisits.length);
            const sortedVisits = this.sortManager.sortVisits(filteredVisits);
            this.sortManager.updateSortUI();
            this.uiManager.displayVisits(sortedVisits);
        }
        catch (error) {
            console.error('Initial history load error:', error);
        }
    }
    initializeDefaultChart() {
        this.switchMainTab('history');
    }
    switchMainTab(tabType) {
        this.chartManager.setCurrentChartType(tabType);
        this.uiManager.switchMainTab(tabType);
        if (tabType !== 'history') {
            this.updateCurrentChart();
        }
    }
    async updateCurrentChart() {
        const chartType = this.chartManager.getCurrentChartType();
        let canvasElement = null;
        if (chartType === 'daily') {
            canvasElement = document.querySelector('#chartCanvas');
        }
        else if (chartType === 'domain') {
            canvasElement = document.querySelector('#chartCanvasDomain');
        }
        else if (chartType === 'hourly') {
            canvasElement = document.querySelector('#chartCanvasHourly');
        }
        if (!canvasElement) {
            console.error('Chart elements not found');
            return;
        }
        try {
            const periodSelect = document.getElementById(`chartPeriod${chartType === 'daily' ? '' : chartType === 'domain' ? 'Domain' : 'Hourly'}`);
            const period = periodSelect?.value || '7';
            const { from, to } = this.getDateRange(parseInt(period));
            await this.historyManager.loadVisits(from, to);
            const visits = this.historyManager.getAllVisits();
            const fromDate = new Date(from).toISOString().split('T')[0];
            const toDate = new Date(to).toISOString().split('T')[0];
            if (chartType === 'daily') {
                await this.chartManager.createDailyChart(canvasElement, parseInt(period), fromDate, toDate, visits);
            }
            else if (chartType === 'domain') {
                const topNSelect = document.getElementById('topN');
                const topN = parseInt(topNSelect?.value || '5');
                await this.chartManager.createDomainChart(canvasElement, topN, fromDate, toDate, visits);
            }
            else if (chartType === 'hourly') {
                await this.chartManager.createHourlyChart(canvasElement, fromDate, toDate, visits);
            }
        }
        catch (err) {
            console.error('Chart update error:', err);
        }
    }
    handleKeywordFilter() {
        const keywordInput = document.getElementById('q');
        const keyword = keywordInput.value.trim();
        this.historyManager.filterByKeyword(keyword);
        this.paginationManager.resetToFirstPage();
        const filteredVisits = this.historyManager.getFilteredVisits();
        this.paginationManager.setTotalItems(filteredVisits.length);
        const sortedVisits = this.sortManager.sortVisits(filteredVisits);
        this.sortManager.updateSortUI();
        this.uiManager.setSelectedVisitIds(this.historyManager.getSelectedVisits());
        this.uiManager.displayVisits(sortedVisits);
    }
    async handleExportData() {
        try {
            const periodSelect = document.getElementById('historyPeriod');
            const period = periodSelect?.value || '7';
            const { from, to } = this.getDateRange(parseInt(period));
            const visits = this.historyManager.getAllVisits();
            await this.exportManager.exportData(visits, from, to);
        }
        catch (error) {
            console.error('Export error:', error);
        }
    }
    async handleDeleteData() {
        if (confirm('Delete all visit history? This action cannot be undone.')) {
            try {
                await this.historyManager.deleteAllVisits();
                await this.loadInitialHistory();
            }
            catch (error) {
                console.error('Delete error:', error);
            }
        }
    }
    async handleDeleteSelected() {
        const selectedVisits = this.historyManager.getSelectedVisits();
        if (selectedVisits.size === 0)
            return;
        if (confirm(`Delete ${selectedVisits.size} visit history items?`)) {
            try {
                await this.historyManager.deleteSelectedVisits();
                const periodSelect = document.getElementById('historyPeriod');
                const period = periodSelect?.value || '7';
                const { from, to } = this.getDateRange(parseInt(period));
                await this.historyManager.loadVisits(from, to);
                const keywordInput = document.getElementById('q');
                const keyword = keywordInput.value.trim();
                if (keyword) {
                    this.historyManager.filterByKeyword(keyword);
                }
                this.paginationManager.resetToFirstPage();
                const filteredVisits = this.historyManager.getFilteredVisits();
                this.paginationManager.setTotalItems(filteredVisits.length);
                const sortedVisits = this.sortManager.sortVisits(filteredVisits);
                this.sortManager.updateSortUI();
                this.uiManager.displayVisits(sortedVisits);
                this.historyManager.clearSelectedVisits();
                this.uiManager.clearSelectedVisitIds();
                this.uiManager.updateDeleteSelectedButton(0);
            }
            catch (error) {
                console.error('Delete selected error:', error);
            }
        }
    }
    handlePeriodChange(period, chartType) {
        if (chartType === 'history') {
            this.handleHistoryUpdate();
        }
        else {
            this.updateCurrentChart();
        }
    }
    handleChartUpdate(_chartType) {
        this.updateCurrentChart();
    }
    async handleHistoryUpdate() {
        try {
            const periodSelect = document.getElementById('historyPeriod');
            const period = periodSelect?.value || '7';
            const { from, to } = this.getDateRange(parseInt(period));
            await this.historyManager.loadVisits(from, to);
            const keywordInput = document.getElementById('q');
            const keyword = keywordInput.value.trim();
            if (keyword) {
                this.historyManager.filterByKeyword(keyword);
            }
            this.paginationManager.resetToFirstPage();
            const filteredVisits = this.historyManager.getFilteredVisits();
            this.paginationManager.setTotalItems(filteredVisits.length);
            const sortedVisits = this.sortManager.sortVisits(filteredVisits);
            this.sortManager.updateSortUI();
            this.uiManager.setSelectedVisitIds(this.historyManager.getSelectedVisits());
            this.uiManager.displayVisits(sortedVisits);
        }
        catch (error) {
            console.error('Search error:', error);
        }
    }
    handleTopNChange() {
        this.updateCurrentChart();
    }
    handlePaginationChange(action) {
        let changed = false;
        switch (action) {
            case 'first':
                changed = this.paginationManager.goToFirstPage();
                break;
            case 'prev':
                changed = this.paginationManager.goToPrevPage();
                break;
            case 'next':
                changed = this.paginationManager.goToNextPage();
                break;
            case 'last':
                changed = this.paginationManager.goToLastPage();
                break;
        }
        if (changed) {
            const filteredVisits = this.historyManager.getFilteredVisits();
            const sortedVisits = this.sortManager.sortVisits(filteredVisits);
            this.uiManager.setSelectedVisitIds(this.historyManager.getSelectedVisits());
            this.uiManager.displayVisits(sortedVisits);
        }
    }
    handleSort(field) {
        this.sortManager.setSort(field);
        const filteredVisits = this.historyManager.getFilteredVisits();
        const sortedVisits = this.sortManager.sortVisits(filteredVisits);
        this.sortManager.updateSortUI();
        this.paginationManager.resetToFirstPage();
        this.uiManager.setSelectedVisitIds(this.historyManager.getSelectedVisits());
        this.uiManager.displayVisits(sortedVisits);
    }
    handleVisitCheckboxChange(visitId, checked) {
        this.historyManager.selectVisit(visitId, checked);
        const selectedVisits = this.historyManager.getSelectedVisits();
        this.uiManager.updateDeleteSelectedButton(selectedVisits.size);
        this.uiManager.setSelectedVisitIds(selectedVisits);
    }
    handlePageNumberClick(page) {
        const changed = this.paginationManager.goToPage(page);
        if (changed) {
            const filteredVisits = this.historyManager.getFilteredVisits();
            const sortedVisits = this.sortManager.sortVisits(filteredVisits);
            this.uiManager.setSelectedVisitIds(this.historyManager.getSelectedVisits());
            this.uiManager.displayVisits(sortedVisits);
        }
    }
    getDateRange(days) {
        const now = Date.now();
        const from = now - days * 24 * 60 * 60 * 1000;
        return { from, to: now };
    }
}
new OptionsManager();


/***/ }),

/***/ 634:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   A: () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(601);
/* harmony import */ var _node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(314);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, `/* Browsing Log Analytics - Options Page Styles */

/* Base Styles */
body {
    font: 14px/1.5 system-ui;
    margin: 20px;
    background: #f5f5f5;
    color: #333;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
}

/* Typography */
h1 {
    color: #2c3e50;
    margin-bottom: 20px;
    border-bottom: 2px solid #3498db;
    padding-bottom: 10px;
}

/* Form Elements */
input,
button {
    font: inherit;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

button {
    background: #3498db;
    color: white;
    border: none;
    cursor: pointer;
    transition: background 0.3s;
}

button:hover {
    background: #2980b9;
}

#clear {
    background: #e74c3c;
}

#clear:hover {
    background: #c0392b;
}

/* Layout Components */
.row {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
    box-sizing: border-box;
}

.row input {
    flex: 1;
    min-width: 0;
}

.row button {
    white-space: nowrap;
}

/* Sections */
.data-section {
    background: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Search Controls */
.search-controls {
    margin-bottom: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #ecf0f1;
}

/* Main Tabs */
.main-tabs {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-bottom: 2px solid #ecf0f1;
    background: #f8f9fa;
    padding: 10px 15px;
    border-radius: 6px 6px 0 0;
}

.tab-buttons {
    display: flex;
    gap: 10px;
}

.action-buttons {
    display: flex;
    gap: 8px;
}

.action-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
}

.export-btn {
    background: #3498db;
    color: white;
}

.export-btn:hover {
    background: #2980b9;
}

.delete-btn {
    background: #e74c3c;
    color: white;
}

.delete-btn:hover {
    background: #c0392b;
}

.main-tab {
    padding: 10px 15px;
    background: none;
    border: none;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.3s;
    font-weight: 500;
    color: #7f8c8d;
    font-size: 14px;
}

.main-tab.active {
    color: #3498db;
    border-bottom-color: #3498db;
    font-weight: 600;
    background: white;
    border-radius: 4px 4px 0 0;
    box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
}

.main-tab:hover {
    background: #e9ecef;
    color: #2c3e50;
    border-radius: 4px 4px 0 0;
}

/* Tab Content */
.tab-content {
    background: white;
    border-radius: 0 0 6px 6px;
    padding: 20px;
    border-top: 1px solid #ecf0f1;
}

.tab-panel {
    display: none;
}

.tab-panel.active {
    display: block;
}

.section-title {
    font-size: 18px;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 15px;
    padding-bottom: 8px;
    border-bottom: 2px solid #ecf0f1;
}

/* Chart Section */
.chart-section {
    margin: 20px 0;
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    border-bottom: 2px solid #ecf0f1;
    background: #f8f9fa;
    padding: 10px 15px;
    border-radius: 6px 6px 0 0;
}

.chart-tab {
    padding: 10px 15px;
    background: none;
    border: none;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.3s;
    font-weight: 500;
    color: #7f8c8d;
    font-size: 14px;
}

.chart-tab.active {
    color: #3498db;
    border-bottom-color: #3498db;
    font-weight: 600;
    background: white;
    border-radius: 4px 4px 0 0;
    box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
}

.chart-tab:hover {
    background: #e9ecef;
    color: #2c3e50;
    border-radius: 4px 4px 0 0;
}

.chart-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    flex-wrap: wrap;
    gap: 10px;
}

.left-controls {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
}

.chart-controls input[placeholder*='Keyword'] {
    min-width: 250px;
    margin-left: auto;
    flex-shrink: 0;
}

.chart-controls label {
    margin-right: 5px;
    font-weight: 500;
    color: #2c3e50;
}

.chart-controls select,
.chart-controls input {
    min-width: 120px;
    padding: 6px 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
}

.chart-controls button {
    padding: 6px 15px;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.3s;
}

.chart-controls button:hover {
    background: #2980b9;
}

/* Refresh Button */
.refresh-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    background: transparent;
    color: #666;
    border: 1px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s;
    font-size: 18px;
    font-weight: bold;
    line-height: 1;
}

.refresh-button:hover {
    background: #f8f9fa;
    color: #333;
    border-color: #999;
}

.chart-container {
    position: relative;
    height: 400px;
    width: 100%;
    margin: 20px 0;
}

.chart-loading {
    display: none;
    text-align: center;
    padding: 50px;
    color: #7f8c8d;
}

.chart-error {
    display: none;
    text-align: center;
    padding: 50px;
    color: #e74c3c;
}

/* Table Styles */
.table-container {
    margin-top: 20px;
    width: 100%;
    box-sizing: border-box;
    overflow-x: auto;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.history-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    table-layout: fixed;
}

.history-table th {
    background: #f8f9fa;
    padding: 12px 8px;
    text-align: left;
    font-weight: 600;
    color: #2c3e50;
    border-bottom: 2px solid #ecf0f1;
    position: sticky;
    top: 0;
    z-index: 10;
}

.history-table th.sortable {
    cursor: pointer;
    user-select: none;
    transition: background-color 0.3s;
}

.history-table th.sortable:hover {
    background: #e9ecef;
}

.sort-icon {
    margin-left: 5px;
    font-size: 12px;
    color: #6c757d;
}

.history-table th.sortable.asc .sort-icon::after {
    content: '↑';
    color: #3498db;
}

.history-table th.sortable.desc .sort-icon::after {
    content: '↓';
    color: #3498db;
}

.history-table td {
    padding: 12px 8px;
    border-bottom: 1px solid #ecf0f1;
    vertical-align: top;
}

.history-table tbody tr:hover {
    background: #f8f9fa;
}

.history-table .title-cell {
    max-width: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.history-table .title-link {
    color: #3498db;
    text-decoration: none;
    transition: color 0.3s;
}

.history-table .title-link:hover {
    color: #2980b9;
    text-decoration: underline;
}

.history-table .action-header {
    width: 15px;
    text-align: center;
}

.history-table .action-cell {
    width: 15px;
    text-align: center;
}

.history-table .action-cell input[type='checkbox'] {
    cursor: pointer;
}

.history-table .time-cell {
    white-space: nowrap;
    font-size: 12px;
    color: #666;
    width: 100px;
}

.right-controls {
    display: flex;
    gap: 10px;
    align-items: center;
}

.right-controls input[placeholder*='Keyword'] {
    min-width: 250px;
}

.history-table .title-cell {
    max-width: 500px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.history-table .time-cell {
    white-space: nowrap;
    font-size: 12px;
    color: #666;
}

.history-table .duration-cell {
    white-space: nowrap;
    font-size: 12px;
    color: #666;
    text-align: left;
    font-weight: 500;
    width: 80px;
}

.history-table .visit-count-cell {
    text-align: left;
    white-space: nowrap;
    font-size: 12px;
    color: #666;
    width: 60px;
}

.history-table .visit-count {
    font-weight: 500;
    color: #2c3e50;
    font-size: 12px;
    margin-bottom: 3px;
    display: inline-block;
}

.history-table .action-cell {
    text-align: center;
}

.history-table .timeline-btn {
    padding: 3px 8px;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 10px;
    transition: background 0.3s;
    white-space: nowrap;
    min-width: 60px;
}

.history-table .timeline-btn:hover {
    background: #2980b9;
}

/* Pagination Styles */
.pagination-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #ecf0f1;
    gap: 15px;
}

.pagination-info {
    font-size: 14px;
    color: #666;
    text-align: center;
    font-weight: 500;
}

.pagination-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
}

.pagination-btn {
    padding: 6px 12px;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.3s;
}

.pagination-btn:hover:not(:disabled) {
    background: #2980b9;
}

.pagination-btn:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
}

.page-numbers {
    display: flex;
    gap: 4px;
    margin: 0 8px;
}

.page-btn {
    padding: 6px 10px;
    background: #ecf0f1;
    border: 1px solid #bdc3c7;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.3s;
    min-width: 32px;
}

.page-btn:hover {
    background: #d5dbdb;
}

.page-btn.active {
    background: #3498db;
    color: white;
    border-color: #3498db;
}

.history-table .events-row {
    background: #f8f9fa;
}

.history-table .events-cell {
    padding: 10px;
    font-size: 12px;
    color: #666;
    border-left: 3px solid #3498db;
}

/* List Section */
.list-section {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.list {
    margin-top: 20px;
    width: 100%;
    box-sizing: border-box;
    overflow-x: auto;
}

.card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
    margin: 10px 0;
    background: #fafafa;
    transition: box-shadow 0.3s;
    width: 100%;
    box-sizing: border-box;
    word-wrap: break-word;
    overflow-wrap: break-word;
}

.card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card h3 {
    margin: 0 0 10px 0;
    color: #2c3e50;
    font-size: 16px;
}

.card p {
    margin: 5px 0;
    color: #666;
    font-size: 12px;
}

.events {
    margin-top: 10px;
    background: #f8f9fa;
    border-radius: 6px;
    padding: 10px;
    max-height: 240px;
    overflow: auto;
    border-left: 3px solid #3498db;
}

/* Responsive Design */
@media (max-width: 768px) {
    body {
        margin: 10px;
        font-size: 13px;
    }

    .container {
        padding: 15px;
        max-width: 100%;
    }

    h1 {
        font-size: 20px;
        margin-bottom: 15px;
    }

    .row {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        width: 100%;
    }

    .row input,
    .row button {
        width: 100%;
        margin: 0;
        box-sizing: border-box;
    }

    .main-tabs {
        flex-direction: column;
        gap: 5px;
        padding: 8px;
    }

    .main-tab {
        padding: 8px 12px;
        font-size: 13px;
        text-align: center;
    }

    .chart-tabs {
        flex-direction: column;
        gap: 5px;
        padding: 8px;
    }

    .chart-tab {
        padding: 8px 12px;
        font-size: 13px;
        text-align: center;
    }

    .chart-controls {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
    }

    .chart-controls label {
        margin-right: 0;
        margin-bottom: 2px;
    }

    .chart-controls select,
    .chart-controls input {
        width: 100%;
        min-width: auto;
    }

    .refresh-button {
        width: 32px;
        height: 32px;
        font-size: 16px;
    }

    .chart-container {
        height: 300px;
    }

    .card {
        padding: 12px;
        margin: 8px 0;
    }

    .history-table {
        font-size: 12px;
    }

    .history-table th,
    .history-table td {
        padding: 8px 4px;
    }

    .history-table .title-cell {
        max-width: 150px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .history-table .title-cell {
        max-width: 250px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}

@media (max-width: 480px) {
    body {
        margin: 5px;
        font-size: 12px;
    }

    .container {
        padding: 10px;
    }

    h1 {
        font-size: 18px;
        margin-bottom: 10px;
    }

    .search-section {
        padding: 15px;
        margin-bottom: 15px;
    }

    .section-title {
        font-size: 16px;
        margin-bottom: 10px;
    }

    .chart-section {
        padding: 15px;
        margin: 15px 0;
    }

    .main-tabs {
        padding: 6px;
    }

    .main-tab {
        padding: 6px 10px;
        font-size: 12px;
    }

    .chart-tabs {
        padding: 6px;
    }

    .chart-tab {
        padding: 6px 10px;
        font-size: 12px;
    }

    .chart-controls {
        gap: 6px;
    }

    .chart-controls select,
    .chart-controls input {
        padding: 5px 8px;
    }

    .refresh-button {
        width: 28px;
        height: 28px;
        font-size: 14px;
    }

    .chart-container {
        height: 250px;
    }

    .list-section {
        padding: 15px;
    }

    .card {
        padding: 10px;
        margin: 6px 0;
    }

    .card h3 {
        font-size: 14px;
    }

    .card p {
        font-size: 11px;
    }

    .history-table {
        font-size: 11px;
    }

    .history-table th,
    .history-table td {
        padding: 6px 3px;
    }

    .history-table .title-cell {
        max-width: 120px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}
`, ""]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + "chartjs" + ".js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		var dataWebpackPrefix = "browselog:";
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key, chunkId) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
/******/ 		
/******/ 				script.src = url;
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			var onScriptComplete = (prev, event) => {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode && script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach((fn) => (fn(event)));
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript && document.currentScript.tagName.toUpperCase() === 'SCRIPT')
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && (!scriptUrl || !/^http(s?):/.test(scriptUrl))) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/^blob:/, "").replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			575: 0
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 				if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 					// a Promise means "currently loading".
/******/ 					if(installedChunkData) {
/******/ 						promises.push(installedChunkData[2]);
/******/ 					} else {
/******/ 						if(true) { // all chunks have JS
/******/ 							// setup Promise in chunk cache
/******/ 							var promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										var realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId, chunkId);
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		__webpack_require__.O.j = (chunkId) => (installedChunks[chunkId] === 0);
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			return __webpack_require__.O(result);
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunkbrowselog"] = self["webpackChunkbrowselog"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/nonce */
/******/ 	(() => {
/******/ 		__webpack_require__.nc = undefined;
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 	var __webpack_exports__ = __webpack_require__.O(undefined, [96], () => (__webpack_require__(322)))
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	
/******/ })()
;