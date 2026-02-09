import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { Users, LogIn, User as UserIcon, Plus, ArrowLeft, Loader2, Coffee, Brain, Trophy, Crown, Info, Lock, Copy, Check, X, Shield, Globe } from 'lucide-react';
import { User } from 'firebase/auth';
import { StudyParticipant, StudyRoom, Target as TargetType } from '../types';
import { groupSessionService } from '../services/groupSessionService';
import { Card } from './Card';
import { GoogleIcon } from './GoogleIcon';
import { AnimatePresence, motion } from 'framer-motion';

interface VirtualLibraryProps {
  user: User | null;
  userName: string | null;
  onLogin: () => void;
  isPro: boolean;
  targets: TargetType[];
  onCompleteTask: (id: string, completed: boolean) => void;
  currentRoom: StudyRoom | null;
  setCurrentRoom: (room: StudyRoom | null) => void;
}

const ParticipantCard = memo(({ participant, isCurrentUser }: { participant: StudyParticipant, isCurrentUser: boolean }) => {
    const photoURL = participant.photoURL;
    const displayName = participant.displayName || 'Anonymous';
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (participant.status !== 'focus' || !participant.focusEndTime) {
            setTimeLeft('');
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, participant.focusEndTime! - now);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [participant.status, participant.focusEndTime]);

    const getStatusInfo = () => {
        switch(participant.status) {
            case 'focus': return { icon: <Brain size={12}/>, text: timeLeft, color: 'text-indigo-500 bg-indigo-500/10'};
            case 'break': return { icon: <Coffee size={12}/>, text: 'Break', color: 'text-emerald-500 bg-emerald-500/10'};
            default: return { icon: <UserIcon size={12}/>, text: 'Idle', color: 'text-slate-500 bg-slate-500/10'};
        }
    };
    const statusInfo = getStatusInfo();

    return (
        <Card className={`flex flex-col gap-4 p-4 transition-all duration-300 transform-gpu ${isCurrentUser ? 'border-indigo-500/30' : ''}`}>
            <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                    {photoURL ? (
                        <img src={photoURL} alt={displayName} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <UserIcon size={24} className="text-slate-400" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-theme-text truncate flex items-center gap-2">{displayName} {isCurrentUser && <span className="text-[9px] font-bold text-indigo-500">(You)</span>}</p>
                    <p className="text-xs text-theme-text-secondary font-bold uppercase tracking-wider">{participant.subject}</p>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
                    {statusInfo.icon}
                    <span>{statusInfo.text}</span>
                </div>
            </div>
            {participant.intention && (
                 <div className="text-xs text-theme-text-secondary bg-theme-bg-tertiary p-2 rounded-lg border border-theme-border italic">
                    "{participant.intention}"
                 </div>
            )}
        </Card>
    );
});

const Leaderboard = ({ participants, currentUser }: { participants: StudyParticipant[], currentUser: User | null }) => {
    const sortedParticipants = useMemo(() => {
        return [...participants].sort((a, b) => (b.dailyFocusTime || 0) - (a.dailyFocusTime || 0));
    }, [participants]);

    const formatFocusTime = (seconds?: number) => {
        if (!seconds || seconds < 60) return "0m";
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    return (
        <Card className="h-full">
            <div className="group relative flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-theme-text-secondary uppercase tracking-widest flex items-center gap-2">
                    <Trophy size={16} className="text-amber-500" /> Daily Leaderboard
                </h3>
                <Info size={12} className="text-theme-text-secondary cursor-help" />
                <div className="absolute bottom-full mb-2 left-0 w-max max-w-xs p-3 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Leaderboard resets daily. To ensure fair play:
                    <ul className="list-disc pl-3 mt-1 space-y-0.5 font-normal">
                        <li>Timer auto-pauses after 5 mins of inactivity.</li>
                        <li>Timer pauses if you switch tabs.</li>
                        <li>Max session length is 120 minutes.</li>
                    </ul>
                    <div className="absolute top-full left-4 w-2 h-2 bg-slate-800 rotate-45 -mt-1" />
                </div>
            </div>

            <div className="space-y-2">
                {sortedParticipants.map((p, index) => (
                    <div key={p.uid} className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${p.uid === currentUser?.uid ? 'bg-theme-accent/10' : ''}`}>
                        <div className="flex items-center justify-center w-6 font-bold text-xs text-theme-text-secondary">
                            {index === 0 ? <Crown size={16} className="text-amber-400" /> : `#${index + 1}`}
                        </div>
                        <img src={p.photoURL || `https://ui-avatars.com/api/?name=${p.displayName}&background=random`} alt={p.displayName} className="w-8 h-8 rounded-full" />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-theme-text truncate text-sm">{p.displayName}</p>
                        </div>
                        <div className="font-mono font-bold text-theme-accent text-sm">
                            {formatFocusTime(p.dailyFocusTime)}
                        </div>
                    </div>
                ))}
                {sortedParticipants.length === 0 && (
                     <div className="text-center py-10 text-theme-text-secondary text-xs">No one is focusing yet!</div>
                )}
            </div>
        </Card>
    );
};

const VirtualLibrary: React.FC<VirtualLibraryProps> = ({ user, onLogin, targets, onCompleteTask, currentRoom, setCurrentRoom }) => {
  const [view, setView] = useState<'lobby' | 'room'>('lobby');
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [participants, setParticipants] = useState<StudyParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCodeEntryModal, setShowCodeEntryModal] = useState<StudyRoom | null>(null);
  const [showRoomCodeDisplayModal, setShowRoomCodeDisplayModal] = useState<{ room: StudyRoom, code: string } | null>(null);

  // Heartbeat timer
  const heartbeatRef = useRef<any>(null);
  
  useEffect(() => {
    setView(currentRoom ? 'room' : 'lobby');
  }, [currentRoom]);

  // --- Data Fetching & Subscriptions ---
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsub = groupSessionService.subscribeToRooms(setRooms);
    setIsLoading(false);
    return () => unsub();
  }, [user]);

  // --- Room Management ---
  const handleJoinRoom = async (roomId: string) => {
      if (!user) return;
      setIsLoading(true);
      const roomData = await groupSessionService.getRoom(roomId);
      if(roomData) {
          await groupSessionService.joinSession(roomId, { uid: user.uid, displayName: user.displayName || 'User', photoURL: user.photoURL }, 'Other');
          setCurrentRoom(roomData);
      }
      setIsLoading(false);
  };
  
  const handleLeaveRoom = useCallback(async () => {
      if (user && currentRoom) {
          await groupSessionService.leaveRoom(currentRoom.id, user.uid);
      }
      setCurrentRoom(null);
      setParticipants([]);
  }, [user, currentRoom, setCurrentRoom]);

  // --- In-Room useEffect ---
  useEffect(() => {
    if (view !== 'room' || !user || !currentRoom) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return;
    }

    const HEARTBEAT_INTERVAL = 30000; // 30 seconds

    // Initial presence update
    groupSessionService.updatePresence(currentRoom.id, user.uid, {});

    // Heartbeat to keep user "online"
    heartbeatRef.current = setInterval(() => {
        groupSessionService.updatePresence(currentRoom.id, user.uid, {});
    }, HEARTBEAT_INTERVAL);
    
    // Subscribe to room participants
    const unsubParticipants = groupSessionService.subscribeToRoom(currentRoom.id, (parts) => {
        const now = Date.now();
        const active = parts.filter(p => (now - p.lastActivity) < 60000);
        setParticipants(active);
    });

    const unsubRoomStatus = groupSessionService.subscribeToRoomStatus(currentRoom.id, (roomData) => {
        if (!roomData) handleLeaveRoom();
    });

    // Cleanup on unmount or view change
    return () => {
      clearInterval(heartbeatRef.current);
      unsubParticipants();
      unsubRoomStatus();
      if(currentRoom && user) {
        groupSessionService.leaveRoom(currentRoom.id, user.uid);
      }
    };
  }, [view, user, currentRoom, handleLeaveRoom]);

  const handleCreateRoom = async (newRoomData: { name: string; description: string; topic: string; isPrivate: boolean }) => {
    if (!user) return;
    setIsLoading(true);
    try {
        const { roomId, roomCode } = await groupSessionService.createRoom({
            ...newRoomData,
            createdBy: user.uid,
            color: 'slate', // default color
            isSystem: false,
        });
        
        setShowCreateModal(false);
        
        if (newRoomData.isPrivate && roomCode) {
            const room = await groupSessionService.getRoom(roomId);
            if (room) {
                setShowRoomCodeDisplayModal({ room, code: roomCode });
            }
        } else {
            await handleJoinRoom(roomId);
        }
    } catch (e) {
        console.error("Failed to create room", e);
    } finally {
        setIsLoading(false);
    }
  };

  const handleJoinPrivateRoom = async (roomId: string, code: string) => {
    if (!code.trim() || code.length !== 6) return false;
    setIsLoading(true);
    const isValid = await groupSessionService.verifyRoomCode(roomId, code);
    if (isValid) {
        setShowCodeEntryModal(null);
        await handleJoinRoom(roomId);
        setIsLoading(false);
        return true;
    }
    setIsLoading(false);
    return false;
  };
  
  const handleRoomClick = (room: StudyRoom) => {
    if (room.isPrivate) {
        setShowCodeEntryModal(room);
    } else {
        handleJoinRoom(room.id);
    }
  };

  if (!user) {
      return (
          <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center p-6 animate-in fade-in duration-500">
            <div className="p-4 bg-indigo-500/10 rounded-full mb-6 border border-indigo-500/20">
                <LogIn size={48} className="text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold text-theme-text mb-2">Join the Focus Lounge</h2>
            <p className="text-theme-text-secondary mb-8 max-w-sm">
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
        <AnimatePresence>
            {showCreateModal && (
                <CreateRoomModal 
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateRoom}
                />
            )}
            {showCodeEntryModal && (
                <CodeEntryModal
                    room={showCodeEntryModal}
                    onClose={() => setShowCodeEntryModal(null)}
                    onJoin={handleJoinPrivateRoom}
                    isLoading={isLoading}
                />
            )}
            {showRoomCodeDisplayModal && (
                <RoomCodeDisplayModal
                    data={showRoomCodeDisplayModal}
                    onClose={() => setShowRoomCodeDisplayModal(null)}
                    onJoin={() => {
                        handleJoinRoom(showRoomCodeDisplayModal.room.id);
                        setShowRoomCodeDisplayModal(null);
                    }}
                />
            )}
        </AnimatePresence>

        <div>
            <h2 className="text-3xl font-bold text-theme-text tracking-tight flex items-center gap-3">
                <Users className="text-indigo-400" /> Focus Lounge
            </h2>
            <p className="text-xs text-theme-accent uppercase tracking-widest mt-1 font-bold">
                Study live with others
            </p>
        </div>

        {view === 'lobby' ? (
            <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-theme-text-secondary uppercase tracking-widest">Public Rooms</h3>
                    <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-theme-accent text-theme-text-on-accent rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg hover:opacity-90 transition-opacity active:scale-95">
                        <Plus size={16} /> Create Room
                    </button>
                 </div>
                 {isLoading ? (
                     <div className="text-center py-10"><Loader2 className="animate-spin text-theme-accent mx-auto"/></div>
                 ) : rooms.length === 0 ? (
                     <div className="text-center py-10 text-theme-text-secondary">No public rooms available. Create one!</div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rooms.map(room => (
                            <Card key={room.id} onClick={() => handleRoomClick(room)} className="hover:border-indigo-500/50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-theme-text">{room.name}</h4>
                                        <p className="text-xs text-theme-text-secondary mt-1">{room.topic}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-theme-text-secondary font-bold">
                                        {room.isPrivate && <Lock size={12} className="text-amber-500" />}
                                        <Users size={14} /> {room.activeCount}
                                    </div>
                                </div>
                                <p className="text-xs mt-4 text-theme-text-secondary">{room.description}</p>
                            </Card>
                        ))}
                    </div>
                 )}
            </div>
        ) : (
            currentRoom && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <button onClick={handleLeaveRoom} className="flex items-center gap-2 text-sm text-theme-text-secondary font-bold hover:text-theme-text transition-colors">
                            <ArrowLeft size={16}/> Back to Lobby
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        <div className="lg:col-span-2">
                           <Card>
                                <h3 className="text-lg font-bold text-theme-text">{currentRoom.name}</h3>
                                <p className="text-sm text-theme-text-secondary mb-4">{currentRoom.topic}</p>
                                {participants.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {participants.map(p => (
                                            <ParticipantCard key={p.uid} participant={p} isCurrentUser={p.uid === user.uid} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-16 text-theme-text-secondary">
                                        <p className="text-sm">You're the first one here!</p>
                                    </div>
                                )}
                            </Card>
                        </div>
                        <div className="lg:col-span-1">
                            <Leaderboard participants={participants} currentUser={user} />
                        </div>
                    </div>
                </div>
            )
        )}
    </div>
  );
};

