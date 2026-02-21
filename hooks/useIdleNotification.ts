import { useEffect, useRef } from 'react';

// ─── Notification message pools ───────────────────────────────────────────────

const MESSAGES_AGGRESSIVE = [
    { title: "Bro. Books. Now.", body: "5 minutes over. Return to mission." },
    { title: "Discipline > mood.", body: "Open the chapter. Right now." },
    { title: "Future you is watching.", body: "Don't embarrass him." },
    { title: "Stop drifting.", body: "Start studying." },
    { title: "This is your reminder:", body: "Lock in." },
    { title: "No overthinking.", body: "Just start." },
];

const MESSAGES_CALM = [
    { title: "Gentle nudge 👋", body: "It's study time. Come back." },
    { title: "One page right now.", body: "Go." },
    { title: "Momentum matters.", body: "Resume where you left off." },
    { title: "Back to the grind.", body: "Slowly but surely." },
    { title: "Small steps win.", body: "Start now." },
];

const MESSAGES_JEE = [
    { title: "AIR doesn't come from scrolling.", body: "Get back to work." },
    { title: "Your competitors are studying.", body: "Every problem solved = rank up." },
    { title: "Boards won't wait.", body: "Neither should you." },
    { title: "This hour decides your percentile.", body: "Use it." },
];

const MESSAGES_MICRO = [
    { title: "Open the book.", body: "Just open it. That's all." },
    { title: "Solve ONE question.", body: "Only one. Go." },
    { title: "Timer: 25 minutes.", body: "Begin." },
    { title: "Pen in hand.", body: "Go." },
    { title: "Sit down. Start now.", body: "You've got this." },
];

const MESSAGES_INTENSE = [
    { title: "Kill the distraction.", body: "Revive the grind." },
    { title: "Comfort is the enemy.", body: "Study." },
    { title: "You didn't come this far to scroll.", body: "Focus mode. Activated." },
    { title: "Focus mode.", body: "Activated." },
];

const ALL_POOLS = [
    MESSAGES_AGGRESSIVE,
    MESSAGES_CALM,
    MESSAGES_JEE,
    MESSAGES_MICRO,
    MESSAGES_INTENSE,
];

export function getRandomMessage() {
    const pool = ALL_POOLS[Math.floor(Math.random() * ALL_POOLS.length)];
    return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Shared fire function (also used by banner for confirmation notification) ──

export function fireStudyNotification(msg?: { title: string; body: string }) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    const m = msg ?? getRandomMessage();
    try {
        const n = new Notification(m.title, {
            body: m.body,
            icon: '/android-chrome-512x512.png',
            badge: '/favicon-32x32.png',
            tag: 'trackly-idle',
            silent: false,
        } as NotificationOptions & { renotify?: boolean });
        setTimeout(() => n.close(), 8000);
        return true;
    } catch (e) {
        console.warn('Notification failed:', e);
        return false;
    }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

// We use an inline Web Worker because browsers aggressively throttle or freeze 
// setTimeout/setInterval in background tabs (often pausing them completely). 
// Web Workers run on a separate thread and are exempt from background timer throttling.
const workerScript = `
let timerId = null;
let intervalId = null;

self.onmessage = function(e) {
    if (e.data.command === 'start') {
        const delay = e.data.delay;
        timerId = setTimeout(() => {
            self.postMessage('fire');
            intervalId = setInterval(() => {
                self.postMessage('fire');
            }, delay);
        }, delay);
    } else if (e.data.command === 'stop') {
        clearTimeout(timerId);
        clearInterval(intervalId);
    }
};
`;

export function useIdleNotification(timerState: 'idle' | 'running' | 'paused', delayMs: number = 10 * 60 * 1000) {
    const workerRef = useRef<Worker | null>(null);

    // Initialize the Web Worker on mount
    useEffect(() => {
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);

        worker.onmessage = (e) => {
            if (e.data === 'fire') {
                fireStudyNotification();
            }
        };

        workerRef.current = worker;

        return () => {
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
        };
    }, []);

    // Manage the timer commands
    useEffect(() => {
        const worker = workerRef.current;
        if (!worker) return;

        worker.postMessage({ command: 'stop' });

        if (timerState === 'idle') {
            worker.postMessage({ command: 'start', delay: delayMs });
        }

        return () => {
            worker.postMessage({ command: 'stop' });
        };
    }, [timerState, delayMs]);
}
