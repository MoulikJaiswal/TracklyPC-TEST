import React, { useState, useEffect, memo, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, ArrowLeft, Zap, Atom, Calculator, Dna, Coffee, Play, Pause, LogOut,
  Timer, Plus, Search, X, Palette, AlertTriangle, Pencil, Camera, Crown,
  UserMinus, Power, ListTodo, CheckCircle2, Maximize2, Minimize2, Music2,
  Square, Trophy, Medal, Flame, Clock, Eye, Star, PartyPopper, Lock, Link as LinkIcon,
  Share2, Copy
} from 'lucide-react';
import { StudyParticipant, StudyRoom, Target, Session } from '../types';
import { groupSessionService } from '../services/groupSessionService';
import { Card } from './Card';
import { User } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, query, onSnapshot } from 'firebase/firestore';

const MotionDiv = motion.div as any;

interface VirtualLibraryProps {
  user: User | null;
  userName: string | null;
  onLogin: () => void;
  isPro: boolean;
  targets: Target[];
  onCompleteTask: (id: string, completed: boolean) => void;
}

const getLocalDate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// --- SUB-COMPONENT: Participant Card ---
const ParticipantCard = memo(({ 
    participant, 
    isMe, 
    isHost,
    canKick,
    onKick
}: { 
    participant: StudyParticipant, 
    isMe: boolean, 
    isHost: boolean,
    canKick: boolean,
    onKick: () => void
}) => {
    const getSubjectIcon = (subj: string) => {
        switch(subj) {
            case 'Physics': return <Atom size={14} className="text-blue-400" />;
            case 'Chemistry': return <Zap size={14} className="text-orange-400" />;
            case 'Maths': return <Calculator size={14} className="text-rose-400" />;
            case 'Biology': return <Dna size={14} className="text-emerald-400" />;
            default: return <Coffee size={14} className="text-slate-400" />;
        }
    };

    return (
        <div className={`
            relative overflow-hidden rounded-2xl p-4 border transition-all duration-300 group
            ${isMe ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/5'}
            ${participant.isAway ? 'opacity-60 grayscale-[0.5]' : ''}
        `}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-white/10 overflow-hidden relative">
                        {participant.photoURL ? (
                            <img src={participant.photoURL} alt={participant.displayName || 'Avatar'} className="w-full h-full object-cover" />
                        ) : (
                            (participant.displayName || 'G').charAt(0).toUpperCase()
                        )}
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                            participant.isAway ? 'bg-amber-500' : 
                            participant.status === 'focus' ? 'bg-emerald-500' : 'bg-slate-500'
                        }`} />
                    </div>
                    <div className="overflow-hidden">
                        <div className="flex items-center gap-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[80px]">{participant.displayName || 'Guest'}</p>
                            {isHost && <Crown size={12} className="text-amber-500 fill-amber-500" />}
                        </div>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                            {participant.isAway ? 'Away' : participant.status === 'focus' ? participant.subject : 'On Break'}
                        </p>
                    </div>
                </div>
                
                <div className="flex gap-1">
                    {participant.status === 'focus' && (
                        <div className="p-1.5 rounded-lg bg-black/20 border border-white/5">
                            {getSubjectIcon(participant.subject)}
                        </div>
                    )}
                    {canKick && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onKick(); }}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white"
                            title="Kick User"
                        >
                            <UserMinus size={14} />
                        </button>
                    )}
                </div>
            </div>

            {participant.status === 'focus' ? (
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] text-indigo-500 dark:text-indigo-300 font-bold uppercase tracking-wider">
                            {participant.intention ? 'Working on' : 'Focusing'}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 animate-pulse">
                            IN-SESSION
                        </span>
                    </div>
                    {participant.intention && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 truncate" title={participant.intention}>
                            {participant.intention}
                        </p>
                    )}
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-emerald-500"
                            style={{ width: `100%` }} 
                        />
                    </div>
                </div>
            ) : (
                <div className="h-8 flex items-center justify-center opacity-50">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1">
                        {participant.isAway ? <Eye size={12} /> : <Coffee size={12} />} 
                        {participant.isAway ? 'Away from Keyboard' : 'Idle'}
                    </span>
                </div>
            )}
        </div>
    );
});

// --- SUB-COMPONENT: Universal Leaderboard ---
const Leaderboard = memo(({ roomId, myId }: { roomId: string, myId: string | undefined }) => {
    const [filter, setFilter] = useState<'today' | 'weekly'>('today');
    const [allParticipants, setAllParticipants] = useState<StudyParticipant[]>([]);

    useEffect(() => {
        if (!roomId) return;

        const q = query(collection(db, `rooms/${roomId}/participants`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const parts = snapshot.docs.map(d => d.data() as StudyParticipant);
            setAllParticipants(parts);
        }, (error) => {
            console.error("Leaderboard subscription error:", error);
        });

        return () => unsubscribe();
    }, [roomId]);

    const sortedData = useMemo(() => {
        let sortedParticipants = [...allParticipants];
        
        const key = filter === 'today' ? 'dailyFocusTime' : 'weeklyFocusTime';
        
        // Filter out users who have 0 time for the selected filter to keep the list clean
        sortedParticipants = sortedParticipants.filter(p => (p[key] || 0) > 0);

        sortedParticipants.sort((a, b) => (b[key] || 0) - (a[key] || 0));

        const maxTime = Math.max(1, sortedParticipants[0]?.[key] || 1);

        return sortedParticipants.map(p => {
            const minutes = p[key] || 0;
            return {
                participant: p,
                minutes,
                progress: (minutes / maxTime) * 100
            };
        });

    }, [allParticipants, filter]);
    
    const getMedal = (index: number) => {
        if (index === 0) return <Medal size={14} className="text-amber-400" />;
        if (index === 1) return <Medal size={14} className="text-slate-400" />;
        if (index === 2) return <Medal size={14} className="text-orange-400" />;
        return <span className="text-[10px] font-bold text-slate-500 w-[14px] text-center">{index + 1}</span>;
    };
    
    return (
        <div className="h-full flex flex-col">
            <div className="p-2 border-b border-slate-100 dark:border-white/5 flex flex-col gap-2 bg-white/50 dark:bg-black/20">
                <div className="flex items-center gap-2 px-2 pt-2">
                    <Trophy size={16} className="text-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white">Leaderboard</span>
                </div>
                <div className="flex bg-slate-200/50 dark:bg-black/30 p-1 rounded-lg">
                    <button onClick={() => setFilter('today')} className={`flex-1 py-1 rounded text-[10px] font-bold uppercase transition-all ${filter === 'today' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-white/10'}`}>Today</button>
                    <button onClick={() => setFilter('weekly')} className={`flex-1 py-1 rounded text-[10px] font-bold uppercase transition-all ${filter === 'weekly' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-white/10'}`}>Weekly</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                <AnimatePresence>
                    {sortedData.map(({ participant: p, minutes, progress }, index) => {
                        const isMe = p.uid === myId;
                        return (
                            <MotionDiv
                                key={p.uid}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className={`
                                    p-3 rounded-xl border transition-all duration-300 space-y-2
                                    ${index === 0 ? 'bg-amber-500/10 border-amber-500/20' : 'border-transparent'}
                                    ${isMe ? 'bg-indigo-500/10 border-indigo-500/30' : ''}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-5 flex items-center justify-center">{getMedal(index)}</div>
                                    <div className="flex-1 flex items-center gap-2 overflow-hidden">
                                        <p className={`text-xs font-bold truncate ${isMe ? 'text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                            {p.displayName}
                                        </p>
                                        {minutes > 60 && <Flame size={12} className="text-orange-500" title="On fire! (60+ mins)" />}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Clock size={12} className="text-slate-400" />
                                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                            {Math.floor(minutes/60)}h {minutes%60}m
                                        </span>
                                    </div>
                                </div>
                                <div className="pl-8">
                                    <div className="h-1 w-full bg-slate-200 dark:bg-black/30 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            </MotionDiv>
                        );
                    })}
                </AnimatePresence>
                {sortedData.length === 0 && (
                    <div className="p-4 text-center opacity-50">
                        <p className="text-[10px] uppercase text-slate-500 font-bold">No activity yet</p>
                    </div>
                )}
            </div>
        </div>
    );
});

// --- SUB-COMPONENT: Reflection Modal ---
const ReflectionModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    duration 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    onConfirm: (rating: number) => void, 
    duration: number 
}) => {
    const [rating, setRating] = useState(5);
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-500">
                        <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">Session Complete!</h3>
                    <p className="text-sm text-slate-400">{duration} minutes of focus logged.</p>
                </div>
                <div className="mb-8">
                    <label className="block text-center text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                        How focused were you?
                    </label>
                    <div className="flex justify-between items-center px-2 mb-2">
                        <span className="text-xs font-bold text-slate-600">Distracted</span>
                        <span className="text-2xl font-bold text-indigo-500">{rating}</span>
                        <span className="text-xs font-bold text-slate-600">Deep Flow</span>
                    </div>
                    <input 
                        type="range" min="1" max="10" step="1" 
                        value={rating} 
                        onChange={(e) => setRating(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 font-bold uppercase text-xs tracking-wider transition-colors">Skip</button>
                    <button onClick={() => onConfirm(rating)} className="flex-[2] py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-xs tracking-wider shadow-lg shadow-indigo-500/20 transition-all active:scale-95">Log Session</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export const VirtualLibrary: React.FC<VirtualLibraryProps> = ({ user, userName, onLogin, isPro, targets, onCompleteTask }) => {
  const [activeRoom, setActiveRoom] = useState<StudyRoom | null>(null);
  const [participants, setParticipants] = useState<StudyParticipant[]>([]);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  
  // Custom Name & Avatar
  const [displayName, setDisplayName] = useState(userName || 'Guest');
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: '', topic: '', description: '', color: 'indigo', isPrivate: false });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);

  // Controls
  const [mySubject, setMySubject] = useState<'Physics'|'Chemistry'|'Maths'|'Biology'|'Other'>('Physics');
  const [myDuration, setMyDuration] = useState(25);
  const [isMyTimerRunning, setIsMyTimerRunning] = useState(false);
  const [myIntention, setMyIntention] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
  const [showMiniPlanner, setShowMiniPlanner] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [lastSessionDuration, setLastSessionDuration] = useState(0);
  const [isAway, setIsAway] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const myFocusStartTimeRef = useRef<number | null>(null);
  const [myLiveTime, setMyLiveTime] = useState(0); 
  const isAmHost = activeRoom?.createdBy === user?.uid;

  // Local Timer
  useEffect(() => {
    if (!isMyTimerRunning) {
        setMyLiveTime(0);
        return;
    }
    const interval = setInterval(() => {
        if (myFocusStartTimeRef.current) {
            const elapsedSeconds = Math.floor((Date.now() - myFocusStartTimeRef.current) / 1000);
            setMyLiveTime(elapsedSeconds);
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [isMyTimerRunning]);

  // URL Auto-Join
  useEffect(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const roomIdFromUrl = searchParams.get('room');
      
      if (roomIdFromUrl && !activeRoom) {
          setIsJoiningByCode(true);
          groupSessionService.getRoom(roomIdFromUrl).then(room => {
              if (room) {
                  handleJoin(room);
                  window.history.replaceState({}, '', window.location.pathname);
              } else {
                  alert("Room not found or expired.");
              }
              setIsJoiningByCode(false);
          });
      }
  }, []);

  // Update Display Name
  useEffect(() => {
      if (userName) setDisplayName(userName);
      const storedAvatar = localStorage.getItem('trackly_guest_avatar');
      if (storedAvatar) setCustomAvatar(storedAvatar);
      else if (user?.photoURL) setCustomAvatar(user.photoURL);
  }, [userName, user]);

  // SLOWER HEARTBEAT (30 seconds) to reduce Firestore writes
  useEffect(() => {
    if (!user || !activeRoom) return;
    const heartbeatInterval = setInterval(() => {
      groupSessionService.updatePresence(activeRoom.id, user.uid, {});
    }, 30000); // Changed from 5000 to 30000
    return () => clearInterval(heartbeatInterval);
  }, [activeRoom?.id, user?.uid]);
  
  // Tab Close Handler (Fallback)
  useEffect(() => {
    if (!user || !activeRoom) return;
    const handleBeforeUnload = () => {
        groupSessionService.leaveRoom(activeRoom.id, user.uid);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeRoom?.id, user?.uid]);

  // Idle Detection
  useEffect(() => {
      if (!user || !activeRoom) return;
      let idleTimer: any;
      const IDLE_TIMEOUT = 5 * 60 * 1000; 

      const resetIdle = () => {
          if (isAway) {
              setIsAway(false);
              groupSessionService.updatePresence(activeRoom.id, user.uid, { isAway: false });
          }
          clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
              setIsAway(true);
              groupSessionService.updatePresence(activeRoom.id, user.uid, { isAway: true });
          }, IDLE_TIMEOUT);
      };

      window.addEventListener('mousemove', resetIdle);
      window.addEventListener('keydown', resetIdle);
      window.addEventListener('click', resetIdle);
      resetIdle(); 

      return () => {
          clearTimeout(idleTimer);
          window.removeEventListener('mousemove', resetIdle);
          window.removeEventListener('keydown', resetIdle);
          window.removeEventListener('click', resetIdle);
      };
  }, [activeRoom?.id, user?.uid, isAway]);

  // Subscribe to Rooms
  useEffect(() => {
    const unsubscribe = groupSessionService.subscribeToRooms((fetchedRooms) => {
        const defaultJeeRoom: StudyRoom = {
            id: 'system-jee-lounge', name: 'JEE Main Room', topic: 'General JEE/NEET', description: 'A public lounge for all JEE and NEET aspirants.', color: 'indigo', activeCount: 0, isSystem: true, isPrivate: false, createdAt: 0, status: 'active'
        };
        const jeeRoomFromDb = fetchedRooms.find(r => r.id === 'system-jee-lounge');
        const userRooms = fetchedRooms.filter(r => !r.isSystem && r.id !== 'system-jee-lounge');
        setRooms([jeeRoomFromDb || defaultJeeRoom, ...userRooms]);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Participants & SELF-DISCONNECT LOGIC
  useEffect(() => {
      if (!activeRoom || !user) return;
      const unsubscribe = groupSessionService.subscribeToRoom(activeRoom.id, (parts) => {
          setParticipants(parts);
          
          const amIHere = parts.find(p => p.uid === user.uid);
          if (!amIHere && parts.length > 0) {
              console.log("Detected remote removal from room.");
              setActiveRoom(null);
              setIsMyTimerRunning(false);
              setParticipants([]);
          }
      });
      return () => unsubscribe();
  }, [activeRoom, user]);

  // Subscribe to Room Status
  useEffect(() => {
      if (!activeRoom) return;
      const unsubscribe = groupSessionService.subscribeToRoomStatus(activeRoom.id, (updatedRoom) => {
          if (!updatedRoom) {
              setActiveRoom((current) => {
                  if (current && current.id === activeRoom.id) {
                      setParticipants([]);
                      setIsMyTimerRunning(false);
                      if (current.createdBy !== user?.uid) alert("The host has closed this room.");
                      return null;
                  }
                  return null;
              });
          }
      });
      return () => unsubscribe();
  }, [activeRoom?.id, user?.uid]);

  // JOIN LOGIC
  const handleJoin = async (room: StudyRoom) => {
      if (!user) { onLogin(); return; }

      try {
          if (room.isSystem) {
            const roomRef = doc(db, 'rooms', room.id);
            const roomSnap = await getDoc(roomRef);
            if (!roomSnap.exists()) {
                await setDoc(roomRef, {
                    name: room.name, topic: room.topic, description: room.description, color: room.color, createdBy: 'system', createdAt: Date.now(), isSystem: true, isPrivate: false, activeCount: 0, status: 'active',
                });
            }
          }

          await groupSessionService.joinSession(
              room.id, 
              { uid: user.uid, displayName: displayName || 'Anonymous', photoURL: customAvatar },
              mySubject
          );

          setActiveRoom(room);
          
      } catch (e) {
          console.error("Failed to join room:", e);
          alert("Could not join room. Please try again.");
      }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!joinCode.trim() || !user) return;
      setIsJoiningByCode(true);
      let roomId = joinCode.trim();
      if (roomId.includes('?room=')) roomId = roomId.split('?room=')[1];
      const room = await groupSessionService.getRoom(roomId);
      setIsJoiningByCode(false);
      if (room) {
          handleJoin(room);
          setShowJoinCodeModal(false);
          setJoinCode('');
      } else {
          alert("Room not found.");
      }
  };

  const handleCopyLink = () => {
      if (!activeRoom) return;
      const url = `${window.location.origin}${window.location.pathname}?room=${activeRoom.id}`;
      navigator.clipboard.writeText(url).then(() => {
          setShareCopied(true);
          setTimeout(() => setShareCopied(false), 2000);
      });
  };

  const handleLeave = () => {
      if (activeRoom && user) groupSessionService.leaveRoom(activeRoom.id, user.uid);
      setActiveRoom(null);
      setParticipants([]);
      setIsMyTimerRunning(false);
      setZenMode(false);
  };

  const handleKick = useCallback((targetUserId: string) => {
      if (!activeRoom || !isAmHost) return;
      if (confirm("Kick this user?")) groupSessionService.leaveRoom(activeRoom.id, targetUserId);
  }, [activeRoom, isAmHost]);

  const handleShutdown = useCallback(async () => {
      if (!activeRoom || !isAmHost) return;
      if (confirm("Shut down room?")) {
          const roomToDelete = activeRoom.id;
          setActiveRoom(null); 
          setParticipants([]);
          setIsMyTimerRunning(false);
          setZenMode(false);
          try { await groupSessionService.deleteRoom(roomToDelete); } catch (e) {}
      }
  }, [activeRoom, isAmHost]);

  const toggleMyTimer = () => {
    if (!user || !activeRoom) return;
    const newStatus = isMyTimerRunning ? 'idle' : 'focus';
    const now = Date.now();
    const updates: Partial<StudyParticipant> = {
      status: newStatus, subject: mySubject, lastActivity: now, intention: newStatus === 'focus' ? (myIntention || 'Focusing') : ''
    };
    if (isMyTimerRunning) {
      if (linkedTaskId) {
        const task = targets.find(t => t.id === linkedTaskId);
        if (task && !task.completed) {
          if (window.confirm(`Did you complete: "${task.text}"?`)) {
            onCompleteTask(linkedTaskId, true);
            setLinkedTaskId(null);
            setMyIntention('');
          }
        }
      }
      let sessionMins = 0;
      if (myFocusStartTimeRef.current) {
        const elapsedMs = now - myFocusStartTimeRef.current;
        if (elapsedMs > 60000) { 
          sessionMins = Math.floor(elapsedMs / 60000);
          const me = participants.find(p => p.uid === user.uid);
          if (me) {
              updates.accumulatedFocusTime = (me.accumulatedFocusTime || 0) + sessionMins;
              
              const today = getLocalDate(new Date());
              const thisWeek = getWeekNumber(new Date());

              const dailyTime = me.lastFocusDate === today ? (me.dailyFocusTime || 0) : 0;
              const weeklyTime = me.lastFocusWeek === thisWeek ? (me.weeklyFocusTime || 0) : 0;
              
              updates.dailyFocusTime = dailyTime + sessionMins;
              updates.weeklyFocusTime = weeklyTime + sessionMins;
              updates.lastFocusDate = today;
              updates.lastFocusWeek = thisWeek;
          } else {
            updates.accumulatedFocusTime = sessionMins;
          }
        }
      }
      setLastSessionDuration(sessionMins);
      if (sessionMins > 0) setShowReflection(true);
      myFocusStartTimeRef.current = null;
    } else {
      myFocusStartTimeRef.current = now;
    }
    setIsMyTimerRunning(!isMyTimerRunning);
    groupSessionService.updatePresence(activeRoom.id, user.uid, updates);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newRoomData.name || !user) return;
      setIsCreating(true);
      setCreateError(null);
      try {
          const newRoomId = await groupSessionService.createRoom({
              name: newRoomData.name, topic: newRoomData.topic, description: newRoomData.description, color: newRoomData.color, createdBy: user.uid, isPrivate: newRoomData.isPrivate
          });
          const newRoom: StudyRoom = {
              id: newRoomId, name: newRoomData.name, topic: newRoomData.topic, description: newRoomData.description, color: newRoomData.color, createdBy: user.uid, isPrivate: newRoomData.isPrivate, activeCount: 0, createdAt: Date.now(), status: 'active'
          };
          setShowCreateModal(false);
          setNewRoomData({ name: '', topic: '', description: '', color: 'indigo', isPrivate: false });
          handleJoin(newRoom);
          if (newRoomData.isPrivate) setTimeout(() => setShowShareModal(true), 500); 
      } catch (err: any) {
          setCreateError(err.message || "Failed to create room.");
      } finally { setIsCreating(false); }
  };

  const handleLinkTask = (task: Target) => {
      setLinkedTaskId(task.id);
      if (!myIntention) setMyIntention(task.text);
      setShowMiniPlanner(false);
  };

  const handleReflectionConfirm = (rating: number) => {
    setShowReflection(false);
    console.log(`User rated focus session of ${lastSessionDuration}m with score: ${rating}/10`);
    if (user && activeRoom) {
      // groupSessionService.updatePresence(activeRoom.id, user.uid, { focusRating: rating });
    }
  };

  // --- RENDER ---
  if (!activeRoom) {
      return (
          <div className="space-y-8 animate-in fade-in duration-500 pb-20">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                  <div>
                      <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Focus Lounge</h2>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1 font-bold">Join others for accountability</p>
                      
                      <div className="flex items-center gap-3 mt-4 bg-white/50 dark:bg-slate-800/50 p-2 pr-4 rounded-xl border border-slate-200 dark:border-white/5 w-fit backdrop-blur-sm shadow-sm">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm relative group cursor-pointer overflow-hidden" onClick={() => avatarInputRef.current?.click()}>
                              {customAvatar ? <img src={customAvatar} alt="Avatar" className="w-full h-full object-cover" /> : (displayName || 'G').charAt(0).toUpperCase()}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={14} className="text-white" /></div>
                          </div>
                          <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if(file){ const reader = new FileReader(); reader.onload = (ev) => { const res = ev.target?.result as string; setCustomAvatar(res); localStorage.setItem('trackly_guest_avatar', res); }; reader.readAsDataURL(file); } }} />
                          <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Joining as</span>
                              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-transparent outline-none font-bold text-sm text-slate-900 dark:text-white w-32 focus:w-48 transition-all placeholder:text-slate-500" placeholder="Enter Name" />
                          </div>
                          <Pencil size={12} className="text-slate-400 opacity-50" />
                      </div>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => setShowJoinCodeModal(true)} className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl font-bold uppercase text-xs tracking-wider transition-all active:scale-95"><LinkIcon size={16} /> Have Code?</button>
                      <button onClick={() => user ? setShowCreateModal(true) : onLogin()} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg shadow-indigo-600/20 transition-all active:scale-95"><Plus size={16} /> Create Lounge</button>
                  </div>
              </div>

              {rooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl text-center opacity-60">
                      <Users size={48} className="text-slate-400 mb-4" />
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">No active lounges</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rooms.map(room => {
                          const isHost = room.createdBy === user?.uid;
                          const canEnter = !room.isPrivate || isHost;
                          return (
                              <Card key={room.id} className={`group hover:border-indigo-500/30 cursor-pointer transition-all active:scale-[0.98] p-6 relative overflow-hidden flex flex-col justify-between min-h-[180px] ${!canEnter ? 'opacity-80' : ''}`} onClick={() => { if(!canEnter) setShowJoinCodeModal(true); else handleJoin(room); }}>
                                  <div className={`absolute top-0 right-0 p-16 rounded-bl-full opacity-5 bg-${room.color}-500 transition-transform group-hover:scale-150`} />
                                  <div className="relative z-10">
                                      <div className="flex justify-between items-start mb-4">
                                          <div className={`p-3 rounded-2xl bg-${room.color}-500/10 text-${room.color}-500`}>{room.isPrivate ? <Lock size={24} /> : room.isSystem ? <Star size={24}/> : <Users size={24} />}</div>
                                          <div className="flex items-center gap-2">
                                              {isHost && <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-[9px] font-bold uppercase tracking-wider text-slate-500">Mine</span>}
                                              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{room.activeCount || 0} Online</span>
                                          </div>
                                      </div>
                                      <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1 flex items-center gap-2">{room.name}{room.isPrivate && <span className="text-[9px] bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase">Private</span>}</h3>
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{room.topic}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{room.description || 'No description provided.'}</p>
                                  </div>
                                  <div className="relative z-10 mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                                      <div className={`flex items-center gap-2 text-xs font-bold transition-transform ${!canEnter ? 'text-slate-400' : 'text-indigo-500 group-hover:translate-x-1'}`}><span>{!canEnter ? 'Requires Code' : 'Enter Room'}</span>{!canEnter ? <Lock size={14} /> : <ArrowLeft size={14} className="rotate-180" />}</div>
                                  </div>
                              </Card>
                          );
                      })}
                  </div>
              )}

              {showJoinCodeModal && createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200"><div className="bg-white dark:bg-[#0f172a] w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-white/10 animate-in zoom-in-95 duration-200"><div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-slate-900 dark:text-white">Join by Link</h3><button onClick={() => setShowJoinCodeModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"><X size={18} className="text-slate-500" /></button></div><form onSubmit={handleJoinByCode} className="space-y-4"><p className="text-xs text-slate-500 dark:text-slate-400">Enter a Room ID or paste an invite link below.</p><input type="text" required placeholder="Paste Room ID or Link" className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors" value={joinCode} onChange={e => setJoinCode(e.target.value)} autoFocus /><button type="submit" disabled={isJoiningByCode || !joinCode} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50">{isJoiningByCode ? 'Locating Room...' : 'Join Room'}</button></form></div></div>, document.body)}

              {showCreateModal && createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200"><div className="bg-white dark:bg-[#0f172a] w-full max-w-md rounded-3xl shadow-2xl p-6 border border-white/10 animate-in zoom-in-95 duration-200"><div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Focus Lounge</h3><button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"><X size={18} className="text-slate-500" /></button></div>{createError && (<div className="p-3 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-xs text-rose-500"><AlertTriangle size={14} /><span>{createError}</span></div>)}<form onSubmit={handleCreateRoom} className="space-y-4"><div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Room Name</label><input type="text" required placeholder="e.g., Late Night Grind" className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors" value={newRoomData.name} onChange={e => setNewRoomData({...newRoomData, name: e.target.value})} /></div><div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Subject / Topic</label><input type="text" required placeholder="e.g., Physics Mechanics" className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors" value={newRoomData.topic} onChange={e => setNewRoomData({...newRoomData, topic: e.target.value})} /></div><div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Description</label><textarea placeholder="What are we studying?" className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors h-24 resize-none" value={newRoomData.description} onChange={e => setNewRoomData({...newRoomData, description: e.target.value})} /></div><div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors" onClick={() => setNewRoomData(p => ({...p, isPrivate: !p.isPrivate}))}><div className={`w-5 h-5 rounded border flex items-center justify-center ${newRoomData.isPrivate ? 'bg-indigo-500 border-indigo-500' : 'border-slate-400'}`}>{newRoomData.isPrivate && <CheckCircle2 size={12} className="text-white" />}</div><div><span className="text-xs font-bold text-slate-900 dark:text-white block">Private Room (Invite Only)</span><span className="text-[10px] text-slate-500 block">Hidden from lobby. Share link to join.</span></div><Lock size={16} className="ml-auto text-slate-400" /></div><div><label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block flex items-center gap-2"><Palette size={12}/> Color Theme</label><div className="flex gap-2">{['indigo', 'emerald', 'rose', 'orange', 'blue', 'purple'].map(c => (<button key={c} type="button" onClick={() => setNewRoomData({...newRoomData, color: c})} className={`w-8 h-8 rounded-full border-2 transition-all ${newRoomData.color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`} style={{ backgroundColor: `var(--color-${c}-500, ${c})` }}><div className={`w-full h-full rounded-full bg-${c}-500`} /></button>))}</div></div><button type="submit" disabled={isCreating} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20 transition-all active:scale-95 mt-4 disabled:opacity-50">{isCreating ? 'Creating...' : 'Launch Lounge'}</button></form></div></div>, document.body)}
          </div>
      );
  }

  // --- RENDER: ACTIVE ROOM ---
  return (
    <>
      <div className={`h-[calc(100vh-100px)] flex flex-col animate-in fade-in zoom-in-95 duration-300 ${zenMode ? 'fixed inset-0 z-[150] bg-black h-screen p-6' : ''}`}>
          {!zenMode && (<div className="flex justify-between items-center mb-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-white/5 shrink-0"><div className="flex items-center gap-3"><div className={`p-2 rounded-xl bg-${activeRoom.color}-500/10 text-${activeRoom.color}-500`}>{activeRoom.isPrivate ? <Lock size={20} /> : activeRoom.isSystem ? <Star size={20}/> : <Users size={20} />}</div><div><h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">{activeRoom.name}{activeRoom.isPrivate && <span className="text-[9px] bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase">Private</span>}</h3><div className="flex items-center gap-2"><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{participants.length} Online</p><span className="text-[10px] text-slate-400">•</span><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{activeRoom.topic}</p></div></div></div><div className="flex items-center gap-2"><button onClick={() => setShowShareModal(true)} className="flex items-center gap-2 px-3 py-2 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-all relative overflow-hidden" title="Invite Link"><Share2 size={16} /><span className="text-[10px] font-bold uppercase tracking-wide hidden md:inline">Invite</span></button><button onClick={() => setShowMobileLeaderboard(true)} className="lg:hidden p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-colors relative"><Trophy size={20} />{participants.some(p => (p.accumulatedFocusTime || 0) > 0) && (<span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-slate-900" />)}</button>{isAmHost && !activeRoom.isSystem && (<button onClick={handleShutdown} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors" title="Shutdown Room"><Power size={20} /></button>)}<button onClick={handleLeave} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors" title="Leave Room"><LogOut size={20} /></button></div></div>)}

          <div className="flex flex-1 overflow-hidden gap-6 mb-6">
              <div className="flex-1 overflow-y-auto custom-scrollbar pb-32">
                  {participants.length === 0 ? (<div className="h-full flex flex-col items-center justify-center opacity-40"><Users size={32} className="text-slate-400 mb-2" /><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Room is empty</p></div>) : (<div className={`grid gap-3 transition-all ${zenMode ? 'grid-cols-2 md:grid-cols-4 opacity-50 hover:opacity-100' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'}`}>{participants.map(p => (<ParticipantCard key={p.uid} participant={p} isMe={user?.uid === p.uid} isHost={activeRoom.createdBy === p.uid} canKick={isAmHost && p.uid !== user?.uid} onKick={() => handleKick(p.uid)} />))}</div>)}
              </div>
              {!zenMode && (<div className="hidden lg:block w-72 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm shrink-0"><Leaderboard roomId={activeRoom.id} myId={user?.uid} /></div>)}
          </div>

          <div className={`${zenMode ? 'fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl' : 'absolute bottom-4 left-4 right-4'} bg-white/90 dark:bg-black/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 z-50`}>
              {isMyTimerRunning && (<div className="absolute top-0 left-0 w-full h-[2px] bg-slate-800"><div className="h-full bg-indigo-500 animate-pulse w-full" /></div>)}
              <div className="p-3">
                {!isMyTimerRunning && (
                    <div className="flex flex-col md:flex-row items-center gap-3">
                        <div className="flex-1 w-full flex items-center gap-2 bg-slate-100 dark:bg-black/20 p-2 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner dark:shadow-none">
                             <button onClick={() => setShowMiniPlanner(true)} className={`p-2 rounded-xl transition-all shrink-0 ${linkedTaskId ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200/50 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}>
                                {linkedTaskId ? <CheckCircle2 size={18} /> : <ListTodo size={18} />}
                             </button>
                             <input type="text" placeholder="What is your goal? (e.g. Rotational Motion)" className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-500 outline-none" value={myIntention} onChange={(e) => setMyIntention(e.target.value)} />
                        </div>
                        <div className="w-full md:w-auto flex items-stretch gap-3">
                            <div className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-black/20 rounded-2xl p-2 px-3 border border-slate-200 dark:border-white/10 shadow-inner dark:shadow-none">
                                <div className="flex flex-col items-center">
                                    <input type="number" min="0" max="12" value={Math.floor(myDuration / 60)} onChange={(e) => { const val = parseInt(e.target.value); if (!isNaN(val)) { const h = Math.max(0, Math.min(12, val)); const m = myDuration % 60; setMyDuration(Math.max(1, (h * 60) + m)); } }} className="w-10 bg-transparent text-center font-mono text-xl font-bold text-slate-900 dark:text-white outline-none appearance-none p-0 border-b-2 border-transparent focus:border-indigo-500 transition-colors" />
                                    <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">Hrs</span>
                                </div>
                                <span className="text-xl font-bold text-slate-300 dark:text-slate-600 pb-3">:</span>
                                <div className="flex flex-col items-center">
                                    <input type="number" min="0" max="59" value={myDuration % 60} onChange={(e) => { const val = parseInt(e.target.value); if (!isNaN(val)) { const m = Math.max(0, Math.min(59, val)); const h = Math.floor(myDuration / 60); setMyDuration(Math.max(1, (h * 60) + m)); } }} className="w-10 bg-transparent text-center font-mono text-xl font-bold text-slate-900 dark:text-white outline-none appearance-none p-0 border-b-2 border-transparent focus:border-indigo-500 transition-colors" />
                                    <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">Mins</span>
                                </div>
                            </div>
                            <button onClick={toggleMyTimer} className={`px-6 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 font-bold uppercase text-xs tracking-wider gap-2 bg-white text-slate-900 hover:bg-slate-200 shadow-white/10`}>
                                <Play size={16} fill="currentColor" /> Start
                            </button>
                        </div>
                    </div>
                )}
                {isMyTimerRunning && (
                    <div className="flex items-center gap-3 p-1">
                        <div className="flex-1 relative">
                            <div className="flex justify-between items-center h-full px-2">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider mb-0.5">Focusing On</span>
                                    <span className="text-sm font-bold text-white truncate block">{myIntention || mySubject}</span>
                                </div>
                                <span className="text-lg font-mono font-bold text-white">{formatTime(myLiveTime)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setZenMode(!zenMode)} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">{zenMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                            <button onClick={toggleMyTimer} className={`h-12 px-6 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 font-bold uppercase text-xs tracking-wider gap-2 bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20`}>
                                <Square size={16} fill="currentColor" /> Stop
                            </button>
                        </div>
                    </div>
                )}
              </div>
          </div>

          {showShareModal && createPortal(<div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200"><div className="bg-white dark:bg-[#0f172a] w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-white/10 animate-in zoom-in-95 duration-200"><div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-slate-900 dark:text-white">Invite Others</h3><button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"><X size={18} className="text-slate-500" /></button></div><div className="p-4 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/10 mb-4"><p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Room Link</p><div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden"><span className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate flex-1">{window.location.origin}{window.location.pathname}?room={activeRoom.id}</span></div></div><div className="p-4 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/10 mb-6"><p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Room Code</p><p className="text-xl font-mono font-bold text-slate-900 dark:text-white text-center tracking-widest">{activeRoom.id}</p></div><button onClick={handleCopyLink} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">{shareCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}{shareCopied ? 'Link Copied!' : 'Copy Link'}</button></div></div>, document.body)}
          {showMobileLeaderboard && createPortal(<div className="fixed inset-0 z-[200] flex items-end justify-center p-4"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileLeaderboard(false)} /><div className="relative bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 max-h-[60vh] flex flex-col"><div className="flex justify-between items-center mb-4 shrink-0"><h3 className="text-lg font-bold text-white">Leaderboard</h3><button onClick={() => setShowMobileLeaderboard(false)} className="p-2 bg-white/5 rounded-full text-slate-400"><X size={16}/></button></div><div className="flex-1 overflow-hidden min-h-0"><Leaderboard roomId={activeRoom.id} myId={user?.uid} /></div></div></div>, document.body)}
          {showMiniPlanner && createPortal(<div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-4"><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMiniPlanner(false)} /><div className="relative bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300"><div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-white">Select Task</h3><button onClick={() => setShowMiniPlanner(false)} className="p-2 bg-white/5 rounded-full text-slate-400"><X size={16}/></button></div><div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">{targets.filter(t => !t.completed).length === 0 ? (<p className="text-center text-slate-500 text-xs py-8">No pending tasks found.</p>) : (targets.filter(t => !t.completed).map(task => (<button key={task.id} onClick={() => handleLinkTask(task)} className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors flex items-center gap-3 group"><div className={`w-3 h-3 rounded-full border-2 border-slate-500 group-hover:border-indigo-500`} /><span className="text-sm text-slate-300 group-hover:text-white truncate">{task.text}</span></button>)))}</div></div></div>, document.body)}
          <ReflectionModal isOpen={showReflection} onClose={() => setShowReflection(false)} onConfirm={handleReflectionConfirm} duration={lastSessionDuration} />
      </div>
    </>
  );
};
