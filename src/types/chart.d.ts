declare module 'chart.js' {
    export interface ChartConfiguration {
        type: ChartType;
        data: ChartData;
        options?: ChartOptions;
    }

    export interface ChartData {
        labels: string[];
        datasets: ChartDataset[];
    }

    export interface ChartDataset {
        label: string;
        data: number[];
        backgroundColor?: string | string[];
        borderColor?: string | string[];
        borderWidth?: number;
        fill?: boolean;
        yAxisID?: string;
        tension?: number;
        indexAxis?: string;
    }

    export interface ChartOptions {
        responsive?: boolean;
        maintainAspectRatio?: boolean;
        plugins?: {
            title?: {
                display?: boolean;
                text?: string;
                font?: {
                    size?: number;
                    weight?: string;
                };
            };
            legend?: {
                display?: boolean;
                position?: string;
            };
            tooltip?: {
                callbacks?: {
                    label?: (context: TooltipContext) => string | string[];
                };
            };
        };
        scales?: {
            x?: ScaleOptions;
            y?: ScaleOptions;
            r?: RadialScaleOptions;
        };
    }

    export interface ScaleOptions {
        display?: boolean;
        title?: {
            display?: boolean;
            text?: string;
        };
        beginAtZero?: boolean;
        ticks?: {
            stepSize?: number;
        };
    }

    export interface RadialScaleOptions {
        beginAtZero?: boolean;
        ticks?: {
            stepSize?: number;
        };
    }

    export interface TooltipContext {
        dataset: {
            label?: string;
        };
        parsed: {
            y?: number;
            r?: number;
        };
        dataIndex: number;
    }

    export class Chart {
        constructor(ctx: HTMLCanvasElement, config: ChartConfiguration);
        destroy(): void;
        static register(...args: unknown[]): void;
    }

    export const CategoryScale: unknown;
    export const LinearScale: unknown;
    export const PointElement: unknown;
    export const LineElement: unknown;
    export const BarElement: unknown;
    export const Title: unknown;
    export const Tooltip: unknown;
    export const Legend: unknown;
    export const Filler: unknown;
    export const RadialLinearScale: unknown;
    export const LineController: unknown;
    export const BarController: unknown;
    export const RadarController: unknown;

    export type ChartType = 'line' | 'bar' | 'radar' | 'pie' | 'doughnut';
}
