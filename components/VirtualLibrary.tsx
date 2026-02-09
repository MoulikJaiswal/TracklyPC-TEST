
import React, { useState, useEffect, useMemo } from 'react';
import { Users, Wifi, LogIn, User as UserIcon, Atom, Dna, GraduationCap, ArrowLeft } from 'lucide-react';
import { User } from 'firebase/auth';
import { rtdb } from '../firebase';
import { ref, onValue, onDisconnect, remove, set, serverTimestamp, update } from 'firebase/database';
import { StudyParticipant, StreamType } from '../types';
import { Card } from './Card';
import { GoogleIcon } from './GoogleIcon';

interface VirtualLibraryProps {
  user: User | null;
  userName: string | null;
  onLogin: () => void;
  isPro: boolean;
  timerState: 'idle' | 'running' | 'paused';
  timeLeft: number;
  timerMode: 'focus' | 'short' | 'long';
  durations: { focus: number; short: number; long: number };
  selectedSubject: string;
  stream: StreamType;
}

// A simple hook to manage countdown logic for timers
const useCountdown = (endTime?: number) => {
    const [remaining, setRemaining] = useState('');

    useEffect(() => {
        if (!endTime) {
            setRemaining('');
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = Math.max(0, endTime - now);
            const minutes = Math.floor(diff / 1000 / 60);
            const seconds = Math.floor((diff / 1000) % 60);
            
            if (diff === 0) {
                setRemaining('00:00');
                clearInterval(interval);
            } else {
                setRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [endTime]);

    return remaining;
};

const ParticipantCard = React.memo(({ participant, isCurrentUser }: { participant: StudyParticipant, isCurrentUser: boolean }) => {
    const photoURL = participant.photoURL;
    const displayName = participant.displayName || 'Anonymous';
    const countdown = useCountdown(participant.focusEndTime);

    const getStatusInfo = () => {
        switch (participant.status) {
            case 'focus':
                return {
                    text: `Focusing: ${participant.subject || '...'}`,
                    dotColor: 'bg-indigo-500',
                };
            case 'break':
                return {
                    text: 'On a Break',
                    dotColor: 'bg-amber-500',
                };
            default:
                return {
                    text: 'In the Lounge',
                    dotColor: 'bg-emerald-500',
                };
        }
    };
    const statusInfo = getStatusInfo();
    
    return (
        <div 
            className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 transform-gpu ${isCurrentUser ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20' : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/5'}`}
        >
            <div className="relative flex-shrink-0">
                {photoURL ? (
                    <img src={photoURL} alt={displayName} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <UserIcon size={24} className="text-slate-400" />
                    </div>
                )}
                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${statusInfo.dotColor} rounded-full border-2 border-white dark:border-slate-800`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 dark:text-white truncate">{displayName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{statusInfo.text}</p>
            </div>
             {(participant.status === 'focus' || participant.status === 'break') && countdown ? (
                 <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-black/20 px-2 py-1 rounded-lg shrink-0">
                    {countdown}
                </span>
            ) : isCurrentUser ? (
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 px-2 py-1 rounded-full shrink-0">
                    You
                </span>
            ) : null}
        </div>
    );
});

const roomDetails = {
    JEE: { name: "JEE Lounge", icon: Atom, description: "Join fellow JEE aspirants." },
    NEET: { name: "NEET Lounge", icon: Dna, description: "Join fellow NEET aspirants." },
    General: { name: "General Study", icon: GraduationCap, description: "For all other exams." },
};

const colorClasses: Record<StreamType, { border: string; iconBg: string; iconText: string; headerText: string; }> = {
    JEE: {
      border: 'hover:!border-indigo-500/50',
      iconBg: 'bg-indigo-500/10',
      iconText: 'text-indigo-500',
      headerText: 'text-indigo-400',
    },
    NEET: {
      border: 'hover:!border-emerald-500/50',
      iconBg: 'bg-emerald-500/10',
      iconText: 'text-emerald-500',
      headerText: 'text-emerald-400',
    },
    General: {
      border: 'hover:!border-violet-500/50',
      iconBg: 'bg-violet-500/10',
      iconText: 'text-violet-500',
      headerText: 'text-violet-400',
    },
};

const VirtualLibrary: React.FC<VirtualLibraryProps> = ({ 
    user, 
    onLogin,
    timerState,
    timeLeft,
    timerMode,
    durations,
    selectedSubject,
    stream
}) => {
  const [view, setView] = useState<'lobby' | 'room'>('lobby');
  const [selectedRoom, setSelectedRoom] = useState<StreamType | null>(null);
  const [roomCounts, setRoomCounts] = useState({ JEE: 0, NEET: 0, General: 0 });
  const [participants, setParticipants] = useState<StudyParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- PRESENCE & STATUS EFFECTS ---

  // Effect 1: Core RTDB connection and onDisconnect handler for user's own presence.
  useEffect(() => {
    if (!user) return;

    const myPresenceRef = ref(rtdb, `rooms/${stream}/presence/${user.uid}`);
    const connectedRef = ref(rtdb, '.info/connected');

    const unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        const initialPresence: Partial<StudyParticipant> = {
          uid: user.uid,
          displayName: user.displayName || 'Anonymous',
          photoURL: user.photoURL,
          isOnline: true,
          lastActivity: serverTimestamp() as any,
          status: 'idle',
        };
        set(myPresenceRef, initialPresence);
        onDisconnect(myPresenceRef).remove();
      }
    });

    return () => {
      unsubscribe();
      remove(myPresenceRef);
    };
  }, [user, stream]);

  // Effect 2: Update user's own status in RTDB based on timer activity.
  useEffect(() => {
    if (!user) return;

    const myPresenceRef = ref(rtdb, `rooms/${stream}/presence/${user.uid}`);
    
    const isSessionActive = timerState === 'running';
    const status = isSessionActive ? (timerMode === 'focus' ? 'focus' : 'break') : 'idle';
    
    const focusEndTime = (timerState === 'running' && timeLeft > 0)
      ? Date.now() + timeLeft * 1000
      : null;
    
    const updates: Partial<StudyParticipant> = {
      isOnline: true,
      lastActivity: serverTimestamp() as any,
      status: status,
      subject: status === 'focus' ? selectedSubject : (status === 'break' ? 'On Break' : 'In Lounge'),
      focusEndTime: focusEndTime,
      focusDuration: isSessionActive ? durations[timerMode] * 60 : undefined,
    };
    update(myPresenceRef, updates);

  }, [user, stream, timerState, timeLeft, timerMode, durations, selectedSubject]);

  // Effect 3: A periodic heartbeat to keep the user's `lastActivity` fresh, ensuring they don't appear offline.
  useEffect(() => {
      if (!user) return;
      const myPresenceRef = ref(rtdb, `rooms/${stream}/presence/${user.uid}`);
      const interval = setInterval(() => {
          update(myPresenceRef, {
              lastActivity: serverTimestamp()
          }).catch(() => {}); // Heartbeat can fail silently if connection is lost.
      }, 30000); // 30-second heartbeat.

      return () => clearInterval(interval);
  }, [user, stream]);

  // --- LOBBY & ROOM DATA EFFECTS (REBUILT FOR STABILITY) ---

  // Effect 4: Listen to room counts for the lobby view with robust data handling.
  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    const db = rtdb;
    const roomKeys: StreamType[] = ['JEE', 'NEET', 'General'];
    const unsubscribes = roomKeys.map(roomName => {
        const roomRef = ref(db, `rooms/${roomName}/presence`);
        return onValue(roomRef, (snapshot) => {
            const presences = snapshot.val();
            let activeCount = 0;
            // Robustness check: only process if data is a valid object.
            if (presences && typeof presences === 'object') {
                const now = Date.now();
                const PRESENCE_TIMEOUT = 70 * 1000; // 70 seconds
                activeCount = Object.values(presences).filter((p: any) => 
                    p && typeof p === 'object' && p.isOnline === true &&
                    typeof p.lastActivity === 'number' && (p.lastActivity > (now - PRESENCE_TIMEOUT))
                ).length;
            }
            setRoomCounts(prev => ({ ...prev, [roomName]: activeCount }));
        });
    });
    setIsLoading(false);
    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  // Effect 5: Rebuilt logic to fetch participants for a selected room.
  useEffect(() => {
    if (!user || !selectedRoom) {
      setParticipants([]);
      return;
    }
    setIsLoading(true);
    const roomPresenceRef = ref(rtdb, `rooms/${selectedRoom}/presence/`);
    
    // onValue is the single source of truth for the participant list.
    const unsubscribe = onValue(roomPresenceRef, (snapshot) => {
        const presences = snapshot.val();

        // **CRITICAL GUARD:** This prevents crashes when a room is empty (snapshot.val() is null)
        // or if the data is malformed. This was the primary source of the crashes.
        if (!presences || typeof presences !== 'object') {
            setParticipants([]);
            setIsLoading(false);
            return; // Exit gracefully.
        }

        const allInDB = Object.values(presences);
        const now = Date.now();
        const PRESENCE_TIMEOUT = 70 * 1000;

        // Filter and sanitize the data to ensure only valid, active users are processed.
        // This is a second line of defense against corrupted data making it to the render stage.
        const activeParticipants: StudyParticipant[] = allInDB
            .filter((p: any): p is Partial<StudyParticipant> => 
                p && typeof p === 'object' && p.isOnline === true && 
                typeof p.lastActivity === 'number' && p.lastActivity > (now - PRESENCE_TIMEOUT)
            )
            .map((p: any): StudyParticipant => ({
                uid: String(p.uid || 'unknown'),
                displayName: String(p.displayName || 'Anonymous'),
                photoURL: typeof p.photoURL === 'string' ? p.photoURL : null,
                lastActivity: p.lastActivity,
                isOnline: true,
                status: ['focus', 'break', 'idle'].includes(p.status) ? p.status : 'idle',
                subject: String(p.subject || ''),
                focusEndTime: typeof p.focusEndTime === 'number' ? p.focusEndTime : undefined,
                focusDuration: typeof p.focusDuration === 'number' ? p.focusDuration : undefined,
                intention: typeof p.intention === 'string' ? p.intention : undefined,
                accumulatedFocusTime: typeof p.accumulatedFocusTime === 'number' ? p.accumulatedFocusTime : undefined,
                isAway: typeof p.isAway === 'boolean' ? p.isAway : undefined,
                dailyFocusTime: typeof p.dailyFocusTime === 'number' ? p.dailyFocusTime : undefined,
                weeklyFocusTime: typeof p.weeklyFocusTime === 'number' ? p.weeklyFocusTime : undefined,
                lastFocusDate: typeof p.lastFocusDate === 'string' ? p.lastFocusDate : undefined,
                lastFocusWeek: typeof p.lastFocusWeek === 'number' ? p.lastFocusWeek : undefined,
            }));
        
        setParticipants(activeParticipants);
        setIsLoading(false);
    }, (error) => {
        console.error("Firebase RTDB error in Focus Lounge:", error);
        setIsLoading(false);
        setParticipants([]); // Clear participants on error
    });

    // The listener is cleaned up automatically when the effect re-runs or component unmounts.
    return () => unsubscribe();
  }, [user, selectedRoom]);

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      // Crash-proof sorting logic as a final safeguard.
      if (a?.uid === user?.uid) return -1;
      if (b?.uid === user?.uid) return 1;
      return (a?.displayName ?? '').localeCompare(b?.displayName ?? '');
    });
  }, [participants, user]);

  const handleRoomSelect = (roomName: StreamType) => {
    setSelectedRoom(roomName);
    setView('room');
  };

  const handleBackToLobby = () => {
    setView('lobby');
    setSelectedRoom(null);
  };
  
  if (!user) {
      return (
          <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center p-6 animate-in fade-in duration-500">
            <div className="p-4 bg-indigo-500/10 rounded-full mb-6 border border-indigo-500/20">
                <LogIn size={48} className="text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Join the Focus Lounge</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
                Sign in to join live study sessions with other aspirants.
            </p>
            <button
                onClick={onLogin}
                className="flex items-center justify-center gap-3 px-6 py-3 bg-white text-slate-900 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-100 transition-all active:scale-95 shadow-lg group"
            >
                <GoogleIcon />
                <span>Continue with Google</span>
            </button>
          </div>
      );
  }
  
  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
        {view === 'lobby' ? (
            <>
                <div>
                    <h2 className="text-3xl font-bold text-theme-text tracking-tight flex items-center gap-3">
                        <Users className="text-indigo-400" /> Focus Lounge
                    </h2>
                    <p className="text-xs text-theme-accent uppercase tracking-widest mt-1 font-bold">
                        Choose a room to study live with others
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(['JEE', 'NEET', 'General'] as StreamType[]).map(roomName => {
                        const details = roomDetails[roomName];
                        const Icon = details.icon;
                        const count = roomCounts[roomName];
                        const classes = colorClasses[roomName];

                        return (
                            <Card 
                                key={roomName}
                                onClick={() => handleRoomSelect(roomName)}
                                className={`group !p-6 flex flex-col justify-between aspect-[4/3.5] md:aspect-square ${classes.border} transition-all`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className={`p-3 rounded-2xl ${classes.iconBg} ${classes.iconText} group-hover:scale-110 transition-transform`}>
                                        <Icon size={28} />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                                        <Wifi size={10} /> {count} ONLINE
                                    </div>
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold text-theme-text">{details.name}</h3>
                                    <p className="text-xs text-theme-text-secondary">{details.description}</p>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            </>
        ) : (
            <>
                 <div>
                    <button onClick={handleBackToLobby} className="flex items-center gap-2 text-sm font-bold text-theme-text-secondary hover:text-theme-text mb-4">
                        <ArrowLeft size={16} /> Back to Rooms
                    </button>
                    <h2 className="text-3xl font-bold text-theme-text tracking-tight flex items-center gap-3">
                        <Users className={selectedRoom ? colorClasses[selectedRoom].headerText : 'text-indigo-400'} /> 
                        {selectedRoom ? roomDetails[selectedRoom].name : 'Lounge'}
                    </h2>
                </div>

                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Wifi size={16} className="text-emerald-500" /> Who's Online
                        </h3>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {sortedParticipants.length} Studying
                        </span>
                    </div>
                    
                    {isLoading ? (
                        <div className="text-center py-10 text-slate-400 text-sm font-medium">Loading...</div>
                    ) : sortedParticipants.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="font-bold text-slate-700 dark:text-slate-300">It's quiet in here...</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">You're the first one to arrive!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sortedParticipants.map(p => (
                                <ParticipantCard key={p.uid} participant={p} isCurrentUser={p.uid === user.uid} />
                            ))}
                        </div>
                    )}
                </Card>
            </>
        )}
    </div>
  );
};

export default VirtualLibrary;
