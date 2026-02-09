import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { Users, Wifi, LogIn, User as UserIcon, Plus, ChevronRight, X, ArrowLeft, Loader2, Search, Coffee, Brain, Timer, Check, ListChecks } from 'lucide-react';
import { User } from 'firebase/auth';
import { StudyParticipant, StudyRoom, Target as TargetType } from '../types';
import { groupSessionService } from '../services/groupSessionService';
import { Card } from './Card';
import { GoogleIcon } from './GoogleIcon';
import { STREAM_SUBJECTS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface VirtualLibraryProps {
  user: User | null;
  userName: string | null;
  onLogin: () => void;
  isPro: boolean;
  targets: TargetType[];
  onCompleteTask: (id: string, completed: boolean) => void;
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

const VirtualLibrary: React.FC<VirtualLibraryProps> = ({ user, onLogin, targets, onCompleteTask }) => {
  const [view, setView] = useState<'lobby' | 'room'>('lobby');
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [participants, setParticipants] = useState<StudyParticipant[]>([]);
  const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFocusModal, setShowFocusModal] = useState(false);

  // Heartbeat timer
  const heartbeatRef = useRef<any>(null);

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
          setView('room');
      }
      setIsLoading(false);
  };
  
  const handleLeaveRoom = useCallback(async () => {
      if (user && currentRoom) {
          await groupSessionService.leaveRoom(currentRoom.id, user.uid);
      }
      setView('lobby');
      setCurrentRoom(null);
      setParticipants([]);
  }, [user, currentRoom]);

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
        // Filter out stale participants (inactive for > 1 minute)
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
      if(view === 'room') { // only leave if we are still in room view
        groupSessionService.leaveRoom(currentRoom.id, user.uid);
      }
    };
  }, [view, user, currentRoom, handleLeaveRoom]);

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
            {showFocusModal && <div className="fixed inset-0 z-[100] bg-black/50" />}
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
                    <button onClick={() => {}} className="flex items-center gap-2 px-4 py-2 bg-theme-accent text-theme-text-on-accent rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg hover:opacity-90 transition-opacity active:scale-95">
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
                            <Card key={room.id} onClick={() => handleJoinRoom(room.id)} className="hover:border-indigo-500/50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-theme-text">{room.name}</h4>
                                        <p className="text-xs text-theme-text-secondary mt-1">{room.topic}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-theme-text-secondary font-bold">
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
                        <div>
                            <button onClick={() => {}} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider">
                                Start Focus
                            </button>
                        </div>
                    </div>
                    <Card>
                        <h3 className="text-lg font-bold text-theme-text">{currentRoom.name}</h3>
                        <p className="text-sm text-theme-text-secondary mb-4">{currentRoom.topic}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {participants.map(p => (
                                <ParticipantCard key={p.uid} participant={p} isCurrentUser={p.uid === user.uid} />
                            ))}
                        </div>
                    </Card>
                </div>
            )
        )}
    </div>
  );
};

export default VirtualLibrary;
