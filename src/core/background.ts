import { Message } from '../types';
import { MessageHandler } from './messageHandler';

const messageHandler = new MessageHandler();

chrome.runtime.onMessage.addListener(
    (
        msg: Message,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: unknown) => void
    ) => {
        if (!msg || !sender?.tab) {
            console.warn('Background: Invalid message or sender', { msg, sender });
            sendResponse({ success: false, error: 'Invalid message or sender' });
            return;
        }

        messageHandler.routeMessage(msg).catch(error => {
            console.error('Background: Error handling message', { error });
        });

        sendResponse({ success: true });
    }
);