// --- MODAL COMPONENTS ---

const CreateRoomModal = ({ isOpen, onClose, onCreate }: { isOpen: boolean, onClose: () => void, onCreate: (data: any) => void }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [topic, setTopic] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!name.trim()) return;
        onCreate({ name, description, topic, isPrivate });
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-lg shadow-2xl">
              <form onSubmit={handleSubmit}>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-theme-text">Create a Study Room</h3>
                      <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-theme-text-secondary"><X size={18} /></button>
                  </div>
                  <div className="space-y-4">
                      <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Room Name (e.g., Physics Olympiad Prep)" required className="w-full p-3 bg-theme-bg-tertiary border border-theme-border rounded-xl text-sm" />
                      <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Main Topic (e.g., Electromagnetism)" className="w-full p-3 bg-theme-bg-tertiary border border-theme-border rounded-xl text-sm" />
                      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description..." className="w-full p-3 bg-theme-bg-tertiary border border-theme-border rounded-xl text-sm min-h-[80px]" />
                      <div className="flex items-center justify-between p-3 bg-theme-bg-tertiary rounded-xl border border-theme-border">
                          <div className="flex items-center gap-3">
                              {isPrivate ? <Shield size={16} className="text-amber-500" /> : <Globe size={16} className="text-emerald-500" />}
                              <div>
                                  <p className="text-sm font-bold text-theme-text">{isPrivate ? 'Private Room' : 'Public Room'}</p>
                                  <p className="text-[10px] text-theme-text-secondary">{isPrivate ? 'Requires a code to join' : 'Visible to everyone'}</p>
                              </div>
                          </div>
                          <button type="button" onClick={() => setIsPrivate(!isPrivate)} className={`w-12 h-6 rounded-full relative transition-colors ${isPrivate ? 'bg-theme-accent' : 'bg-slate-300 dark:bg-slate-600'}`}>
                              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-0.5'}`} />
                          </button>
                      </div>
                  </div>
                  <div className="mt-6">
                      <button type="submit" disabled={!name.trim()} className="w-full py-3 bg-theme-accent text-theme-text-on-accent rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:opacity-90 disabled:opacity-50">Create Room</button>
                  </div>
              </form>
          </Card>
        </div>
    );
};

