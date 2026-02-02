import React, { useState, useEffect, memo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, 
  ArrowLeft, 
  Zap, 
  Atom, 
  Calculator, 
  Dna, 
  Coffee, 
  Play, 
  Pause, 
  LogOut,
  Timer,
  Plus,
  Search,
  X,
  Palette,
  AlertTriangle,
  Pencil,
  Camera,
  Crown,
  UserMinus,
  Power,
  ListTodo,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Music2,
  Square,
  Trophy,
  Medal,
  Flame,
  Clock,
  Eye,
  Star,
  PartyPopper,
  Lock,
  Link as LinkIcon,
  Share2,
  Copy
} from 'lucide-react';
import { StudyParticipant, StudyRoom, Target, Session } from '../types';
import { groupSessionService } from '../services/groupSessionService';
import { Card } from './Card';
import { User } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const MotionDiv = motion.div as any;

interface VirtualLibraryProps {
  user: User | null;
  userName: string | null;
  onLogin: () => void;
  isPro: boolean;
  targets: Target[];
  onCompleteTask: (id: string, completed: boolean) => void;
}

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
    onKick,
    onReaction
}: { 
    participant: StudyParticipant, 
    isMe: boolean, 
    isHost: boolean,
    canKick: boolean,
    onKick: () => void,
    onReaction: (emoji: string) => void
}) => {
    const [showReaction, setShowReaction] = useState<{emoji: string, from: string} | null>(null);

    // Reaction Listener
    useEffect(() => {
        if (participant.lastReaction && participant.lastReaction.timestamp > Date.now() - 5000) {
            setShowReaction({
                emoji: participant.lastReaction.emoji,
                from: participant.lastReaction.fromName
            });
            const t = setTimeout(() => setShowReaction(null), 3000);
            return () => clearTimeout(t);
        }
    }, [participant.lastReaction]);

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
            {/* Reaction Overlay */}
            <AnimatePresence>
                {showReaction && (
                    <MotionDiv 
                        initial={{ opacity: 0, scale: 0.5, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: -20 }}
                        exit={{ opacity: 0, scale: 1.5, y: -40 }}
                        className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none"
                    >
                        <span className="text-4xl filter drop-shadow-lg">{showReaction.emoji}</span>
                        {isMe && (
                            <span className="text-[9px] font-bold text-white bg-black/50 px-2 py-1 rounded-full mt-2 backdrop-blur-sm">
                                from {showReaction.from}
                            </span>
                        )}
                    </MotionDiv>
                )}
            </AnimatePresence>

            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-white/10 overflow-hidden relative">
                        {participant.photoURL ? (
                            <img src={participant.photoURL} alt={participant.displayName} className="w-full h-full object-cover" />
                        ) : (
                            participant.displayName.charAt(0).toUpperCase()
                        )}
                        {/* Status Dot */}
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${participant.isAway ? 'bg-amber-500' : participant.status === 'focus' ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                    </div>
                    <div className="overflow-hidden">
                        <div className="flex items-center gap-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[80px]">{participant.displayName}</p>
                            {isHost && <Crown size={12} className="text-amber-500 fill-amber-500" />}
                        </div>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                            {participant.isAway ? 'Away' : participant.status === 'focus' ? participant.subject : 'On Break'}
                        </p>
                    </div>
                </div>
                
                <div className="flex gap-1">
                    {!isMe && !participant.isAway && participant.status === 'focus' && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => onReaction('🔥')} 
                                className="w-6 h-6 flex items-center justify-center rounded-lg bg-orange-500/20 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors"
                                title="Send Fire"
                            >
                                <Flame size={12} fill="currentColor" />
                            </button>
                            <button 
                                onClick={() => onReaction('👏')} 
                                className="w-6 h-6 flex items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors"
                                title="Send Kudos"
                            >
                                <PartyPopper size={12} />
                            </button>
                        </div>
                    )}
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

