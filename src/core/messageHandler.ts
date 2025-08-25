import { Message, NavMessage, isNavMessage } from '../types';
import { VisitService } from '../services/VisitService';

const NAV_PHASES = {
    START: 'start',
    END: 'end',
    UPDATE: 'update',
    PAUSE: 'pause',
    RESUME: 'resume',
} as const;

export class MessageHandler {
    private visitService: VisitService;

    constructor() {
        this.visitService = new VisitService();
    }

    async routeMessage(msg: Message): Promise<void> {
        if (isNavMessage(msg)) {
            await this.handleNavMessage(msg);
        } else {
            console.warn('MessageHandler: Unhandled message type', { kind: (msg as Message).kind });
        }
    }

    private async handleNavMessage(msg: NavMessage): Promise<void> {
        try {
            const phase = msg.phase.replace('nav:', '');

            switch (phase) {
                case NAV_PHASES.START:
                    await this.visitService.startVisit(msg);
                    break;
                case NAV_PHASES.END:
                    await this.visitService.endVisit(msg);
                    break;
                case NAV_PHASES.UPDATE:
                    await this.visitService.updateVisit(msg);
                    break;
                case NAV_PHASES.PAUSE:
                    await this.visitService.pauseVisit(msg);
                    break;
                case NAV_PHASES.RESUME:
                    await this.visitService.resumeVisit(msg);
                    break;
                default:
                    console.warn('MessageHandler: Unknown nav phase', {
                        phase: msg.phase,
                        extractedPhase: phase,
                    });
            }
        } catch (error) {
            console.error('MessageHandler: Error handling nav message', { error });
        }
    }
}
