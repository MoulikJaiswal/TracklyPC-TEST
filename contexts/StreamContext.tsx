import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { StreamType, SyllabusData } from '../types';
import { GENERAL_DEFAULT_SYLLABUS, ALL_SYLLABUS, STREAM_SUBJECTS } from '../constants';
import { useAuth } from './AuthContext';

interface StreamContextType {
  stream: StreamType;
  setStream: (stream: StreamType) => void;
  isTransitioning: boolean;
  transitionStream: StreamType;
  customSyllabus: SyllabusData;
  setCustomSyllabus: React.Dispatch<React.SetStateAction<SyllabusData>>;
  currentSyllabus: SyllabusData;
  currentSubjects: string[];
  handleChangeStream: (newStream: StreamType) => void;
}

const StreamContext = createContext<StreamContextType | undefined>(undefined);

export const StreamProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [stream, setStream] = useLocalStorage<StreamType>('trackly_stream', 'General');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionStream, setTransitionStream] = useState<StreamType>(stream);
  const [customSyllabus, setCustomSyllabus] = useLocalStorage<SyllabusData>('trackly_custom_syllabus', GENERAL_DEFAULT_SYLLABUS);

  const currentSyllabus = useMemo(() => stream === 'General' ? customSyllabus : ALL_SYLLABUS[stream], [stream, customSyllabus]);
  const currentSubjects = useMemo(() => stream === 'General' ? Object.keys(customSyllabus) : STREAM_SUBJECTS[stream], [stream, customSyllabus]);
  
  const handleChangeStream = (newStream: StreamType) => {
    if (stream === newStream) return;
    setTransitionStream(newStream);
    setIsTransitioning(true);
    setTimeout(() => setStream(newStream), 400);
    setTimeout(() => setIsTransitioning(false), 1000);
  };

  // Sync syllabus with Firestore
  useEffect(() => {
    if (user) {
        const syncSyllabus = async () => {
            try {
                // On login, fetch remote syllabus first
                const snap = await getDoc(doc(db, 'users', user.uid, 'settings', 'general'));
                if (snap.exists() && snap.data().customSyllabus) {
                    setCustomSyllabus(snap.data().customSyllabus);
                } else {
                    // If no remote syllabus, push local one up
                    await setDoc(doc(db, 'users', user.uid, 'settings', 'general'), { customSyllabus }, { merge: true });
                }
            } catch (e) {
                console.error("Failed to sync syllabus on load", e);
            }
        };
        syncSyllabus();
    }
  }, [user]);

  useEffect(() => {
      if (user && stream === 'General') {
          const debounceSync = setTimeout(() => {
              setDoc(doc(db, 'users', user.uid, 'settings', 'general'), { customSyllabus }, { merge: true })
                .catch(e => console.error("Failed to sync syllabus", e));
          }, 2000);
          return () => clearTimeout(debounceSync);
      }
  }, [customSyllabus, user, stream]);

  const value = {
    stream, setStream,
    isTransitioning, transitionStream,
    customSyllabus, setCustomSyllabus,
    currentSyllabus, currentSubjects,
    handleChangeStream
  };

  return <StreamContext.Provider value={value}>{children}</StreamContext.Provider>;
};

export const useStream = () => {
  const context = useContext(StreamContext);
  if (context === undefined) throw new Error('useStream must be used within a StreamProvider');
  return context;
};
