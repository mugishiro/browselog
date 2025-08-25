import { Visit } from '../types';

const APP_CONFIG = {
    DB_NAME: 'browselog',
    DB_VERSION: 7,
} as const;

const STORE_NAMES = {
    VISITS: 'visits',
} as const;

const INDEX_NAMES = {
    BY_URL: 'by_url',
    BY_DOMAIN: 'by_domain',
    BY_STARTED_AT: 'by_started_at',
} as const;

export class DatabaseManager {
    private static instance: DatabaseManager;
    private dbPromise: Promise<IDBDatabase> | null = null;
    private isConnecting: boolean = false;

    private constructor() {}

    static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }

    openDB(): Promise<IDBDatabase> {
        if (this.dbPromise && !this.isConnecting) return this.dbPromise;

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

    private resetConnection(): void {
        this.dbPromise = null;
        this.isConnecting = false;
    }

    private createDatabaseSchema(db: IDBDatabase): void {
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

    async transaction<T>(
        storeName: string,
        mode: IDBTransactionMode,
        fn: (store: IDBObjectStore) => Promise<T>
    ): Promise<T> {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            try {
                const tx = db.transaction(storeName, mode);
                const store = tx.objectStore(storeName);

                fn(store).then(resolve).catch(reject);

                tx.onerror = () => reject(tx.error);
            } catch (error) {
                if (error instanceof Error && error.name === 'InvalidStateError') {
                    this.resetConnection();
                    reject(error);
                } else {
                    reject(error);
                }
            }
        });
    }

    async addVisit(visit: Omit<Visit, 'id'>): Promise<number> {
        return this.transaction(STORE_NAMES.VISITS, 'readwrite', store => {
            const request = store.add(visit);
            return new Promise<number>((resolve, reject) => {
                request.onsuccess = () => resolve(request.result as number);
                request.onerror = () => reject(request.error);
            });
        });
    }

    async updateVisit(id: number, updates: Partial<Visit>): Promise<void> {
        return this.transaction(STORE_NAMES.VISITS, 'readwrite', store => {
            const getRequest = store.get(id);
            return new Promise<void>((resolve, reject) => {
                getRequest.onsuccess = () => {
                    const existingData = getRequest.result;
                    if (existingData) {
                        const updatedData = { ...existingData, ...updates };
                        const putRequest = store.put(updatedData);
                        putRequest.onsuccess = () => resolve();
                        putRequest.onerror = () => reject(putRequest.error);
                    } else {
                        reject(new Error(`Visit with id ${id} not found`));
                    }
                };
                getRequest.onerror = () => reject(getRequest.error);
            });
        });
    }

    async findVisitByUrl(url: string, retryCount = 0): Promise<Visit | null> {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                try {
                    const tx = db.transaction(STORE_NAMES.VISITS, 'readonly');
                    const store = tx.objectStore(STORE_NAMES.VISITS);
                    const index = store.index(INDEX_NAMES.BY_URL);
                    const req = index.getAll(url);

                    req.onsuccess = () => {
                        const results = req.result as Visit[];
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
                } catch (error) {
                    reject(error);
                }
            });
        } catch (error) {
            if (error instanceof Error && error.name === 'InvalidStateError' && retryCount === 0) {
                console.warn('Database connection error, retrying findVisitByUrl...', error);
                this.resetConnection();
                await new Promise(resolve => window.setTimeout(resolve, 100));
                return this.findVisitByUrl(url, retryCount + 1);
            } else {
                throw error;
            }
        }
    }

    async queryVisits(
        from?: number,
        to?: number,
        keyword?: string,
        retryCount = 0
    ): Promise<Visit[]> {
        try {
            const db = await this.openDB();
            return new Promise((resolve, reject) => {
                try {
                    const tx = db.transaction(STORE_NAMES.VISITS, 'readonly');
                    const store = tx.objectStore(STORE_NAMES.VISITS);
                    const req = store.getAll();

                    req.onsuccess = () => {
                        let results = req.result as Visit[];

                        if (from !== undefined) {
                            results = results.filter(v => v.startedAt >= from);
                        }
                        if (to !== undefined) {
                            results = results.filter(v => v.startedAt < to);
                        }

                        if (keyword) {
                            const kw = keyword.toLowerCase();
                            results = results.filter(
                                v =>
                                    v.url.toLowerCase().includes(kw) ||
                                    v.title.toLowerCase().includes(kw) ||
                                    v.domain.toLowerCase().includes(kw)
                            );
                        }

                        results.sort((a, b) => b.startedAt - a.startedAt);
                        resolve(results);
                    };
                    req.onerror = () => reject(req.error);
                } catch (error) {
                    reject(error);
                }
            });
        } catch (error) {
            if (error instanceof Error && error.name === 'InvalidStateError' && retryCount === 0) {
                console.warn('Database connection error, retrying...', error);
                this.resetConnection();
                await new Promise(resolve => window.setTimeout(resolve, 100));
                return this.queryVisits(from, to, keyword, retryCount + 1);
            } else {
                throw error;
            }
        }
    }

    async deleteVisit(id: number): Promise<void> {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAMES.VISITS, 'readwrite');
            const store = tx.objectStore(STORE_NAMES.VISITS);
            const req = store.delete(id);

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async clearAllVisits(): Promise<void> {
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
