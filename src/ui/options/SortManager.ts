import { Visit } from '../../types';

export class SortManager {
    private currentSortField: string = 'lastVisitedAt';
    private currentSortDirection: 'asc' | 'desc' = 'desc';

    getCurrentSortField(): string {
        return this.currentSortField;
    }

    getCurrentSortDirection(): 'asc' | 'desc' {
        return this.currentSortDirection;
    }

    setSort(field: string): void {
        if (this.currentSortField === field) {
            this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSortField = field;
            this.currentSortDirection = 'desc';
        }
    }

    sortVisits(visits: Visit[]): Visit[] {
        const sortedVisits = [...visits];

        sortedVisits.sort((a, b) => {
            let aValue: number;
            let bValue: number;

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

    updateSortUI(): void {
        const sortableHeaders = document.querySelectorAll('.history-table th.sortable');
        sortableHeaders.forEach(header => {
            const sortField = header.getAttribute('data-sort');
            const sortIcon = header.querySelector('.sort-icon');

            if (sortIcon) {
                if (sortField === this.currentSortField) {
                    sortIcon.textContent = this.currentSortDirection === 'asc' ? '↑' : '↓';
                } else {
                    sortIcon.textContent = '↕';
                }
            }
        });
    }
}
