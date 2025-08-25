/******/ (() => { // webpackBootstrap
/******/ 	"use strict";

;// ./src/types/index.ts
function isNavMessage(msg) {
    return msg.kind === 'nav';
}

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

;// ./src/core/messageHandler.ts


const NAV_PHASES = {
    START: 'start',
    END: 'end',
    UPDATE: 'update',
    PAUSE: 'pause',
    RESUME: 'resume',
};
class MessageHandler {
    constructor() {
        this.visitService = new VisitService();
    }
    async routeMessage(msg) {
        if (isNavMessage(msg)) {
            await this.handleNavMessage(msg);
        }
        else {
            console.warn('MessageHandler: Unhandled message type', { kind: msg.kind });
        }
    }
    async handleNavMessage(msg) {
        try {
            const phase = msg.phase.replace('nav:', '');
            switch (phase) {
                case NAV_PHASES.START:
                    await this.visitService.startVisit(msg);
                    break;
                case NAV_PHASES.END:
                    await this.visitService.endVisit(msg);
                    break;
                case NAV_PHASES.UPDATE:
                    await this.visitService.updateVisit(msg);
                    break;
                case NAV_PHASES.PAUSE:
                    await this.visitService.pauseVisit(msg);
                    break;
                case NAV_PHASES.RESUME:
                    await this.visitService.resumeVisit(msg);
                    break;
                default:
                    console.warn('MessageHandler: Unknown nav phase', {
                        phase: msg.phase,
                        extractedPhase: phase,
                    });
            }
        }
        catch (error) {
            console.error('MessageHandler: Error handling nav message', { error });
        }
    }
}

;// ./src/core/background.ts

const messageHandler = new MessageHandler();
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !sender?.tab) {
        console.warn('Background: Invalid message or sender', { msg, sender });
        sendResponse({ success: false, error: 'Invalid message or sender' });
        return;
    }
    messageHandler.routeMessage(msg).catch(error => {
        console.error('Background: Error handling message', { error });
    });
    sendResponse({ success: true });
});

/******/ })()
;