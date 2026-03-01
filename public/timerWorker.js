/**
 * timerWorker.js
 * A Web Worker that schedules a one-shot alarm timer.
 * Web Workers are throttled less aggressively than main-thread timers
 * when the browser tab is in the background or sleeping.
 *
 * Messages accepted:
 *   { type: 'START', delayMs: number }  — schedule alarm delayMs from now
 *   { type: 'CANCEL' }                   — cancel any pending alarm
 *
 * Messages posted back:
 *   { type: 'DONE' }  — alarm fired
 */

let timerId = null;

self.onmessage = function (e) {
    if (e.data.type === 'START') {
        // Clear any existing alarm first
        if (timerId !== null) {
            clearTimeout(timerId);
            timerId = null;
        }
        const delayMs = Math.max(0, e.data.delayMs);
        timerId = setTimeout(function () {
            timerId = null;
            self.postMessage({ type: 'DONE' });
        }, delayMs);
    } else if (e.data.type === 'CANCEL') {
        if (timerId !== null) {
            clearTimeout(timerId);
            timerId = null;
        }
    }
};
