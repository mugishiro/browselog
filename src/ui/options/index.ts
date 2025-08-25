import '../options.css';
import { HistoryManager } from './HistoryManager';
import { PaginationManager } from './PaginationManager';
import { SortManager } from './SortManager';
import { ChartManager } from './ChartManager';
import { ExportManager } from './ExportManager';
import { UIManager } from './UIManager';
import { EventManager } from './EventManager';

class OptionsManager {
    private historyManager: HistoryManager;
    private paginationManager: PaginationManager;
    private sortManager: SortManager;
    private chartManager: ChartManager;
    private exportManager: ExportManager;
    private uiManager: UIManager;
    private eventManager: EventManager;

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

    private initializeEventHandlers(): void {
        this.eventManager.setOnMainTabSwitch(tabType => this.switchMainTab(tabType));
        this.eventManager.setOnKeywordFilter(() => this.handleKeywordFilter());
        this.eventManager.setOnExportData(() => this.handleExportData());
        this.eventManager.setOnDeleteData(() => this.handleDeleteData());
        this.eventManager.setOnDeleteSelected(() => this.handleDeleteSelected());
        this.eventManager.setOnPeriodChange((period, chartType) =>
            this.handlePeriodChange(period, chartType)
        );
        this.eventManager.setOnChartUpdate(chartType => this.handleChartUpdate(chartType));
        this.eventManager.setOnHistoryUpdate(() => this.handleHistoryUpdate());
        this.eventManager.setOnTopNChange(() => this.handleTopNChange());
        this.eventManager.setOnPaginationChange(action => this.handlePaginationChange(action));
        this.eventManager.setOnSort(field => this.handleSort(field));
        this.eventManager.setOnVisitCheckboxChange((visitId, checked) =>
            this.handleVisitCheckboxChange(visitId, checked)
        );

        this.uiManager.setOnVisitCheckboxChange((visitId, checked) =>
            this.handleVisitCheckboxChange(visitId, checked)
        );
        this.uiManager.setOnPageNumberClick(page => this.handlePageNumberClick(page));
    }

    private initializeEventListeners(): void {
        this.eventManager.initializeMainTabListeners();
        this.eventManager.initializeSearchListeners();
        this.eventManager.initializeChartEventListeners();
        this.eventManager.initializePaginationListeners();
        this.eventManager.initializeSortListeners();
    }

    private async loadInitialHistory(): Promise<void> {
        try {
            const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
            await this.historyManager.loadVisits(thirtyDaysAgo, undefined);

            const filteredVisits = this.historyManager.getFilteredVisits();
            this.paginationManager.setTotalItems(filteredVisits.length);

            const sortedVisits = this.sortManager.sortVisits(filteredVisits);
            this.sortManager.updateSortUI();
            this.uiManager.displayVisits(sortedVisits);
        } catch (error) {
            console.error('Initial history load error:', error);
        }
    }

    private initializeDefaultChart(): void {
        this.switchMainTab('history');
    }

    private switchMainTab(tabType: 'history' | 'daily' | 'domain' | 'hourly'): void {
        this.chartManager.setCurrentChartType(tabType);
        this.uiManager.switchMainTab(tabType);

        if (tabType !== 'history') {
            this.updateCurrentChart();
        }
    }

    private async updateCurrentChart(): Promise<void> {
        const chartType = this.chartManager.getCurrentChartType();
        let canvasElement: HTMLCanvasElement | null = null;

        if (chartType === 'daily') {
            canvasElement = document.querySelector('#chartCanvas') as HTMLCanvasElement;
        } else if (chartType === 'domain') {
            canvasElement = document.querySelector('#chartCanvasDomain') as HTMLCanvasElement;
        } else if (chartType === 'hourly') {
            canvasElement = document.querySelector('#chartCanvasHourly') as HTMLCanvasElement;
        }

        if (!canvasElement) {
            console.error('Chart elements not found');
            return;
        }

        try {
            const periodSelect = document.getElementById(
                `chartPeriod${chartType === 'daily' ? '' : chartType === 'domain' ? 'Domain' : 'Hourly'}`
            ) as HTMLSelectElement;
            const period = periodSelect?.value || '7';
            const { from, to } = this.getDateRange(parseInt(period));

            await this.historyManager.loadVisits(from, to);
            const visits = this.historyManager.getAllVisits();

            const fromDate = new Date(from).toISOString().split('T')[0];
            const toDate = new Date(to).toISOString().split('T')[0];

            if (chartType === 'daily') {
                await this.chartManager.createDailyChart(
                    canvasElement,
                    parseInt(period),
                    fromDate,
                    toDate,
                    visits
                );
            } else if (chartType === 'domain') {
                const topNSelect = document.getElementById('topN') as HTMLSelectElement;
                const topN = parseInt(topNSelect?.value || '5');
                await this.chartManager.createDomainChart(
                    canvasElement,
                    topN,
                    fromDate,
                    toDate,
                    visits
                );
            } else if (chartType === 'hourly') {
                await this.chartManager.createHourlyChart(canvasElement, fromDate, toDate, visits);
            }
        } catch (err) {
            console.error('Chart update error:', err);
        }
    }

