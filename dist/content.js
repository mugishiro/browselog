/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
class ContentScript {
    constructor() {
        this.setupEventListeners();
    }
    setupEventListeners() {
        window.addEventListener('pageshow', event => {
            if (event.persisted || document.readyState === 'complete') {
                this.sendMessage('nav:start');
            }
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.sendMessage('nav:pause');
            }
            else {
                this.sendMessage('nav:resume');
            }
        });
        window.addEventListener('beforeunload', () => {
            this.sendMessage('nav:end');
        });
    }
    sendMessage(phase) {
        const message = {
            kind: 'nav',
            phase: phase,
            ts: Date.now(),
            url: window.location.href,
            domain: window.location.hostname,
            title: document.title,
        };
        chrome.runtime
            .sendMessage(message)
            .then(() => { })
            .catch(error => {
            console.error('Content: Failed to send message', { phase, error });
        });
    }
}
new ContentScript();


/******/ })()
;