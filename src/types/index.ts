export interface BaseMessage {
    kind: string;
    ts: number;
}

export type NavPhase = 'start' | 'end' | 'update' | 'pause' | 'resume';

export interface NavMessage extends BaseMessage {
    kind: 'nav';
    phase: NavPhase;
    url: string;
    domain: string;
    title?: string;
}

export function isNavMessage(msg: BaseMessage): msg is NavMessage {
    return msg.kind === 'nav';
}

export interface Visit {
    id?: number;
    url: string;
    domain: string;
    title: string;
    startedAt: number;
    lastVisitedAt: number;
    totalVisits: number;
    totalDwellTime: number;
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
    yAxisID?: string;
    tension?: number;
    indexAxis?: string;
    fill?: boolean;
}

export interface ChartOptions {
    days?: number;
    topN?: number;
    startDate?: string;
    endDate?: string;
}

export interface DailyStats {
    date: string;
    visits: number;
    totalTime: number;
    avgTime: number;
}

export interface DomainStats {
    domain: string;
    visits: number;
    totalTime: number;
    avgTime: number;
}

export interface HourlyStats {
    hour: number;
    visits: number;
    totalTime: number;
}

export type ExportFormat = 'json' | 'csv' | 'excel';

export type TabType = 'history' | 'daily' | 'domain' | 'hourly';

export type ChartType = 'daily' | 'domain' | 'hourly';

export type Message = NavMessage;