    private handleKeywordFilter(): void {
        const keywordInput = document.getElementById('q') as HTMLInputElement;
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

    private async handleExportData(): Promise<void> {
        try {
            const periodSelect = document.getElementById('historyPeriod') as HTMLSelectElement;
            const period = periodSelect?.value || '7';
            const { from, to } = this.getDateRange(parseInt(period));

            const visits = this.historyManager.getAllVisits();
            await this.exportManager.exportData(visits, from, to);
        } catch (error) {
            console.error('Export error:', error);
        }
    }

    private async handleDeleteData(): Promise<void> {
        if (confirm('Delete all visit history? This action cannot be undone.')) {
            try {
                await this.historyManager.deleteAllVisits();
                await this.loadInitialHistory();
            } catch (error) {
                console.error('Delete error:', error);
            }
        }
    }

    private async handleDeleteSelected(): Promise<void> {
        const selectedVisits = this.historyManager.getSelectedVisits();
        if (selectedVisits.size === 0) return;

        if (confirm(`Delete ${selectedVisits.size} visit history items?`)) {
            try {
                await this.historyManager.deleteSelectedVisits();

                const periodSelect = document.getElementById('historyPeriod') as HTMLSelectElement;
                const period = periodSelect?.value || '7';
                const { from, to } = this.getDateRange(parseInt(period));

                await this.historyManager.loadVisits(from, to);

                const keywordInput = document.getElementById('q') as HTMLInputElement;
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
            } catch (error) {
                console.error('Delete selected error:', error);
            }
        }
    }

    private handlePeriodChange(period: string, chartType: string): void {
        if (chartType === 'history') {
            this.handleHistoryUpdate();
        } else {
            this.updateCurrentChart();
        }
    }

    private handleChartUpdate(_chartType: string): void {
        this.updateCurrentChart();
    }

    private async handleHistoryUpdate(): Promise<void> {
        try {
            const periodSelect = document.getElementById('historyPeriod') as HTMLSelectElement;
            const period = periodSelect?.value || '7';
            const { from, to } = this.getDateRange(parseInt(period));

            await this.historyManager.loadVisits(from, to);

            const keywordInput = document.getElementById('q') as HTMLInputElement;
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
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    private handleTopNChange(): void {
        this.updateCurrentChart();
    }

    private handlePaginationChange(action: string): void {
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

    private handleSort(field: string): void {
        this.sortManager.setSort(field);

        const filteredVisits = this.historyManager.getFilteredVisits();
        const sortedVisits = this.sortManager.sortVisits(filteredVisits);

        this.sortManager.updateSortUI();
        this.paginationManager.resetToFirstPage();
        this.uiManager.setSelectedVisitIds(this.historyManager.getSelectedVisits());
        this.uiManager.displayVisits(sortedVisits);
    }

    private handleVisitCheckboxChange(visitId: string, checked: boolean): void {
        this.historyManager.selectVisit(visitId, checked);
        const selectedVisits = this.historyManager.getSelectedVisits();
        this.uiManager.updateDeleteSelectedButton(selectedVisits.size);
        this.uiManager.setSelectedVisitIds(selectedVisits);
    }

    private handlePageNumberClick(page: number): void {
        const changed = this.paginationManager.goToPage(page);
        if (changed) {
            const filteredVisits = this.historyManager.getFilteredVisits();
            const sortedVisits = this.sortManager.sortVisits(filteredVisits);
            this.uiManager.setSelectedVisitIds(this.historyManager.getSelectedVisits());
            this.uiManager.displayVisits(sortedVisits);
        }
    }

    private getDateRange(days: number): { from: number; to: number } {
        const now = Date.now();
        const from = now - days * 24 * 60 * 60 * 1000;
        return { from, to: now };
    }
}

new OptionsManager();
