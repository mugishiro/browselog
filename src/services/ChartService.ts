import { VisitService } from './VisitService';
import { Visit, DomainStats } from '../types';

type Chart = any;
import {
    groupVisitsByDay,
    groupVisitsByDomain,
    groupVisitsByHour,
    createDailyLineChart,
    createDomainBarChart,
    createHourlyRadarChart,
    filterVisitsByDateRange,
} from '../utils/chartUtils';

interface ChartCreationResult {
    success: boolean;
    chart?: Chart;
    error?: string;
}

export class ChartService {
    private visitService: VisitService;
    private charts: Map<string, Chart> = new Map();

    constructor() {
        this.visitService = new VisitService();
    }

    private async createChart(
        chartId: string,
        canvasElement: HTMLCanvasElement,
        config: unknown,
        _description: string
    ): Promise<ChartCreationResult> {
        try {
            this.destroyChart(chartId);

            // Dynamically import Chart.js with only needed components
            const { Chart } = await import('chart.js/auto');
            const chart = new Chart(canvasElement, config as any);

            this.charts.set(chartId, chart);
            return { success: true, chart };
        } catch (error) {
            const errorMessage = (error as Error).message;
            return { success: false, error: errorMessage };
        }
    }

    private createDailyChartConfig(chartData: unknown): unknown {
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
                            label: (context: unknown) => {
                                const ctx = context as {
                                    dataset: { label?: string };
                                    parsed: { y?: number };
                                };
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

    async createDailyChart(
        canvasElement: HTMLCanvasElement,
        _days: number = 30,
        startDate?: string,
        endDate?: string,
        visits?: Visit[]
    ): Promise<Chart | null> {
        try {
            let filteredVisits: any[];
            if (visits) {
                filteredVisits = filterVisitsByDateRange(visits, startDate, endDate);
            } else {
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
                const result = await this.createChart(
                    'daily',
                    canvasElement,
                    config,
                    'daily chart (empty)'
                );
                return result.success ? result.chart || null : null;
            }

            const dailyStats = groupVisitsByDay(filteredVisits);
            const chartData = createDailyLineChart(dailyStats);

            const config = this.createDailyChartConfig(chartData);
            const result = await this.createChart('daily', canvasElement, config, 'daily chart');

            return result.success ? result.chart || null : null;
        } catch {
            return null;
        }
    }

    async createDomainChart(
        canvasElement: HTMLCanvasElement,
        topN: number = 10,
        startDate?: string,
        endDate?: string,
        visits?: Visit[]
    ): Promise<Chart | null> {
        try {
            let filteredVisits: any[];
            if (visits) {
                filteredVisits = filterVisitsByDateRange(visits, startDate, endDate);
            } else {
                const allVisits = await this.visitService.queryVisits();
                filteredVisits = filterVisitsByDateRange(allVisits, startDate, endDate);
            }

            const domainStats = groupVisitsByDomain(filteredVisits);
            const chartData = createDomainBarChart(domainStats, topN);

            const config = this.createDomainChartConfig(chartData, topN, domainStats);
            const result = await this.createChart('domain', canvasElement, config, 'domain chart');

            return result.success ? result.chart || null : null;
        } catch {
            return null;
        }
    }

    private createDomainChartConfig(
        chartData: unknown,
        topN: number,
        domainStats: DomainStats[]
    ): unknown {
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
                            label: (context: unknown) => {
                                const ctx = context as {
                                    parsed: { y?: number };
                                    dataIndex: number;
                                };
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

    async createHourlyChart(
        canvasElement: HTMLCanvasElement,
        startDate?: string,
        endDate?: string,
        visits?: Visit[]
    ): Promise<Chart | null> {
        try {
            let filteredVisits: any[];
            if (visits) {
                filteredVisits = filterVisitsByDateRange(visits, startDate, endDate);
            } else {
                const allVisits = await this.visitService.queryVisits();
                filteredVisits = filterVisitsByDateRange(allVisits, startDate, endDate);
            }

            const hourlyStats = groupVisitsByHour(filteredVisits);
            const chartData = createHourlyRadarChart(hourlyStats);

            const config = this.createHourlyChartConfig(chartData);
            const result = await this.createChart('hourly', canvasElement, config, 'hourly chart');

            return result.success ? result.chart || null : null;
        } catch {
            return null;
        }
    }

    private createHourlyChartConfig(chartData: unknown): unknown {
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
                            label: (context: unknown) => {
                                const ctx = context as {
                                    dataset: { label?: string };
                                    parsed: { r?: number };
                                };
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

    destroyChart(chartId: string): void {
        const existingChart = this.charts.get(chartId);
        if (existingChart) {
            existingChart.destroy();
            this.charts.delete(chartId);
        }
    }

    destroyAllCharts(): void {
        this.charts.forEach((chart, _chartId) => {
            chart.destroy();
        });
        this.charts.clear();
    }
}
