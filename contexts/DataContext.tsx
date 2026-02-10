import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, writeBatch, getDoc, runTransaction } from 'firebase/firestore';
import { db, dbReadyPromise } from '../firebase';
import { Session, Target, TestResult, Note, Folder, SyllabusData } from '../types';
import { useAuth } from './AuthContext';
import { useStream } from './StreamContext';

const sanitizeForFirestore = (data: any): any => {
  if (Array.isArray(data)) return data.map(item => sanitizeForFirestore(item));
  if (data !== null && typeof data === 'object' && data.constructor === Object) {
    const sanitized: { [key: string]: any } = {};
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== undefined) sanitized[key] = sanitizeForFirestore(value);
    });
    return sanitized;
  }
  return data;
};
const generateUUID = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
const safeJSONParse = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
};

interface DataContextType {
  sessions: Session[];
  targets: Target[];
  tests: TestResult[];
  notes: Note[];
  folders: Folder[];
  goals: Record<string, number>;
  setGoals: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  sessionsForStream: Session[];
  testsForStream: TestResult[];
  handleSaveSession: (newSession: Omit<Session, 'id' | 'timestamp' | 'stream'>) => Promise<void>;
  handleDeleteSession: (id: string) => Promise<void>;
  handleSaveTarget: (target: Target) => Promise<void>;
  handleUpdateTarget: (id: string, completed: boolean) => Promise<void>;
  handleDeleteTarget: (id: string) => Promise<void>;
  handleSaveTest: (newTest: Omit<TestResult, 'id' | 'timestamp' | 'stream'>) => Promise<void>;
  handleDeleteTest: (id: string) => Promise<void>;
  handleSaveNote: (note: Note) => Promise<void>;
  handleDeleteNote: (id: string) => Promise<void>;
  handleSaveFolder: (folder: Folder) => Promise<void>;
  handleDeleteFolder: (id: string) => Promise<void>;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncError: string | null;
  handleForceSync: () => Promise<void>;
  migrateGuestDataToFirebase: (uid: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user, isGuest } = useAuth();
  const { stream, currentSubjects, customSyllabus } = useStream();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  
  const [goals, setGoals] = useState<Record<string, number>>(() => safeJSONParse('trackly_goals', {}));
  useEffect(() => { localStorage.setItem('trackly_goals', JSON.stringify(goals)); }, [goals]);
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  useEffect(() => { dbReadyPromise.then(() => setIsFirebaseReady(true)); }, []);

  useEffect(() => {
    if (!isFirebaseReady) return;
    if (user) {
      const unsubSessions = onSnapshot(query(collection(db, 'users', user.uid, 'sessions'), orderBy('timestamp', 'desc')), (snapshot) => setSessions(snapshot.docs.map(d => d.data() as Session)));
      const unsubTargets = onSnapshot(query(collection(db, 'users', user.uid, 'targets'), orderBy('timestamp', 'desc')), (snapshot) => setTargets(snapshot.docs.map(d => d.data() as Target)));
      const unsubTests = onSnapshot(query(collection(db, 'users', user.uid, 'tests'), orderBy('timestamp', 'desc')), (snapshot) => setTests(snapshot.docs.map(d => d.data() as TestResult)));
      const unsubFolders = onSnapshot(query(collection(db, 'users', user.uid, 'folders'), orderBy('timestamp', 'desc')), (snapshot) => setFolders(snapshot.docs.map(d => d.data() as Folder)));
      const unsubNotes = onSnapshot(query(collection(db, 'users', user.uid, 'notes'), orderBy('timestamp', 'desc')), (snapshot) => setNotes(snapshot.docs.map(d => d.data() as Note)));
      return () => { unsubSessions(); unsubTargets(); unsubTests(); unsubFolders(); unsubNotes(); };
    } else if (isGuest) {
      setSessions(safeJSONParse('trackly_guest_sessions', []));
      setTargets(safeJSONParse('trackly_guest_targets', []));
      setTests(safeJSONParse('trackly_guest_tests', []));
      setNotes(safeJSONParse('trackly_guest_notes', []));
      setFolders(safeJSONParse('trackly_guest_folders', []));
    } else {
      setSessions([]); setTargets([]); setTests([]); setNotes([]); setFolders([]);
    }
  }, [user, isGuest, isFirebaseReady]);

  useEffect(() => {
    setGoals(prevGoals => {
        const defaultGoals = currentSubjects.reduce((acc, sub) => ({ ...acc, [sub]: 30 }), {});
        const newGoals = { ...defaultGoals };
        for (const subject of currentSubjects) {
            if (prevGoals[subject]) newGoals[subject] = prevGoals[subject];
        }
        return newGoals;
    });
  }, [stream, currentSubjects]);

  const sessionsForStream = useMemo(() => sessions.filter(s => s.stream ? s.stream === stream : stream === 'General'), [sessions, stream]);
  const testsForStream = useMemo(() => tests.filter(t => t.stream ? t.stream === stream : stream === 'General'), [tests, stream]);

