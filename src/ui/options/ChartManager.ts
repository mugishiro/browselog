import { ChartService } from '../../services/ChartService';
import { Chart } from 'chart.js/auto';
import { Visit } from '../../types';

export class ChartManager {
    private chartService: ChartService;
    private currentChartType: 'history' | 'daily' | 'domain' | 'hourly' = 'history';

    constructor() {
        this.chartService = new ChartService();
    }

    getCurrentChartType(): 'history' | 'daily' | 'domain' | 'hourly' {
        return this.currentChartType;
    }

    setCurrentChartType(type: 'history' | 'daily' | 'domain' | 'hourly'): void {
        this.currentChartType = type;
    }

    async createDailyChart(
        canvasElement: HTMLCanvasElement,
        days: number = 30,
        startDate?: string,
        endDate?: string,
        visits?: Visit[]
    ): Promise<Chart | null> {
        return await this.chartService.createDailyChart(
            canvasElement,
            days,
            startDate,
            endDate,
            visits
        );
    }

    async createDomainChart(
        canvasElement: HTMLCanvasElement,
        topN: number = 10,
        startDate?: string,
        endDate?: string,
        visits?: Visit[]
    ): Promise<Chart | null> {
        return await this.chartService.createDomainChart(
            canvasElement,
            topN,
            startDate,
            endDate,
            visits
        );
    }

    async createHourlyChart(
        canvasElement: HTMLCanvasElement,
        startDate?: string,
        endDate?: string,
        visits?: Visit[]
    ): Promise<Chart | null> {
        return await this.chartService.createHourlyChart(canvasElement, startDate, endDate, visits);
    }

    destroyChart(chartId: string): void {
        this.chartService.destroyChart(chartId);
    }

    destroyAllCharts(): void {
        this.chartService.destroyAllCharts();
    }
}
