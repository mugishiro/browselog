import { VisitService } from '../services/VisitService';
import { DatabaseManager } from '../core/database';
import { formatDuration } from '../utils/timeUtils';
import { Visit } from '../types';

class PopupManager {
    private visitService: VisitService;
    private db: DatabaseManager;
    private currentVisit: Visit | null = null;
    private updateInterval: number | null = null;

    constructor() {
        this.visitService = new VisitService();
        this.db = DatabaseManager.getInstance();
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            await this.loadCurrentPageInfo();
            await this.loadStats();
            this.setupEventListeners();
            this.startRealTimeUpdates();
            this.showContent();
        } catch {
            this.showError();
        }
    }

    private async loadCurrentPageInfo(): Promise<void> {
        // Get current active tab information
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];

        if (currentTab) {
            this.updatePageInfo(
                currentTab.title || '',
                currentTab.url || '',
                currentTab.favIconUrl
            );

            // Get current page visit data
            if (currentTab.url) {
                this.currentVisit = await this.db.findVisitByUrl(currentTab.url);
            }
        }
    }

    private updatePageInfo(title: string, url: string, favIconUrl?: string): void {
        const titleElement = document.getElementById('pageTitle');
        const urlElement = document.getElementById('pageUrl');
        const faviconElement = document.getElementById('favicon') as HTMLImageElement;

        if (titleElement) {
            titleElement.textContent = title || 'No Title';
        }

        if (urlElement) {
            try {
                const urlObj = new URL(url);
                urlElement.textContent = urlObj.hostname + urlObj.pathname;
            } catch {
                urlElement.textContent = url;
            }
        }

        if (faviconElement && favIconUrl) {
            faviconElement.src = favIconUrl;
            faviconElement.style.display = 'block';
        }
    }

    private async loadStats(): Promise<void> {
        try {
            // Today's statistics
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStart = today.getTime();
            const todayEnd = todayStart + 86400000; // 24 hours later

            const todayVisits = await this.visitService.queryVisits(todayStart, todayEnd);
            const allVisits = await this.visitService.queryVisits();

            // Statistics calculation
            const todayVisitCount = todayVisits.length;
            const todayTotalTime = todayVisits.reduce(
                (sum, visit) => sum + (visit.totalDwellTime || 0),
                0
            );
            const totalVisitCount = allVisits.length;
            const totalTime = allVisits.reduce(
                (sum, visit) => sum + (visit.totalDwellTime || 0),
                0
            );

            // UI update
            this.updateStatsDisplay({
                todayVisits: todayVisitCount,
                todayTime: Math.round(todayTotalTime / 60),
                totalVisits: totalVisitCount,
                totalTime: Math.round(totalTime / 60),
            });
        } catch {
            // Error handling
        }
    }

    private updateStatsDisplay(stats: {
        todayVisits: number;
        todayTime: number;
        totalVisits: number;
        totalTime: number;
    }): void {
        const elements = {
            todayVisits: document.getElementById('todayVisits'),
            todayTime: document.getElementById('todayTime'),
            totalVisits: document.getElementById('totalVisits'),
            totalTime: document.getElementById('totalTime'),
        };

        if (elements.todayVisits) elements.todayVisits.textContent = stats.todayVisits.toString();
        if (elements.todayTime) elements.todayTime.textContent = `${stats.todayTime} min`;
        if (elements.totalVisits) elements.totalVisits.textContent = stats.totalVisits.toString();
        if (elements.totalTime) elements.totalTime.textContent = `${stats.totalTime} min`;
    }

    private startRealTimeUpdates(): void {
        this.updateCurrentTime();
        this.updateInterval = window.setInterval(() => {
            this.updateCurrentTime();
        }, 1000);
    }

    private updateCurrentTime(): void {
        const currentTimeElement = document.getElementById('currentTime');
        const statusIndicator = document.getElementById('statusIndicator');

        if (!currentTimeElement || !statusIndicator) return;

        if (this.currentVisit && this.currentVisit.startedAt) {
            const currentTime = Date.now();
            const elapsedMs = currentTime - this.currentVisit.startedAt;
            const elapsedSeconds = Math.floor(elapsedMs / 1000);
            const totalSeconds = (this.currentVisit.totalDwellTime || 0) + elapsedSeconds;

            currentTimeElement.textContent = formatDuration(totalSeconds);
            statusIndicator.className = 'status-indicator status-active';
        } else {
            currentTimeElement.textContent = '00:00';
            statusIndicator.className = 'status-indicator status-paused';
        }
    }

    private setupEventListeners(): void {
        const openOptionsButton = document.getElementById('openOptions');
        const refreshDataButton = document.getElementById('refreshData');

        if (openOptionsButton) {
            openOptionsButton.addEventListener('click', () => {
                chrome.runtime.openOptionsPage();
                window.close();
            });
        }

        if (refreshDataButton) {
            refreshDataButton.addEventListener('click', async () => {
                await this.loadCurrentPageInfo();
                await this.loadStats();
            });
        }
    }

    private showContent(): void {
        const loadingElement = document.getElementById('loading');
        const contentElement = document.getElementById('content');

        if (loadingElement) loadingElement.style.display = 'none';
        if (contentElement) contentElement.style.display = 'block';
    }

    private showError(): void {
        const loadingElement = document.getElementById('loading');
        const errorElement = document.getElementById('error');

        if (loadingElement) loadingElement.style.display = 'none';
        if (errorElement) errorElement.style.display = 'block';
    }

    destroy(): void {
        if (this.updateInterval) {
            window.clearInterval(this.updateInterval);
        }
    }
}

// Initialize popup
new PopupManager();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Add cleanup logic if needed
});
