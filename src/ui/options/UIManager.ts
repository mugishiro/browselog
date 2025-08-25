import { Visit } from '../../types';
import { PaginationManager } from './PaginationManager';

export class UIManager {
    private paginationManager: PaginationManager;
    private onVisitCheckboxChange?: (visitId: string, checked: boolean) => void;
    private onPageNumberClick?: (page: number) => void;
    private selectedVisitIds: Set<string> = new Set();

    constructor(paginationManager: PaginationManager) {
        this.paginationManager = paginationManager;
    }

    displayVisits(visits: Visit[]): void {
        const tableBody = document.querySelector('.history-table tbody') as unknown as HTMLElement;
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

    private createVisitTableRow(visit: Visit, tableBody: unknown): void {
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
        const checkbox = mainRow.querySelector('.visit-checkbox') as HTMLInputElement;
        if (checkbox) {
            // Set initial state based on selected visits
            checkbox.checked = this.selectedVisitIds.has(visit.id!.toString());

            checkbox.addEventListener('change', e => {
                const target = e.target as HTMLInputElement;
                const visitId = target.getAttribute('data-visit-id') || '';
                this.onVisitCheckboxChange?.(visitId, target.checked);
            });
        }

        (tableBody as HTMLElement).appendChild(mainRow);
    }

    updatePagination(): void {
        const totalPages = this.paginationManager.getTotalPages();
        const totalItems = this.paginationManager.getTotalItems();
        const startIndex = this.paginationManager.getStartIndex();
        const endIndex = this.paginationManager.getEndIndex();

        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            if (totalItems === 0) {
                paginationInfo.textContent = 'Showing: 0-0 / 0 items';
            } else {
                paginationInfo.textContent = `Showing: ${startIndex + 1}-${endIndex} / ${totalItems} items`;
            }
        }

        const firstPageBtn = document.getElementById('firstPage') as HTMLButtonElement;
        const prevPageBtn = document.getElementById('prevPage') as HTMLButtonElement;
        const nextPageBtn = document.getElementById('nextPage') as HTMLButtonElement;
        const lastPageBtn = document.getElementById('lastPage') as HTMLButtonElement;

        if (firstPageBtn) firstPageBtn.disabled = !this.paginationManager.hasPrevPage();
        if (prevPageBtn) prevPageBtn.disabled = !this.paginationManager.hasPrevPage();
        if (nextPageBtn) nextPageBtn.disabled = !this.paginationManager.hasNextPage();
        if (lastPageBtn) lastPageBtn.disabled = !this.paginationManager.hasNextPage();

        this.displayPageNumbers(totalPages);
    }

    private displayPageNumbers(totalPages: number): void {
        const pageNumbersContainer = document.getElementById('pageNumbers');
        if (!pageNumbersContainer) return;

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

    updateDeleteSelectedButton(selectedCount: number): void {
        const deleteSelectedButton = document.getElementById('deleteSelected') as HTMLButtonElement;
        if (deleteSelectedButton) {
            deleteSelectedButton.disabled = selectedCount === 0;
        }
    }

    switchMainTab(tabType: 'history' | 'daily' | 'domain' | 'hourly'): void {
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

    private formatDate(timestamp: number): string {
        return new Date(timestamp).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    private truncateText(text: string, maxLength: number): string {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    setOnVisitCheckboxChange(handler: (visitId: string, checked: boolean) => void): void {
        this.onVisitCheckboxChange = handler;
    }

    setOnPageNumberClick(handler: (page: number) => void): void {
        this.onPageNumberClick = handler;
    }

    setSelectedVisitIds(selectedIds: Set<string>): void {
        this.selectedVisitIds = new Set(selectedIds);
    }

    clearSelectedVisitIds(): void {
        this.selectedVisitIds.clear();
    }
}