const CodeEntryModal = ({ room, onClose, onJoin, isLoading }: { room: StudyRoom, onClose: () => void, onJoin: (roomId: string, code: string) => Promise<boolean>, isLoading: boolean }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const success = await onJoin(room.id, code);
        if(!success) {
            setError('Invalid Code. Please try again.');
            setCode('');
        }
    };

    return (
         <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-sm text-center">
                <button type="button" onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-theme-text-secondary"><X size={18} /></button>
                <Lock size={24} className="mx-auto text-amber-500 mb-4" />
                <h3 className="text-lg font-bold text-theme-text">Enter Access Code</h3>
                <p className="text-xs text-theme-text-secondary mb-4">This room is private. Please enter the 6-digit code.</p>
                <form onSubmit={handleSubmit}>
                    <input ref={inputRef} type="text" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))} className="w-full text-center text-4xl font-mono tracking-[0.5em] bg-theme-bg-tertiary border border-theme-border rounded-xl p-4 mb-2" />
                    {error && <p className="text-xs text-rose-500 animate-in fade-in">{error}</p>}
                    <button type="submit" disabled={code.length !== 6 || isLoading} className="mt-4 w-full py-3 bg-theme-accent text-theme-text-on-accent rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:opacity-90 disabled:opacity-50">
                        {isLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Join Room'}
                    </button>
                </form>
            </Card>
        </div>
    )
};

const RoomCodeDisplayModal = ({ data, onClose, onJoin }: { data: { room: StudyRoom, code: string }, onClose: () => void, onJoin: () => void }) => {
    const [isCopied, setIsCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(data.code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-sm text-center">
                <button type="button" onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-theme-text-secondary"><X size={18} /></button>
                <Shield size={24} className="mx-auto text-emerald-500 mb-4" />
                <h3 className="text-lg font-bold text-theme-text">Private Room Created!</h3>
                <p className="text-xs text-theme-text-secondary mb-4">Share this code with your friends to let them join.</p>

                <div className="bg-theme-bg-tertiary p-4 rounded-xl border border-theme-border mb-4">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-theme-text-secondary">Room Code</p>
                    <p className="text-5xl font-mono font-bold tracking-[0.2em] text-theme-text my-2">{data.code}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleCopy} className="w-full py-3 bg-slate-200 dark:bg-white/10 text-theme-text rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                        {isCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                        {isCopied ? 'Copied!' : 'Copy Code'}
                    </button>
                    <button onClick={onJoin} className="w-full py-3 bg-theme-accent text-theme-text-on-accent rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg">Join Room</button>
                </div>
            </Card>
        </div>
    )
};

export default VirtualLibrary;
