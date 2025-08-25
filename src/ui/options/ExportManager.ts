import { Visit } from '../../types';

export class ExportManager {
    async exportData(visits: Visit[], from: number, to: number): Promise<void> {
        const filteredVisits = visits.filter(visit => {
            const visitTime = visit.startedAt;
            return visitTime >= from && visitTime < to;
        });

        const csvData = this.convertToCSV(filteredVisits);
        const filename = `browselog_${new Date(from).toISOString().split('T')[0]}_${new Date(to).toISOString().split('T')[0]}.csv`;

        this.downloadFile(csvData, filename, 'text/csv');
    }

    private convertToCSV(visits: Visit[]): string {
        const headers = [
            'URL',
            'Title',
            'Domain',
            'Start Time',
            'Last Visited Time',
            'Dwell Time (seconds)',
            'Visit Count',
        ];
        const rows = visits.map(visit => [
            visit.url,
            visit.title || '',
            visit.domain,
            new Date(visit.startedAt).toLocaleString('en-US'),
            new Date(visit.lastVisitedAt || visit.startedAt).toLocaleString('en-US'),
            visit.totalDwellTime || 0,
            visit.totalVisits || 0,
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return '\ufeff' + csvContent; // BOM for Excel
    }

    private downloadFile(content: string, filename: string, mimeType: string): void {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
