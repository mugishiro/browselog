export class EventManager {
    private onMainTabSwitch?: (tabType: 'history' | 'daily' | 'domain' | 'hourly') => void;
    private onKeywordFilter?: () => void;
    private onExportData?: () => void;
    private onDeleteData?: () => void;
    private onDeleteSelected?: () => void;
    private onPeriodChange?: (period: string, chartType: string) => void;
    private onChartUpdate?: (chartType: string) => void;
    private onHistoryUpdate?: () => void;
    private onTopNChange?: () => void;
    private onPaginationChange?: (action: string) => void;
    private onSort?: (field: string) => void;
    private onVisitCheckboxChange?: (visitId: string, checked: boolean) => void;

    initializeMainTabListeners(): void {
        const mainTabs = document.querySelectorAll('.main-tab');
        mainTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabType = tab.getAttribute('data-tab') as
                    | 'history'
                    | 'daily'
                    | 'domain'
                    | 'hourly';
                this.onMainTabSwitch?.(tabType);
            });
        });
    }

    initializeSearchListeners(): void {
        const searchInput = document.getElementById('q') as HTMLInputElement;
        if (searchInput) {
            let searchTimeout: number;
            searchInput.addEventListener('input', () => {
                if (searchTimeout) {
                    window.clearTimeout(searchTimeout);
                }
                searchTimeout = window.setTimeout(() => {
                    this.onKeywordFilter?.();
                }, 100);
            });
        }

        const exportDataButton = document.getElementById('exportData') as HTMLButtonElement;
        if (exportDataButton) {
            exportDataButton.onclick = () => this.onExportData?.();
        }

        const deleteDataButton = document.getElementById('deleteData') as HTMLButtonElement;
        if (deleteDataButton) {
            deleteDataButton.onclick = () => this.onDeleteData?.();
        }

        const deleteSelectedButton = document.getElementById('deleteSelected') as HTMLButtonElement;
        if (deleteSelectedButton) {
            deleteSelectedButton.onclick = () => this.onDeleteSelected?.();
        }
    }

    initializeChartEventListeners(): void {
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

    initializePaginationListeners(): void {
        const firstPageBtn = document.getElementById('firstPage') as HTMLButtonElement;
        const prevPageBtn = document.getElementById('prevPage') as HTMLButtonElement;
        const nextPageBtn = document.getElementById('nextPage') as HTMLButtonElement;
        const lastPageBtn = document.getElementById('lastPage') as HTMLButtonElement;

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

    initializeSortListeners(): void {
        const sortableHeaders = document.querySelectorAll('.history-table th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', e => {
                const target = e.target as HTMLElement;
                const sortField = target.closest('th')?.getAttribute('data-sort');
                if (sortField) {
                    this.onSort?.(sortField);
                }
            });
        });
    }

    private addPeriodChangeListener(elementId: string, chartType: string): void {
        const element = document.getElementById(elementId) as HTMLSelectElement;
        if (element) {
            element.addEventListener('change', () => {
                this.onPeriodChange?.(element.value, chartType);
            });
        }
    }

    private addChartUpdateListener(elementId: string, chartType: string): void {
        const element = document.getElementById(elementId) as HTMLButtonElement;
        if (element) {
            element.addEventListener('click', () => {
                this.onChartUpdate?.(chartType);
            });
        }
    }

    private addHistoryUpdateListener(): void {
        const element = document.getElementById('updateHistory') as HTMLButtonElement;
        if (element) {
            element.addEventListener('click', () => {
                this.onHistoryUpdate?.();
            });
        }
    }

    private addTopNChangeListener(): void {
        const element = document.getElementById('topN') as HTMLSelectElement;
        if (element) {
            element.addEventListener('change', () => {
                this.onTopNChange?.();
            });
        }
    }

    // Event handlers setters
    setOnMainTabSwitch(
        handler: (tabType: 'history' | 'daily' | 'domain' | 'hourly') => void
    ): void {
        this.onMainTabSwitch = handler;
    }

    setOnKeywordFilter(handler: () => void): void {
        this.onKeywordFilter = handler;
    }

    setOnExportData(handler: () => void): void {
        this.onExportData = handler;
    }

    setOnDeleteData(handler: () => void): void {
        this.onDeleteData = handler;
    }

    setOnDeleteSelected(handler: () => void): void {
        this.onDeleteSelected = handler;
    }

    setOnPeriodChange(handler: (period: string, chartType: string) => void): void {
        this.onPeriodChange = handler;
    }

    setOnChartUpdate(handler: (chartType: string) => void): void {
        this.onChartUpdate = handler;
    }

    setOnHistoryUpdate(handler: () => void): void {
        this.onHistoryUpdate = handler;
    }

    setOnTopNChange(handler: () => void): void {
        this.onTopNChange = handler;
    }

    setOnPaginationChange(handler: (action: string) => void): void {
        this.onPaginationChange = handler;
    }

    setOnSort(handler: (field: string) => void): void {
        this.onSort = handler;
    }

    setOnVisitCheckboxChange(handler: (visitId: string, checked: boolean) => void): void {
        this.onVisitCheckboxChange = handler;
    }
}
