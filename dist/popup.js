/******/ (() => { // webpackBootstrap
/******/ 	"use strict";

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

;// ./src/ui/popup.ts



class PopupManager {
    constructor() {
        this.currentVisit = null;
        this.updateInterval = null;
        this.visitService = new VisitService();
        this.db = DatabaseManager.getInstance();
        this.initialize();
    }
    async initialize() {
        try {
            await this.loadCurrentPageInfo();
            await this.loadStats();
            this.setupEventListeners();
            this.startRealTimeUpdates();
            this.showContent();
        }
        catch {
            this.showError();
        }
    }
    async loadCurrentPageInfo() {
        // Get current active tab information
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];
        if (currentTab) {
            this.updatePageInfo(currentTab.title || '', currentTab.url || '', currentTab.favIconUrl);
            // Get current page visit data
            if (currentTab.url) {
                this.currentVisit = await this.db.findVisitByUrl(currentTab.url);
            }
        }
    }
    updatePageInfo(title, url, favIconUrl) {
        const titleElement = document.getElementById('pageTitle');
        const urlElement = document.getElementById('pageUrl');
        const faviconElement = document.getElementById('favicon');
        if (titleElement) {
            titleElement.textContent = title || 'No Title';
        }
        if (urlElement) {
            try {
                const urlObj = new URL(url);
                urlElement.textContent = urlObj.hostname + urlObj.pathname;
            }
            catch {
                urlElement.textContent = url;
            }
        }
        if (faviconElement && favIconUrl) {
            faviconElement.src = favIconUrl;
            faviconElement.style.display = 'block';
        }
    }
    async loadStats() {
        try {
            // Today's statistics
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStart = today.getTime();
            const todayEnd = todayStart + 86400000; // 24 hours later
            const todayVisits = await this.visitService.queryVisits(todayStart, todayEnd);
            const allVisits = await this.visitService.queryVisits();
            // Statistics calculation
            const todayVisitCount = todayVisits.length;
            const todayTotalTime = todayVisits.reduce((sum, visit) => sum + (visit.totalDwellTime || 0), 0);
            const totalVisitCount = allVisits.length;
            const totalTime = allVisits.reduce((sum, visit) => sum + (visit.totalDwellTime || 0), 0);
            // UI update
            this.updateStatsDisplay({
                todayVisits: todayVisitCount,
                todayTime: Math.round(todayTotalTime / 60),
                totalVisits: totalVisitCount,
                totalTime: Math.round(totalTime / 60),
            });
        }
        catch {
            // Error handling
        }
    }
    updateStatsDisplay(stats) {
        const elements = {
            todayVisits: document.getElementById('todayVisits'),
            todayTime: document.getElementById('todayTime'),
            totalVisits: document.getElementById('totalVisits'),
            totalTime: document.getElementById('totalTime'),
        };
        if (elements.todayVisits)
            elements.todayVisits.textContent = stats.todayVisits.toString();
        if (elements.todayTime)
            elements.todayTime.textContent = `${stats.todayTime} min`;
        if (elements.totalVisits)
            elements.totalVisits.textContent = stats.totalVisits.toString();
        if (elements.totalTime)
            elements.totalTime.textContent = `${stats.totalTime} min`;
    }
    startRealTimeUpdates() {
        this.updateCurrentTime();
        this.updateInterval = window.setInterval(() => {
            this.updateCurrentTime();
        }, 1000);
    }
    updateCurrentTime() {
        const currentTimeElement = document.getElementById('currentTime');
        const statusIndicator = document.getElementById('statusIndicator');
        if (!currentTimeElement || !statusIndicator)
            return;
        if (this.currentVisit && this.currentVisit.startedAt) {
            const currentTime = Date.now();
            const elapsedMs = currentTime - this.currentVisit.startedAt;
            const elapsedSeconds = Math.floor(elapsedMs / 1000);
            const totalSeconds = (this.currentVisit.totalDwellTime || 0) + elapsedSeconds;
            currentTimeElement.textContent = formatDuration(totalSeconds);
            statusIndicator.className = 'status-indicator status-active';
        }
        else {
            currentTimeElement.textContent = '00:00';
            statusIndicator.className = 'status-indicator status-paused';
        }
    }
    setupEventListeners() {
        const openOptionsButton = document.getElementById('openOptions');
        const refreshDataButton = document.getElementById('refreshData');
        if (openOptionsButton) {
            openOptionsButton.addEventListener('click', () => {
                chrome.runtime.openOptionsPage();
                window.close();
            });
        }
        if (refreshDataButton) {
            refreshDataButton.addEventListener('click', async () => {
                await this.loadCurrentPageInfo();
                await this.loadStats();
            });
        }
    }
    showContent() {
        const loadingElement = document.getElementById('loading');
        const contentElement = document.getElementById('content');
        if (loadingElement)
            loadingElement.style.display = 'none';
        if (contentElement)
            contentElement.style.display = 'block';
    }
    showError() {
        const loadingElement = document.getElementById('loading');
        const errorElement = document.getElementById('error');
        if (loadingElement)
            loadingElement.style.display = 'none';
        if (errorElement)
            errorElement.style.display = 'block';
    }
    destroy() {
        if (this.updateInterval) {
            window.clearInterval(this.updateInterval);
        }
    }
}
// Initialize popup
new PopupManager();
// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Add cleanup logic if needed
});

/******/ })()
;