  // --- CRUD Handlers ---
  const handleSaveSession = useCallback(async (newSession: Omit<Session, 'id' | 'timestamp' | 'stream'>) => {
    const session: Session = { ...newSession, id: generateUUID(), timestamp: Date.now(), stream };
    const newSessions = [session, ...sessions];
    setSessions(newSessions);
    if (user) await setDoc(doc(db, 'users', user.uid, 'sessions', session.id), sanitizeForFirestore(session));
    else if (isGuest) localStorage.setItem('trackly_guest_sessions', JSON.stringify(newSessions));
  }, [user, isGuest, sessions, stream]);

  const handleDeleteSession = useCallback(async (id: string) => {
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'sessions', id));
    else if (isGuest) localStorage.setItem('trackly_guest_sessions', JSON.stringify(newSessions));
  }, [user, isGuest, sessions]);
  
  const handleSaveTarget = useCallback(async (target: Target) => {
    const newTargets = [target, ...targets.filter(t => t.id !== target.id)];
    setTargets(newTargets);
    if (user) await setDoc(doc(db, 'users', user.uid, 'targets', target.id), sanitizeForFirestore(target));
    else if (isGuest) localStorage.setItem('trackly_guest_targets', JSON.stringify(newTargets));
  }, [user, isGuest, targets]);

  const handleUpdateTarget = useCallback(async (id: string, completed: boolean) => {
    const newTargets = targets.map(t => (t.id === id ? { ...t, completed } : t));
    setTargets(newTargets);
    if (user) await setDoc(doc(db, 'users', user.uid, 'targets', id), { completed }, { merge: true });
    else if (isGuest) localStorage.setItem('trackly_guest_targets', JSON.stringify(newTargets));
  }, [user, isGuest, targets]);
  
  const handleDeleteTarget = useCallback(async (id: string) => {
    const newTargets = targets.filter(t => t.id !== id);
    setTargets(newTargets);
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'targets', id));
    else if (isGuest) localStorage.setItem('trackly_guest_targets', JSON.stringify(newTargets));
  }, [user, isGuest, targets]);

  const handleSaveTest = useCallback(async (newTest: Omit<TestResult, 'id' | 'timestamp' | 'stream'>) => {
    const test: TestResult = { ...newTest, id: generateUUID(), timestamp: Date.now(), stream };
    const newTests = [test, ...tests];
    setTests(newTests);
    if (user) await setDoc(doc(db, 'users', user.uid, 'tests', test.id), sanitizeForFirestore(test));
    else if (isGuest) localStorage.setItem('trackly_guest_tests', JSON.stringify(newTests));
  }, [user, isGuest, tests, stream]);

  const handleDeleteTest = useCallback(async (id: string) => {
    const newTests = tests.filter(t => t.id !== id);
    setTests(newTests);
    if (user) await deleteDoc(doc(db, 'users', user.uid, 'tests', id));
    else if (isGuest) localStorage.setItem('trackly_guest_tests', JSON.stringify(newTests));
  }, [user, isGuest, tests]);

  const handleSaveNote = useCallback(async (note: Note) => { /* Placeholder */ }, [user, isGuest, notes]);
  const handleDeleteNote = useCallback(async (id: string) => { /* Placeholder */ }, [user, isGuest, notes]);
  const handleSaveFolder = useCallback(async (folder: Folder) => { /* Placeholder */ }, [user, isGuest, folders]);
  const handleDeleteFolder = useCallback(async (id: string) => { /* Placeholder */ }, [user, isGuest, folders]);

  const migrateGuestDataToFirebase = useCallback(async (uid: string) => { /* Placeholder */ }, [customSyllabus]);
  
  const handleForceSync = useCallback(async () => {
    if (!user) return;
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', user.uid, 'settings', 'general'), { customSyllabus });
      sessions.forEach(item => batch.set(doc(db, 'users', user.uid, 'sessions', item.id), sanitizeForFirestore(item)));
      targets.forEach(item => batch.set(doc(db, 'users', user.uid, 'targets', item.id), sanitizeForFirestore(item)));
      tests.forEach(item => batch.set(doc(db, 'users', user.uid, 'tests', item.id), sanitizeForFirestore(item)));
      notes.forEach(item => batch.set(doc(db, 'users', user.uid, 'notes', item.id), sanitizeForFirestore(item)));
      folders.forEach(item => batch.set(doc(db, 'users', user.uid, 'folders', item.id), sanitizeForFirestore(item)));
      await batch.commit();
      setSyncStatus('success');
    } catch (e: any) {
      setSyncStatus('error');
      setSyncError(e.message);
    } finally {
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  }, [user, sessions, targets, tests, notes, folders, customSyllabus]);


  const value = {
    sessions, targets, tests, notes, folders, goals, setGoals,
    sessionsForStream, testsForStream,
    handleSaveSession, handleDeleteSession,
    handleSaveTarget, handleUpdateTarget, handleDeleteTarget,
    handleSaveTest, handleDeleteTest,
    handleSaveNote, handleDeleteNote, handleSaveFolder, handleDeleteFolder,
    syncStatus, syncError, handleForceSync,
    migrateGuestDataToFirebase,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
};
