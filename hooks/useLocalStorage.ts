import { useState, useEffect, Dispatch, SetStateAction } from 'react';

// A utility hook for persisting React state to the browser's localStorage.
// It serializes the state to JSON and retrieves it on component mount.
// This ensures state is saved across browser sessions.

function safeJSONParse<T>(key: string, fallback: T): T {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.error(`Error parsing localStorage key "${key}":`, e);
        return fallback;
    }
}

export function useLocalStorage<T>(key: string, initialValue: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    return safeJSONParse(key, initialValue instanceof Function ? initialValue() : initialValue);
  });

  useEffect(() => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch(e) {
        console.error(`Error setting localStorage key "${key}":`, e);
    }
  }, [key, value]);

  return [value, setValue];
}
