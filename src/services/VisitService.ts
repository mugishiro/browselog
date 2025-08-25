import { DatabaseManager } from '../core/database';
import { Visit, NavMessage } from '../types';
import { calculateSecondsBetween } from '../utils/timeUtils';

export class VisitService {
    private db: DatabaseManager;

    constructor() {
        this.db = DatabaseManager.getInstance();
    }

    async startVisit(msg: NavMessage): Promise<void> {
        try {
            const existingVisit = await this.db.findVisitByUrl(msg.url);

            if (existingVisit && existingVisit.id) {
                await this.db.updateVisit(existingVisit.id, {
                    lastVisitedAt: msg.ts,
                    totalVisits: existingVisit.totalVisits + 1,
                });
            } else {
                await this.db.addVisit({
                    url: msg.url,
                    domain: msg.domain,
                    title: msg.title || '',
                    startedAt: msg.ts,
                    lastVisitedAt: msg.ts,
                    totalVisits: 1,
                    totalDwellTime: 0,
                });
            }
        } catch (error) {
            console.error('VisitService: Error in startVisit', error);
        }
    }

    async endVisit(msg: NavMessage): Promise<void> {
        try {
            const existingVisit = await this.db.findVisitByUrl(msg.url);
            if (!existingVisit || !existingVisit.id) {
                return;
            }

            const sessionTime = calculateSecondsBetween(existingVisit.lastVisitedAt, msg.ts);
            const totalDwellTime = (existingVisit.totalDwellTime || 0) + sessionTime;

            await this.db.updateVisit(existingVisit.id, {
                lastVisitedAt: msg.ts,
                totalDwellTime: totalDwellTime,
            });
        } catch (error) {
            console.error('VisitService: Error in endVisit', error);
        }
    }

    async updateVisit(msg: NavMessage): Promise<void> {
        try {
            const existingVisit = await this.db.findVisitByUrl(msg.url);

            if (!existingVisit || !existingVisit.id) {
                return;
            }

            const totalDwellTime = (existingVisit.totalDwellTime || 0) + 30;

            await this.db.updateVisit(existingVisit.id, {
                totalDwellTime: totalDwellTime,
            });
        } catch (error) {
            console.error('VisitService: Error in updateVisit', error);
        }
    }

    async pauseVisit(msg: NavMessage): Promise<void> {
        try {
            const existingVisit = await this.db.findVisitByUrl(msg.url);
            if (!existingVisit || !existingVisit.id) {
                return;
            }

            const sessionTime = calculateSecondsBetween(existingVisit.lastVisitedAt, msg.ts);
            const totalDwellTime = (existingVisit.totalDwellTime || 0) + sessionTime;

            await this.db.updateVisit(existingVisit.id, {
                totalDwellTime: totalDwellTime,
            });
        } catch (error) {
            console.error('VisitService: Error in pauseVisit', error);
        }
    }

    async resumeVisit(msg: NavMessage): Promise<void> {
        try {
            const existingVisit = await this.db.findVisitByUrl(msg.url);
            if (!existingVisit || !existingVisit.id) {
                return;
            }

            await this.db.updateVisit(existingVisit.id, {
                lastVisitedAt: msg.ts,
                totalVisits: existingVisit.totalVisits + 1,
            });
        } catch (error) {
            console.error('VisitService: Error in resumeVisit', error);
        }
    }

    async queryVisits(from?: number, to?: number, keyword?: string): Promise<Visit[]> {
        try {
            const visits = await this.db.queryVisits(from, to, keyword);
            return visits;
        } catch {
            return [];
        }
    }
}
