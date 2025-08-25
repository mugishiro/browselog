import { Visit, DailyStats, DomainStats, HourlyStats, ChartData } from '../types';

export function groupVisitsByDay(visits: Visit[]): DailyStats[] {
    const dailyMap = new Map<string, DailyStats>();

    visits.forEach(visit => {
        const date = new Date(visit.startedAt).toISOString().split('T')[0];
        const dwellTime = visit.totalDwellTime || 0;

        if (!dailyMap.has(date)) {
            dailyMap.set(date, {
                date,
                visits: 0,
                totalTime: 0,
                avgTime: 0,
            });
        }

        const dayStats = dailyMap.get(date);
        if (dayStats) {
            dayStats.visits += 1;
            dayStats.totalTime += dwellTime;
            dayStats.avgTime = dayStats.totalTime / dayStats.visits;
        }
    });

    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function groupVisitsByDomain(visits: Visit[]): DomainStats[] {
    const domainMap = new Map<string, DomainStats>();

    visits.forEach(visit => {
        const domain = visit.domain;
        const dwellTime = visit.totalDwellTime || 0;

        if (!domainMap.has(domain)) {
            domainMap.set(domain, {
                domain,
                visits: 0,
                totalTime: 0,
                avgTime: 0,
            });
        }

        const domainStats = domainMap.get(domain);
        if (domainStats) {
            domainStats.visits += 1;
            domainStats.totalTime += dwellTime;
            domainStats.avgTime = domainStats.totalTime / domainStats.visits;
        }
    });

    return Array.from(domainMap.values()).sort((a, b) => b.totalTime - a.totalTime);
}

export function groupVisitsByHour(visits: Visit[]): HourlyStats[] {
    const hourlyMap = new Map<number, HourlyStats>();

    for (let hour = 0; hour < 24; hour++) {
        hourlyMap.set(hour, {
            hour,
            visits: 0,
            totalTime: 0,
        });
    }

    visits.forEach(visit => {
        const hour = new Date(visit.startedAt).getHours();
        const dwellTime = visit.totalDwellTime || 0;

        const hourStats = hourlyMap.get(hour);
        if (hourStats) {
            hourStats.visits += 1;
            hourStats.totalTime += dwellTime;
        }
    });

    return Array.from(hourlyMap.values());
}

export function createDailyLineChart(dailyStats: DailyStats[]): ChartData {
    const labels = dailyStats.map(stat => {
        const date = new Date(stat.date + 'T00:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    return {
        labels,
        datasets: [
            {
                label: 'Dwell Time (min)',
                data: dailyStats.map(stat => Math.round(stat.totalTime / 60)),
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true,
            },
            {
                label: 'Visit Count',
                data: dailyStats.map(stat => stat.visits),
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                borderWidth: 2,
                fill: false,
            },
        ],
    };
}

export function createDomainBarChart(domainStats: DomainStats[], topN: number = 10): ChartData {
    const topDomains = domainStats.slice(0, topN);
    const labels = topDomains.map(stat => {
        const domain = stat.domain;
        return domain.length > 20 ? domain.substring(0, 17) + '...' : domain;
    });

    const colors = [
        '#3498db',
        '#e74c3c',
        '#2ecc71',
        '#f39c12',
        '#9b59b6',
        '#1abc9c',
        '#34495e',
        '#e67e22',
        '#95a5a6',
        '#16a085',
    ];

    return {
        labels,
        datasets: [
            {
                label: 'Dwell Time (min)',
                data: topDomains.map(stat => Math.round(stat.totalTime / 60)),
                backgroundColor: colors.slice(0, topDomains.length),
                borderWidth: 1,
            },
        ],
    };
}

export function createHourlyRadarChart(hourlyStats: HourlyStats[]): ChartData {
    const labels = hourlyStats.map(stat => `${stat.hour}:00`);

    return {
        labels,
        datasets: [
            {
                label: 'Dwell Time (min)',
                data: hourlyStats.map(stat => Math.round(stat.totalTime / 60)),
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: '#3498db',
                borderWidth: 2,
            },
            {
                label: 'Visit Count',
                data: hourlyStats.map(stat => stat.visits),
                backgroundColor: 'rgba(231, 76, 60, 0.2)',
                borderColor: '#e74c3c',
                borderWidth: 2,
            },
        ],
    };
}

export function filterVisitsByDateRange(
    visits: Visit[],
    startDate?: string | number,
    endDate?: string | number
): Visit[] {
    return visits.filter(visit => {
        const visitDate = new Date(visit.startedAt).toISOString().split('T')[0];

        if (startDate) {
            const startDateStr =
                typeof startDate === 'number'
                    ? new Date(startDate).toISOString().split('T')[0]
                    : startDate;
            if (visitDate < startDateStr) {
                return false;
            }
        }

        if (endDate) {
            const endDateStr =
                typeof endDate === 'number'
                    ? new Date(endDate).toISOString().split('T')[0]
                    : endDate;
            if (visitDate > endDateStr) {
                return false;
            }
        }

        return true;
    });
}

export function getColorPalette(count: number): string[] {
    const baseColors = [
        '#3498db',
        '#e74c3c',
        '#2ecc71',
        '#f39c12',
        '#9b59b6',
        '#1abc9c',
        '#34495e',
        '#e67e22',
        '#95a5a6',
        '#16a085',
        '#27ae60',
        '#8e44ad',
        '#2980b9',
        '#d35400',
        '#c0392b',
    ];

    if (count <= baseColors.length) {
        return baseColors.slice(0, count);
    }

    const colors = [...baseColors];
    for (let i = baseColors.length; i < count; i++) {
        const hue = (i * 137.5) % 360;
        colors.push(`hsl(${hue}, 70%, 50%)`);
    }

    return colors;
}
