import { DatabaseManager } from '../../core/database';
import { Visit } from '../../types';

export class HistoryManager {
    private db: DatabaseManager;
    private allVisits: Visit[] = [];
    private filteredVisits: Visit[] = [];
    private selectedVisits: Set<string> = new Set();

    constructor() {
        this.db = DatabaseManager.getInstance();
    }

    async loadVisits(from?: number, to?: number): Promise<void> {
        this.allVisits = await this.db.queryVisits(from, to, '');
        this.filteredVisits = [...this.allVisits];
    }

    filterByKeyword(keyword: string): void {
        if (keyword) {
            this.filteredVisits = this.allVisits.filter(visit => {
                const title = (visit.title || '').toLowerCase();
                const url = (visit.url || '').toLowerCase();
                const searchTerm = keyword.toLowerCase();
                return title.includes(searchTerm) || url.includes(searchTerm);
            });
        } else {
            this.filteredVisits = [...this.allVisits];
        }
    }

    getFilteredVisits(): Visit[] {
        return this.filteredVisits;
    }

    getAllVisits(): Visit[] {
        return this.allVisits;
    }

    selectVisit(visitId: string, checked: boolean): void {
        if (checked) {
            this.selectedVisits.add(visitId);
        } else {
            this.selectedVisits.delete(visitId);
        }
    }

    getSelectedVisits(): Set<string> {
        return this.selectedVisits;
    }

    clearSelectedVisits(): void {
        this.selectedVisits.clear();
    }

    async deleteSelectedVisits(): Promise<void> {
        for (const visitId of this.selectedVisits) {
            await this.db.deleteVisit(parseInt(visitId));
        }
        this.selectedVisits.clear();
    }

    async deleteAllVisits(): Promise<void> {
        await this.db.clearAllVisits();
        this.allVisits = [];
        this.filteredVisits = [];
        this.selectedVisits.clear();
    }
}