// --- SUB-COMPONENT: Leaderboard ---
const Leaderboard = memo(({ participants }: { participants: StudyParticipant[] }) => {
    const sorted = [...participants].sort((a, b) => (b.accumulatedFocusTime || 0) - (a.accumulatedFocusTime || 0));

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-2 bg-white/50 dark:bg-black/20">
                <Trophy size={16} className="text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white">Session Leaders</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                {sorted.map((p, index) => {
                    const minutes = Math.floor(p.accumulatedFocusTime || 0);
                    return (
                        <div key={p.uid} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                            <div className={`
                                w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0
                                ${index === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 
                                  index === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400' :
                                  index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' :
                                  'text-slate-400'
                                }
                            `}>
                                {index + 1}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className={`text-xs font-bold truncate ${p.uid === 'me' ? 'text-indigo-500' : 'text-slate-700 dark:text-slate-200'}`}>
                                    {p.displayName}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Clock size={12} className="text-slate-400" />
                                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{minutes}m</span>
                            </div>
                        </div>
                    );
                })}
                {sorted.length === 0 && (
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
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 font-bold uppercase text-xs tracking-wider transition-colors">
                        Skip
                    </button>
                    <button 
                        onClick={() => onConfirm(rating)}
                        className="flex-[2] py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase text-xs tracking-wider shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                    >
                        Log Session
                    </button>
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
  
  // Custom Name & Avatar State
  const [displayName, setDisplayName] = useState(userName || 'Guest');
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Create Room Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: '', topic: '', description: '', color: 'indigo', isPrivate: false });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join Code Modal
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);

  // My Control State
  const [mySubject, setMySubject] = useState<'Physics'|'Chemistry'|'Maths'|'Biology'|'Other'>('Physics');
  const [myDuration, setMyDuration] = useState(25);
  const [isMyTimerRunning, setIsMyTimerRunning] = useState(false);
  
  // New States for Improved Bottom Bar
  const [myIntention, setMyIntention] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
  const [showMiniPlanner, setShowMiniPlanner] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);

  // --- NEW FEATURES STATES ---
  const [showReflection, setShowReflection] = useState(false);
  const [lastSessionDuration, setLastSessionDuration] = useState(0);
  const [isAway, setIsAway] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // --- OPTIMIZED LOCAL TIMER ---
  const myFocusStartTimeRef = useRef<number | null>(null);
  const [myLiveTime, setMyLiveTime] = useState(0); // in seconds

  // Check if I am host
  const isAmHost = activeRoom?.createdBy === user?.uid;

  // Local Timer for current user
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


  const updateHours = (h: number) => {
      const m = myDuration % 60;
      const newDuration = (h * 60) + m;
      setMyDuration(Math.max(1, newDuration)); // Min 1 min
  };

  const updateMinutes = (m: number) => {
      const h = Math.floor(myDuration / 60);
      const newDuration = (h * 60) + m;
      setMyDuration(Math.max(1, newDuration));
  };

  // Auto-Join from URL on mount
  useEffect(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const roomIdFromUrl = searchParams.get('room');
      
      if (roomIdFromUrl && !activeRoom) {
          setIsJoiningByCode(true);
          groupSessionService.getRoom(roomIdFromUrl).then(room => {
              if (room) {
                  handleJoin(room);
                  // Clear URL to prevent rejoin on refresh if desired, or keep it.
                  // For SPA without router, modifying history state is standard.
                  window.history.replaceState({}, '', window.location.pathname);
              } else {
                  alert("Room not found or expired.");
              }
              setIsJoiningByCode(false);
          });
      }
  }, []);

  // Update display name when user logs in/out
  useEffect(() => {
      if (userName) setDisplayName(userName);
      
      // Load custom avatar from local storage if available, else use user photo
      const storedAvatar = localStorage.getItem('trackly_guest_avatar');
      if (storedAvatar) {
          setCustomAvatar(storedAvatar);
      } else if (user?.photoURL) {
          setCustomAvatar(user.photoURL);
      }
  }, [userName, user]);

  // IDLE DETECTION (AFK)
  useEffect(() => {
      if (!user || !activeRoom) return;

      let idleTimer: any; // Using any to avoid namespace issues in browser
      const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

      const resetIdle = () => {
          if (isAway) {
              setIsAway(false);
              // Update status back to whatever it was? Or just update 'isAway' flag
              groupSessionService.updatePresence(activeRoom.id, user.uid, { isAway: false });
          }
          clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
              setIsAway(true);
              groupSessionService.updatePresence(activeRoom.id, user.uid, { isAway: true });
          }, IDLE_TIMEOUT);
      };

      // Events to track
      window.addEventListener('mousemove', resetIdle);
      window.addEventListener('keydown', resetIdle);
      window.addEventListener('scroll', resetIdle);
      window.addEventListener('click', resetIdle);

      resetIdle(); // Init

      return () => {
          clearTimeout(idleTimer);
          window.removeEventListener('mousemove', resetIdle);
          window.removeEventListener('keydown', resetIdle);
          window.removeEventListener('scroll', resetIdle);
          window.removeEventListener('click', resetIdle);
      };
  }, [activeRoom?.id, user?.uid, isAway]);

  // 1. Subscribe to Room List (Lobby)
  useEffect(() => {
    const unsubscribe = groupSessionService.subscribeToRooms((fetchedRooms) => {
        // Find the system room from the database, if it exists
        const jeeRoomFromDb = fetchedRooms.find(r => r.id === 'system-jee-lounge');
        // Filter out any other system rooms to avoid duplicates if logic changes later
        const userRooms = fetchedRooms.filter(r => !r.isSystem && r.id !== 'system-jee-lounge');

        const defaultJeeRoom: StudyRoom = {
            id: 'system-jee-lounge',
            name: 'JEE Main Room',
            topic: 'General JEE/NEET',
            description: 'A public lounge for all JEE and NEET aspirants to study together.',
            color: 'indigo',
            activeCount: 0, 
            isSystem: true,
            isPrivate: false,
            createdAt: 0, 
            status: 'active'
        };

        if (jeeRoomFromDb) {
            // If it exists in DB, use that version (with correct activeCount) and put it first
            setRooms([jeeRoomFromDb, ...userRooms]);
        } else {
            // If it doesn't exist in DB, prepend our virtual version
            setRooms([defaultJeeRoom, ...userRooms]);
        }
    });
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Participants (Room Active)
  useEffect(() => {
      if (!activeRoom) return;
      const unsubscribe = groupSessionService.subscribeToRoom(activeRoom.id, (parts) => {
          setParticipants(parts);
      });
      return () => unsubscribe();
  }, [activeRoom]);

  // 3. Subscribe to Room Status (Shutdown detection)
  useEffect(() => {
      if (!activeRoom) return;
      const unsubscribe = groupSessionService.subscribeToRoomStatus(activeRoom.id, (updatedRoom) => {
          // If updatedRoom is null, it means it's deleted.
          if (!updatedRoom) {
              setActiveRoom((current) => {
                  if (current && current.id === activeRoom.id) {
                      setParticipants([]);
                      setIsMyTimerRunning(false);
                      if (current.createdBy !== user?.uid) {
                          alert("The host has closed this room.");
                      }
                      return null;
                  }
                  return null;
              });
          }
      });
      return () => unsubscribe();
  }, [activeRoom?.id, user?.uid]);

  // Handle Joining a Room
  const handleJoin = async (room: StudyRoom) => {
      if (!user) {
          onLogin();
          return;
      }

      if (room.isSystem) {
        // System rooms are created on-demand when first joined.
        try {
            const roomRef = doc(db, 'rooms', room.id);
            const roomSnap = await getDoc(roomRef);
            if (!roomSnap.exists()) {
                await setDoc(roomRef, {
                    name: room.name,
                    topic: room.topic,
                    description: room.description,
                    color: room.color,
                    createdBy: 'system',
                    createdAt: Date.now(),
                    isSystem: true,
                    isPrivate: false,
                    activeCount: 0, // Will be incremented by updatePresence
                    status: 'active',
                });
            }
        } catch (error) {
            console.error("Failed to ensure system room exists:", error);
            alert("Could not join the default room. Please try again.");
            return;
        }
    }

      setActiveRoom(room);
      groupSessionService.updatePresence(room.id, user.uid, {
          uid: user.uid,
          displayName: displayName || 'Anonymous',
          photoURL: customAvatar || undefined,
          status: 'idle',
          subject: mySubject,
          lastActivity: Date.now(),
          isAway: false
      }, true);
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!joinCode.trim()) return;
      if (!user) {
          onLogin();
          return;
      }

      setIsJoiningByCode(true);
      // Logic to handle full URLs if pasted
      let roomId = joinCode.trim();
      if (roomId.includes('?room=')) {
          roomId = roomId.split('?room=')[1];
      }

      const room = await groupSessionService.getRoom(roomId);
      setIsJoiningByCode(false);

      if (room) {
          handleJoin(room);
          setShowJoinCodeModal(false);
          setJoinCode('');
      } else {
          alert("Room not found. Check the code and try again.");
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

  // Handle Leaving
  const handleLeave = () => {
      if (activeRoom && user) {
          groupSessionService.leaveRoom(activeRoom.id, user.uid);
      }
      setActiveRoom(null);
      setParticipants([]);
      setIsMyTimerRunning(false);
      setZenMode(false);
  };

  const handleKick = useCallback((targetUserId: string) => {
      if (!activeRoom || !isAmHost) return;
      if (confirm("Are you sure you want to kick this user?")) {
          groupSessionService.leaveRoom(activeRoom.id, targetUserId);
      }
  }, [activeRoom, isAmHost]);

  const handleShutdown = useCallback(async () => {
      if (!activeRoom || !isAmHost) return;
      if (confirm("Shut down the room? All participants will be disconnected.")) {
          const roomToDelete = activeRoom.id;
          setActiveRoom(null); 
          setParticipants([]);
          setIsMyTimerRunning(false);
          setZenMode(false);

          try {
              await groupSessionService.deleteRoom(roomToDelete);
          } catch (e) {
              console.error("Shutdown failed (room might still exist):", e);
          }
      }
  }, [activeRoom, isAmHost]);

  // Handle Reactions
  const handleReactionToUser = async (targetUid: string, emoji: string) => {
      if (!activeRoom || !user) return;
      await groupSessionService.sendReaction(activeRoom.id, targetUid, emoji, displayName || 'Friend');
  };

  const toggleMyTimer = () => {
    if (!user || !activeRoom) return;
  
    const newStatus = isMyTimerRunning ? 'idle' : 'focus';
    const now = Date.now();
  
    const updates: Partial<StudyParticipant> = {
      status: newStatus,
      subject: mySubject,
      lastActivity: now,
      intention: newStatus === 'focus' ? (myIntention || 'Focusing') : ''
    };
  
    // --- STOPPING ---
    if (isMyTimerRunning) {
      // 1. Task Check
      if (linkedTaskId) {
        const task = targets.find(t => t.id === linkedTaskId);
        if (task && !task.completed) {
          const done = window.confirm(`Did you complete the task: "${task.text}"?`);
          if (done) {
            onCompleteTask(linkedTaskId, true);
            setLinkedTaskId(null);
            setMyIntention('');
          }
        }
      }
  
      // 2. Accumulate Time (if start time exists)
      let sessionMins = 0;
      if (myFocusStartTimeRef.current) {
        const elapsedMs = now - myFocusStartTimeRef.current;
        if (elapsedMs > 60000) { // Only count if > 1 min
          sessionMins = Math.floor(elapsedMs / 60000);
          
          const me = participants.find(p => p.uid === user.uid);
          const currentAccumulated = me?.accumulatedFocusTime || 0;
          updates.accumulatedFocusTime = currentAccumulated + sessionMins;
        }
      }
  
      // 3. Trigger Reflection
      setLastSessionDuration(sessionMins);
      if (sessionMins > 0) {
        setShowReflection(true);
      }
  
      // 4. Reset local timer state
      myFocusStartTimeRef.current = null;
  
    // --- STARTING ---
    } else {
      myFocusStartTimeRef.current = now;
    }
  
    setIsMyTimerRunning(!isMyTimerRunning);
    groupSessionService.updatePresence(activeRoom.id, user.uid, updates);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newRoomData.name || !newRoomData.topic) return;
      
      if (!user) {
          onLogin();
          return;
      }

      setIsCreating(true);
      setCreateError(null);
      try {
          // 1. Create the room and get the ID
          const newRoomId = await groupSessionService.createRoom({
              name: newRoomData.name,
              topic: newRoomData.topic,
              description: newRoomData.description,
              color: newRoomData.color,
              createdBy: user.uid,
              isPrivate: newRoomData.isPrivate
          });

          // 2. Immediately Join the room
          // We construct a temporary room object to join immediately without waiting for subscription
          const newRoom: StudyRoom = {
              id: newRoomId,
              name: newRoomData.name,
              topic: newRoomData.topic,
              description: newRoomData.description,
              color: newRoomData.color,
              createdBy: user.uid,
              isPrivate: newRoomData.isPrivate,
              activeCount: 0,
              createdAt: Date.now(),
              status: 'active'
          };

          setShowCreateModal(false);
          setNewRoomData({ name: '', topic: '', description: '', color: 'indigo', isPrivate: false });
          
          handleJoin(newRoom);

          // 3. Show share modal immediately for private rooms so user can copy the link
          if (newRoomData.isPrivate) {
              setTimeout(() => setShowShareModal(true), 500); // Slight delay for smoother transition
          }

      } catch (err: any) {
          console.error("Failed to create room:", err);
          let msg = "Failed to create room.";
          if (err.code === 'permission-denied') {
              msg = "Permission denied. Please check your internet or database rules.";
          } else if (err.message) {
              msg = err.message;
          }
          setCreateError(msg);
      } finally {
          setIsCreating(false);
      }
  };

  const handleLinkTask = (task: Target) => {
      setLinkedTaskId(task.id);
      if (!myIntention) setMyIntention(task.text);
      setShowMiniPlanner(false);
  };

  const handleReflectionConfirm = (rating: number) => {
      // In a real app, we might save this rating to a user's session history
      // For now, just close the modal
      setShowReflection(false);
  };

  // --- RENDER: LOBBY ---
  if (!activeRoom) {
      return (
          // ... (Lobby code remains mostly same, just ensuring correct renders) ...
          <div className="space-y-8 animate-in fade-in duration-500 pb-20">
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                  <div>
                      <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Focus Lounge</h2>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1 font-bold">Join others for accountability</p>
                      
                      <div className="flex items-center gap-3 mt-4 bg-white/50 dark:bg-slate-800/50 p-2 pr-4 rounded-xl border border-slate-200 dark:border-white/5 w-fit backdrop-blur-sm shadow-sm">
                          <div 
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm relative group cursor-pointer overflow-hidden"
                            onClick={() => avatarInputRef.current?.click()}
                          >
                              {customAvatar ? (
                                  <img src={customAvatar} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                  displayName.charAt(0).toUpperCase()
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Camera size={14} className="text-white" />
                              </div>
                          </div>
                          <input 
                              type="file" 
                              ref={avatarInputRef} 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (ev) => {
                                          const res = ev.target?.result as string;
                                          setCustomAvatar(res);
                                          localStorage.setItem('trackly_guest_avatar', res);
                                      };
                                      reader.readAsDataURL(file);
                                  }
                              }}
                          />
                          
                          <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Joining as</span>
                              <input 
                                  type="text"
                                  value={displayName}
                                  onChange={(e) => setDisplayName(e.target.value)}
                                  className="bg-transparent outline-none font-bold text-sm text-slate-900 dark:text-white w-32 focus:w-48 transition-all placeholder:text-slate-500"
                                  placeholder="Enter Name"
                              />
                          </div>
                          <Pencil size={12} className="text-slate-400 opacity-50" />
                      </div>
                  </div>
                  <div className="flex gap-2">
                      <button 
                          onClick={() => setShowJoinCodeModal(true)}
                          className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl font-bold uppercase text-xs tracking-wider transition-all active:scale-95"
                      >
                          <LinkIcon size={16} /> Have Code?
                      </button>
                      <button 
                          onClick={() => user ? setShowCreateModal(true) : onLogin()}
                          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                      >
                          <Plus size={16} /> Create Lounge
                      </button>
                  </div>
              </div>

              {/* Room Grid */}
              {rooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl text-center opacity-60">
                      <Users size={48} className="text-slate-400 mb-4" />
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">No active lounges</p>
                      <p className="text-xs text-slate-400 mt-1">Be the first to start a study session!</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rooms.map(room => {
                          const isHost = room.createdBy === user?.uid;
                          const canEnter = !room.isPrivate || isHost;
                          
                          return (
                              <Card 
                                  key={room.id}
                                  className={`group hover:border-indigo-500/30 cursor-pointer transition-all active:scale-[0.98] p-6 relative overflow-hidden flex flex-col justify-between min-h-[180px] ${!canEnter ? 'opacity-80' : ''}`}
                                  onClick={() => {
                                      if (!canEnter) {
                                          setShowJoinCodeModal(true);
                                      } else {
                                          handleJoin(room);
                                      }
                                  }}
                              >
                                  <div className={`absolute top-0 right-0 p-16 rounded-bl-full opacity-5 bg-${room.color}-500 transition-transform group-hover:scale-150`} />
                                  
                                  <div className="relative z-10">
                                      <div className="flex justify-between items-start mb-4">
                                          <div className={`p-3 rounded-2xl bg-${room.color}-500/10 text-${room.color}-500`}>
                                              {room.isPrivate ? <Lock size={24} /> : room.isSystem ? <Star size={24}/> : <Users size={24} />}
                                          </div>
                                          <div className="flex items-center gap-2">
                                              {isHost && (
                                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                                      Mine
                                                  </span>
                                              )}
                                              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                  {room.activeCount || 0} Online
                                              </span>
                                          </div>
                                      </div>
                                      <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                                          {room.name}
                                          {room.isPrivate && <span className="text-[9px] bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase">Private</span>}
                                      </h3>
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                          {room.topic}
                                      </p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                                          {room.description || 'No description provided.'}
                                      </p>
                                  </div>
                                  
                                  <div className="relative z-10 mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                                      <div className={`flex items-center gap-2 text-xs font-bold transition-transform ${!canEnter ? 'text-slate-400' : 'text-indigo-500 group-hover:translate-x-1'}`}>
                                          <span>{!canEnter ? 'Requires Code' : 'Enter Room'}</span>
                                          {!canEnter ? <Lock size={14} /> : <ArrowLeft size={14} className="rotate-180" />}
                                      </div>
                                  </div>
                              </Card>
                          );
                      })}
                  </div>
              )}

              {/* Join Code Modal */}
              {showJoinCodeModal && createPortal(
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
                      <div className="bg-white dark:bg-[#0f172a] w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-white/10 animate-in zoom-in-95 duration-200">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Join by Link</h3>
                              <button onClick={() => setShowJoinCodeModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                                  <X size={18} className="text-slate-500" />
                              </button>
                          </div>
                          <form onSubmit={handleJoinByCode} className="space-y-4">
                              <p className="text-xs text-slate-500 dark:text-slate-400">Enter a Room ID or paste an invite link below to join a private lounge.</p>
                              <input 
                                  type="text" required placeholder="Paste Room ID or Link"
                                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                  value={joinCode}
                                  onChange={e => setJoinCode(e.target.value)}
                              />
                              <button 
                                  type="submit" 
                                  disabled={isJoiningByCode || !joinCode}
                                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
                              >
                                  {isJoiningByCode ? 'Locating Room...' : 'Join Room'}
                              </button>
                          </form>
                      </div>
                  </div>,
                  document.body
              )}

              {/* Create Room Modal */}
              {showCreateModal && createPortal(
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
                      <div className="bg-white dark:bg-[#0f172a] w-full max-w-md rounded-3xl shadow-2xl p-6 border border-white/10 animate-in zoom-in-95 duration-200">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Focus Lounge</h3>
                              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                                  <X size={18} className="text-slate-500" />
                              </button>
                          </div>
                          
                          {createError && (
                              <div className="p-3 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-xs text-rose-500">
                                  <AlertTriangle size={14} />
                                  <span>{createError}</span>
                              </div>
                          )}
                          
                          <form onSubmit={handleCreateRoom} className="space-y-4">
                              <div>
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Room Name</label>
                                  <input 
                                      type="text" required placeholder="e.g., Late Night Grind"
                                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                      value={newRoomData.name}
                                      onChange={e => setNewRoomData({...newRoomData, name: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Subject / Topic</label>
                                  <input 
                                      type="text" required placeholder="e.g., Physics Mechanics"
                                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                      value={newRoomData.topic}
                                      onChange={e => setNewRoomData({...newRoomData, topic: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 block">Description</label>
                                  <textarea 
                                      placeholder="What are we studying?"
                                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                                      value={newRoomData.description}
                                      onChange={e => setNewRoomData({...newRoomData, description: e.target.value})}
                                  />
                              </div>
                              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors" onClick={() => setNewRoomData(p => ({...p, isPrivate: !p.isPrivate}))}>
                                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${newRoomData.isPrivate ? 'bg-indigo-500 border-indigo-500' : 'border-slate-400'}`}>
                                      {newRoomData.isPrivate && <CheckCircle2 size={12} className="text-white" />}
                                  </div>
                                  <div>
                                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Private Room (Invite Only)</span>
                                      <span className="text-[10px] text-slate-500 block">Hidden from lobby. Share link to join.</span>
                                  </div>
                                  <Lock size={16} className="ml-auto text-slate-400" />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block flex items-center gap-2"><Palette size={12}/> Color Theme</label>
                                  <div className="flex gap-2">
                                      {['indigo', 'emerald', 'rose', 'orange', 'blue', 'purple'].map(c => (
                                          <button
                                              key={c}
                                              type="button"
                                              onClick={() => setNewRoomData({...newRoomData, color: c})}
                                              className={`w-8 h-8 rounded-full border-2 transition-all ${newRoomData.color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                              style={{ backgroundColor: `var(--color-${c}-500, ${c})` }} 
                                          >
                                              <div className={`w-full h-full rounded-full bg-${c}-500`} /> 
                                          </button>
                                      ))}
                                  </div>
                              </div>
                              
                              <button 
                                  type="submit" 
                                  disabled={isCreating}
                                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20 transition-all active:scale-95 mt-4 disabled:opacity-50"
                              >
                                  {isCreating ? 'Creating...' : 'Launch Lounge'}
                              </button>
                          </form>
                      </div>
                  </div>,
                  document.body
              )}
          </div>
      );
  }

  // --- RENDER: ACTIVE ROOM ---
  return (
      <div className={`h-[calc(100vh-100px)] flex flex-col animate-in fade-in zoom-in-95 duration-300 ${zenMode ? 'fixed inset-0 z-[150] bg-black h-screen p-6' : ''}`}>
          
          {/* Room Header (Hidden in Zen Mode) */}
          {!zenMode && (
              <div className="flex justify-between items-center mb-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-white/5 shrink-0">
                  <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl bg-${activeRoom.color}-500/10 text-${activeRoom.color}-500`}>
                          {activeRoom.isPrivate ? <Lock size={20} /> : activeRoom.isSystem ? <Star size={20}/> : <Users size={20} />}
                      </div>
                      <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              {activeRoom.name}
                              {activeRoom.isPrivate && <span className="text-[9px] bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase">Private</span>}
                          </h3>
                          <div className="flex items-center gap-2">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  {participants.length} Online
                              </p>
                              <span className="text-[10px] text-slate-400">•</span>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{activeRoom.topic}</p>
                          </div>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      {/* Share Button */}
                      <button 
                          onClick={() => setShowShareModal(true)}
                          className="flex items-center gap-2 px-3 py-2 text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-all relative overflow-hidden"
                          title="Invite Link"
                      >
                          <Share2 size={16} />
                          <span className="text-[10px] font-bold uppercase tracking-wide hidden md:inline">Invite</span>
                      </button>

                      {/* Mobile Leaderboard Toggle */}
                      <button 
                          onClick={() => setShowMobileLeaderboard(true)}
                          className="lg:hidden p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-colors relative"
                      >
                          <Trophy size={20} />
                          {participants.some(p => (p.accumulatedFocusTime || 0) > 0) && (
                              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-slate-900" />
                          )}
                      </button>

                      {isAmHost && !activeRoom.isSystem && (
                          <button 
                              onClick={handleShutdown}
                              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                              title="Shutdown Room"
                          >
                              <Power size={20} />
                          </button>
                      )}
                      <button 
                          onClick={handleLeave}
                          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                          title="Leave Room"
                      >
                          <LogOut size={20} />
                      </button>
                  </div>
              </div>
          )}

          {/* Main Content Area: Grid + Leaderboard */}
          <div className="flex flex-1 overflow-hidden gap-6 mb-6">
              
              {/* Participants Grid */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pb-32">
                  {participants.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-40">
                          <Users size={32} className="text-slate-400 mb-2" />
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Room is empty</p>
                      </div>
                  ) : (
                      <div className={`grid gap-3 transition-all ${zenMode ? 'grid-cols-2 md:grid-cols-4 opacity-50 hover:opacity-100' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'}`}>
                          {participants.map(p => (
                              <ParticipantCard 
                                  key={p.uid} 
                                  participant={p} 
                                  isMe={user?.uid === p.uid}
                                  isHost={activeRoom.createdBy === p.uid}
                                  canKick={isAmHost && p.uid !== user?.uid}
                                  onKick={() => handleKick(p.uid)}
                                  onReaction={(emoji) => handleReactionToUser(p.uid, emoji)}
                              />
                          ))}
                      </div>
                  )}
              </div>

              {/* Desktop Leaderboard Sidebar */}
              {!zenMode && (
                  <div className="hidden lg:block w-72 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm shrink-0">
                      <Leaderboard participants={participants} />
                  </div>
              )}
          </div>

          {/* Bottom Control Bar */}
          <div className={`
              ${zenMode ? 'fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl' : 'absolute bottom-4 left-4 right-4'} 
              bg-white/90 dark:bg-black/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 z-50
          `}>
              {/* Progress Line (Active State Only) */}
              {isMyTimerRunning && (
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-slate-800">
                      <div className="h-full bg-indigo-500 animate-pulse w-full" />
                  </div>
              )}

              <div className="p-4 flex flex-col gap-4">
                  {/* Row 1: Configurations */}
                  {!isMyTimerRunning && (
                      <div className="flex justify-between items-center px-1">
                          <div className="flex gap-2">
                              {['Physics', 'Chemistry', 'Maths', 'Biology'].map(sub => (
                                  <button
                                      key={sub}
                                      onClick={() => setMySubject(sub as any)}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                          mySubject === sub 
                                          ? 'ring-2 ring-offset-2 ring-offset-black ring-indigo-500 scale-110' 
                                          : 'opacity-50 hover:opacity-100'
                                      }`}
                                      title={sub}
                                  >
                                      <div className={`w-full h-full rounded-full ${
                                          sub === 'Physics' ? 'bg-blue-500' : 
                                          sub === 'Chemistry' ? 'bg-orange-500' : 
                                          sub === 'Maths' ? 'bg-rose-500' : 'bg-emerald-500'
                                      }`} />
                                  </button>
                              ))}
                          </div>
                          
                          <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 rounded-2xl p-2 px-4 border border-slate-200 dark:border-white/10 shadow-sm">
                              <div className="flex flex-col items-center">
                                  <input 
                                      type="number" 
                                      min="0" 
                                      max="12"
                                      value={Math.floor(myDuration / 60)}
                                      onChange={(e) => {
                                          const val = parseInt(e.target.value);
                                          if (!isNaN(val)) {
                                              const h = Math.max(0, Math.min(12, val));
                                              const m = myDuration % 60;
                                              setMyDuration(Math.max(1, (h * 60) + m));
                                          }
                                      }}
                                      className="w-12 bg-transparent text-center font-mono text-xl font-bold text-slate-900 dark:text-white outline-none appearance-none p-0 border-b-2 border-transparent focus:border-indigo-500 transition-colors"
                                      placeholder="0"
                                  />
                                  <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Hrs</span>
                              </div>
                              <span className="text-xl font-bold text-slate-300 dark:text-slate-600 pb-4">:</span>
                              <div className="flex flex-col items-center">
                                  <input 
                                      type="number" 
                                      min="0" 
                                      max="59"
                                      value={myDuration % 60}
                                      onChange={(e) => {
                                          const val = parseInt(e.target.value);
                                          if (!isNaN(val)) {
                                              const m = Math.max(0, Math.min(59, val));
                                              const h = Math.floor(myDuration / 60);
                                              setMyDuration(Math.max(1, (h * 60) + m));
                                          }
                                      }}
                                      className="w-12 bg-transparent text-center font-mono text-xl font-bold text-slate-900 dark:text-white outline-none appearance-none p-0 border-b-2 border-transparent focus:border-indigo-500 transition-colors"
                                      placeholder="00"
                                  />
                                  <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Mins</span>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* Row 2: Actions */}
                  <div className="flex items-center gap-3">
                      {!isMyTimerRunning && (
                          <button 
                              onClick={() => setShowMiniPlanner(true)}
                              className={`
                                  p-3 rounded-2xl transition-all flex-shrink-0
                                  ${linkedTaskId 
                                      ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50' 
                                      : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                  }
                              `}
                          >
                              {linkedTaskId ? <CheckCircle2 size={20} /> : <ListTodo size={20} />}
                          </button>
                      )}

                      <div className="flex-1 relative">
                          {isMyTimerRunning ? (
                              <div className="flex justify-between items-center h-full px-2">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider mb-0.5">Focusing On</span>
                                    <span className="text-sm font-bold text-white truncate block">{myIntention || mySubject}</span>
                                  </div>
                                  <span className="text-lg font-mono font-bold text-white">{formatTime(myLiveTime)}</span>
                              </div>
                          ) : (
                              <input 
                                  type="text" 
                                  placeholder="What is your goal? (e.g. Rotational Motion)"
                                  className="w-full bg-transparent border-b border-slate-700 pb-2 text-sm font-medium text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-colors"
                                  value={myIntention}
                                  onChange={(e) => setMyIntention(e.target.value)}
                              />
                          )}
                      </div>

                      <div className="flex items-center gap-3">
                          {/* Zen Mode Toggle (Only visible when running) */}
                          {isMyTimerRunning && (
                              <button 
                                  onClick={() => setZenMode(!zenMode)}
                                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
                              >
                                  {zenMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                              </button>
                          )}

                          <button
                              onClick={toggleMyTimer}
                              className={`
                                  h-12 px-6 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 font-bold uppercase text-xs tracking-wider gap-2
                                  ${isMyTimerRunning 
                                      ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20' 
                                      : 'bg-white text-slate-900 hover:bg-slate-200 shadow-white/10'
                                  }
                              `}
                          >
                              {isMyTimerRunning ? (
                                  <>
                                      <Square size={16} fill="currentColor" /> Stop
                                  </>
                              ) : (
                                  <>
                                      <Play size={16} fill="currentColor" /> Start
                                  </>
                              )}
                          </button>
                      </div>
                  </div>
              </div>
          </div>

          {/* Share Modal */}
          {showShareModal && createPortal(
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-[#0f172a] w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-white/10 animate-in zoom-in-95 duration-200">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Invite Others</h3>
                          <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                              <X size={18} className="text-slate-500" />
                          </button>
                      </div>
                      
                      <div className="p-4 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/10 mb-4">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Room Link</p>
                          <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
                              <span className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate flex-1">
                                  {window.location.origin}{window.location.pathname}?room={activeRoom.id}
                              </span>
                          </div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/10 mb-6">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Room Code</p>
                          <p className="text-xl font-mono font-bold text-slate-900 dark:text-white text-center tracking-widest">{activeRoom.id}</p>
                      </div>

                      <button 
                          onClick={handleCopyLink}
                          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                          {shareCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                          {shareCopied ? 'Link Copied!' : 'Copy Link'}
                      </button>
                  </div>
              </div>,
              document.body
          )}

          {/* Mobile Leaderboard Sheet */}
          {showMobileLeaderboard && createPortal(
              <div className="fixed inset-0 z-[200] flex items-end justify-center p-4">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileLeaderboard(false)} />
                  <div className="relative bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 max-h-[60vh] flex flex-col">
                      <div className="flex justify-between items-center mb-4 shrink-0">
                          <h3 className="text-lg font-bold text-white">Leaderboard</h3>
                          <button onClick={() => setShowMobileLeaderboard(false)} className="p-2 bg-white/5 rounded-full text-slate-400"><X size={16}/></button>
                      </div>
                      <div className="flex-1 overflow-hidden min-h-0">
                          <Leaderboard participants={participants} />
                      </div>
                  </div>
              </div>,
              document.body
          )}

          {/* Mini Planner Sheet */}
          {showMiniPlanner && createPortal(
              <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-4">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMiniPlanner(false)} />
                  <div className="relative bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-bold text-white">Select Task</h3>
                          <button onClick={() => setShowMiniPlanner(false)} className="p-2 bg-white/5 rounded-full text-slate-400"><X size={16}/></button>
                      </div>
                      
                      <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                          {targets.filter(t => !t.completed).length === 0 ? (
                              <p className="text-center text-slate-500 text-xs py-8">No pending tasks found.</p>
                          ) : (
                              targets.filter(t => !t.completed).map(task => (
                                  <button 
                                      key={task.id}
                                      onClick={() => handleLinkTask(task)}
                                      className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors flex items-center gap-3 group"
                                  >
                                      <div className={`w-3 h-3 rounded-full border-2 border-slate-500 group-hover:border-indigo-500`} />
                                      <span className="text-sm text-slate-300 group-hover:text-white truncate">{task.text}</span>
                                  </button>
                              ))
                          )}
                      </div>
                  </div>
              </div>,
              document.body
          )}

          {/* Reflection Modal */}
          <ReflectionModal 
              isOpen={showReflection}
              onClose={() => setShowReflection(false)}
              onConfirm={handleReflectionConfirm}
              duration={lastSessionDuration}
          />
      </div>
  );
};
