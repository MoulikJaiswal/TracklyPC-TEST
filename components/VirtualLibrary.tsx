
import React, { useState, useEffect, useMemo } from 'react';
import { Users, Wifi, LogIn, User as UserIcon } from 'lucide-react';
import { User } from 'firebase/auth';
import { rtdb } from '../firebase';
import { ref, onValue, onDisconnect, remove, set, serverTimestamp, off } from 'firebase/database';
import { StudyParticipant } from '../types';
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


const VirtualLibrary: React.FC<VirtualLibraryProps> = ({ 
    user, 
    onLogin,
    timerState,
    timeLeft,
    timerMode,
    durations,
    selectedSubject 
}) => {
  const [participants, setParticipants] = useState<StudyParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        setParticipants([]);
        return;
    }

    const db = rtdb;
    const myPresenceRef = ref(db, 'presence/' + user.uid);

    // This special path lets us know if we are connected to RTDB.
    const connectedRef = ref(db, '.info/connected');

    const unsubscribeConnected = onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            const isSessionActive = timerState === 'running';
            const status = isSessionActive
                ? (timerMode === 'focus' ? 'focus' : 'break')
                : 'idle';

            const participantData: StudyParticipant = {
                uid: user.uid,
                displayName: user.displayName || 'Anonymous',
                photoURL: user.photoURL,
                lastActivity: serverTimestamp() as any,
                isOnline: true,
                status: status,
                subject: status === 'focus' ? selectedSubject : 'Other',
                focusEndTime: isSessionActive ? Date.now() + timeLeft * 1000 : undefined,
                focusDuration: isSessionActive ? durations[timerMode] * 60 : undefined,
            };
            
            set(myPresenceRef, participantData);

            onDisconnect(myPresenceRef).remove();
        }
    });

    const presenceRef = ref(db, 'presence/');
    const unsubscribePresence = onValue(presenceRef, (snapshot) => {
        const presences = snapshot.val() || {};
        const activeParticipants = Object.values(presences) as StudyParticipant[];
        setParticipants(activeParticipants);
        setIsLoading(false);
    });

    return () => {
        unsubscribeConnected();
        unsubscribePresence();
        remove(myPresenceRef);
    };
  }, [user, timerState, timeLeft, timerMode, durations, selectedSubject]);

  const sortedParticipants = useMemo(() => {
      return [...participants].sort((a, b) => {
          if (a.uid === user?.uid) return -1;
          if (b.uid === user?.uid) return 1;
          return a.displayName.localeCompare(b.displayName);
      });
  }, [participants, user]);

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
        <div>
            <h2 className="text-3xl font-bold text-theme-text tracking-tight flex items-center gap-3">
                <Users className="text-indigo-400" /> Focus Lounge
            </h2>
            <p className="text-xs text-theme-accent uppercase tracking-widest mt-1 font-bold">
                Study live with others
            </p>
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
    </div>
  );
};

export default VirtualLibrary;
