
import React, { useState, useEffect, memo } from 'react';
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
  Pencil
} from 'lucide-react';
import { StudyParticipant, StudyRoom } from '../types';
import { groupSessionService } from '../services/groupSessionService';
import { Card } from './Card';
import { User } from 'firebase/auth';

interface VirtualLibraryProps {
  user: User | null;
  userName: string | null;
  onLogin: () => void;
  isPro: boolean;
}

// --- SUB-COMPONENT: Participant Card (Calculates its own progress) ---
const ParticipantCard = memo(({ participant, isMe }: { participant: StudyParticipant, isMe: boolean }) => {
    const [progress, setProgress] = useState(0);
    const [timeLeftStr, setTimeLeftStr] = useState('');

    useEffect(() => {
        if (participant.status !== 'focus' || !participant.focusEndTime || !participant.focusDuration) {
            setProgress(0);
            setTimeLeftStr('');
            return;
        }

        const totalMs = participant.focusDuration * 60 * 1000;
        const startTime = participant.focusEndTime - totalMs;

        const tick = () => {
            const now = Date.now();
            
            if (now >= participant.focusEndTime!) {
                setProgress(100);
                setTimeLeftStr('Done');
                return;
            }

            const elapsed = now - startTime;
            const pct = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
            setProgress(pct);

            const remainingSec = Math.ceil((participant.focusEndTime! - now) / 1000);
            const m = Math.floor(remainingSec / 60);
            const s = remainingSec % 60;
            setTimeLeftStr(`${m}:${s.toString().padStart(2, '0')}`);
        };

        tick(); // Initial
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [participant.status, participant.focusEndTime, participant.focusDuration]);

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
            relative overflow-hidden rounded-2xl p-4 border transition-all duration-300
            ${isMe ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/5'}
        `}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 border border-white/10">
                        {participant.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[80px]">{participant.displayName}</p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                            {participant.status === 'focus' ? participant.subject : 'On Break'}
                        </p>
                    </div>
                </div>
                {participant.status === 'focus' && (
                    <div className="p-1.5 rounded-lg bg-black/20 border border-white/5">
                        {getSubjectIcon(participant.subject)}
                    </div>
                )}
            </div>

            {participant.status === 'focus' ? (
                <div className="space-y-1.5">
                    <div className="flex justify-between items-end">
                        <span className="text-[10px] text-indigo-500 dark:text-indigo-300 font-bold uppercase tracking-wider">Focusing</span>
                        <span className="text-[10px] font-mono text-slate-600 dark:text-white">{timeLeftStr}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-indigo-500 transition-all duration-1000 ease-linear" 
                            style={{ width: `${progress}%` }} 
                        />
                    </div>
                </div>
            ) : (
                <div className="h-8 flex items-center justify-center opacity-50">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1">
                        <Coffee size={12} /> Idle
                    </span>
                </div>
            )}
        </div>
    );
});

export const VirtualLibrary: React.FC<VirtualLibraryProps> = ({ user, userName, onLogin, isPro }) => {
  const [activeRoom, setActiveRoom] = useState<StudyRoom | null>(null);
  const [participants, setParticipants] = useState<StudyParticipant[]>([]);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  
  // Custom Name State
  const [displayName, setDisplayName] = useState(userName || 'Guest');

  // Create Room Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: '', topic: '', description: '', color: 'indigo' });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // My Control State
  const [mySubject, setMySubject] = useState<'Physics'|'Chemistry'|'Maths'|'Biology'|'Other'>('Physics');
  const [myDuration, setMyDuration] = useState(25);
  const [isMyTimerRunning, setIsMyTimerRunning] = useState(false);

  // Update display name when user logs in/out
  useEffect(() => {
      if (userName) setDisplayName(userName);
  }, [userName]);

  // 1. Subscribe to Room List (Lobby)
  useEffect(() => {
      const unsubscribe = groupSessionService.subscribeToRooms((fetchedRooms) => {
          setRooms(fetchedRooms);
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

  // Handle Joining a Room
  const handleJoin = (room: StudyRoom) => {
      if (!user) {
          onLogin();
          return;
      }
      setActiveRoom(room);
      // Initial presence write (Join as Idle) - Pass `true` for isJoining to increment count
      groupSessionService.updatePresence(room.id, user.uid, {
          uid: user.uid,
          displayName: displayName || 'Anonymous',
          status: 'idle',
          subject: mySubject,
          lastActivity: Date.now()
      }, true);
  };

  // Handle Leaving
  const handleLeave = () => {
      if (activeRoom && user) {
          groupSessionService.leaveRoom(activeRoom.id, user.uid);
      }
      setActiveRoom(null);
      setParticipants([]);
      setIsMyTimerRunning(false);
  };

  // Handle Timer Start/Stop
  const toggleMyTimer = () => {
      if (!user || !activeRoom) return;

      const newStatus = isMyTimerRunning ? 'break' : 'focus';
      setIsMyTimerRunning(!isMyTimerRunning);

      const now = Date.now();
      const updates: any = {
          status: newStatus,
          subject: mySubject,
          lastActivity: now
      };

      if (newStatus === 'focus') {
          updates.focusDuration = myDuration;
          updates.focusEndTime = now + (myDuration * 60 * 1000); 
      }

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
          await groupSessionService.createRoom({
              name: newRoomData.name,
              topic: newRoomData.topic,
              description: newRoomData.description,
              color: newRoomData.color,
              createdBy: user.uid
          });
          setShowCreateModal(false);
          setNewRoomData({ name: '', topic: '', description: '', color: 'indigo' });
      } catch (err: any) {
          console.error("Failed to create room:", err);
          let msg = "Failed to create room.";
          if (err.code === 'permission-denied') {
              msg = "Permission denied. Please checking your internet or database rules.";
          } else if (err.message) {
              msg = err.message;
          }
          setCreateError(msg);
      } finally {
          setIsCreating(false);
      }
  };

  // --- RENDER: LOBBY ---
  if (!activeRoom) {
      return (
          <div className="space-y-8 animate-in fade-in duration-500 pb-20">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                  <div>
                      <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Focus Lounge</h2>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1 font-bold">Join others for accountability</p>
                      
                      <div className="flex items-center gap-3 mt-4 bg-white/50 dark:bg-slate-800/50 p-2 pr-4 rounded-xl border border-slate-200 dark:border-white/5 w-fit backdrop-blur-sm shadow-sm">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                              {displayName.charAt(0).toUpperCase()}
                          </div>
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
                  <button 
                      onClick={() => user ? setShowCreateModal(true) : onLogin()}
                      className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                  >
                      <Plus size={16} /> Create Lounge
                  </button>
              </div>

              {rooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl text-center opacity-60">
                      <Users size={48} className="text-slate-400 mb-4" />
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">No active lounges</p>
                      <p className="text-xs text-slate-400 mt-1">Be the first to start a study session!</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rooms.map(room => (
                          <Card 
                              key={room.id}
                              className="group hover:border-indigo-500/30 cursor-pointer transition-all active:scale-[0.98] p-6 relative overflow-hidden flex flex-col justify-between min-h-[180px]"
                              onClick={() => handleJoin(room)}
                          >
                              <div className={`absolute top-0 right-0 p-16 rounded-bl-full opacity-5 bg-${room.color}-500 transition-transform group-hover:scale-150`} />
                              
                              <div className="relative z-10">
                                  <div className="flex justify-between items-start mb-4">
                                      <div className={`p-3 rounded-2xl bg-${room.color}-500/10 text-${room.color}-500`}>
                                          <Users size={24} />
                                      </div>
                                      <div className="flex items-center gap-2">
                                          {room.createdBy === user?.uid && (
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
                                  <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1">
                                      {room.name}
                                  </h3>
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                      {room.topic}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                                      {room.description || 'No description provided.'}
                                  </p>
                              </div>
                              
                              <div className="relative z-10 mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
                                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform">
                                      <span>Enter Room</span>
                                      <ArrowLeft size={14} className="rotate-180" />
                                  </div>
                              </div>
                          </Card>
                      ))}
                  </div>
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
                              <div>
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block flex items-center gap-2"><Palette size={12}/> Color Theme</label>
                                  <div className="flex gap-2">
                                      {['indigo', 'emerald', 'rose', 'orange', 'blue', 'purple'].map(c => (
                                          <button
                                              key={c}
                                              type="button"
                                              onClick={() => setNewRoomData({...newRoomData, color: c})}
                                              className={`w-8 h-8 rounded-full border-2 transition-all ${newRoomData.color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                              style={{ backgroundColor: `var(--color-${c}-500, ${c})` }} // Fallback for simple colors
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

  // --- RENDER: ROOM ---
  return (
      <div className="h-[calc(100vh-100px)] flex flex-col animate-in fade-in zoom-in-95 duration-300">
          
          {/* Room Header */}
          <div className="flex justify-between items-center mb-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-${activeRoom.color}-500/10 text-${activeRoom.color}-500`}>
                      <Users size={20} />
                  </div>
                  <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{activeRoom.name}</h3>
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
              <button 
                  onClick={handleLeave}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                  title="Leave Room"
              >
                  <LogOut size={20} />
              </button>
          </div>

          {/* Participants Grid */}
          <div className="flex-1 overflow-y-auto min-h-0 mb-6 custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {participants.map(p => (
                      <ParticipantCard 
                          key={p.uid} 
                          participant={p} 
                          isMe={user?.uid === p.uid} 
                      />
                  ))}
              </div>
              
              {participants.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                      <Users size={32} className="text-slate-400 mb-2" />
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Room is empty</p>
                  </div>
              )}
          </div>

          {/* My Controls Footer */}
          <div className="bg-slate-900 dark:bg-black/40 backdrop-blur-xl border border-slate-800 dark:border-white/10 p-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-4">
                  {/* Controls */}
                  <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                          {['Physics', 'Chemistry', 'Maths', 'Biology'].map(sub => (
                              <button
                                  key={sub}
                                  onClick={() => !isMyTimerRunning && setMySubject(sub as any)}
                                  disabled={isMyTimerRunning}
                                  className={`
                                      flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all
                                      ${mySubject === sub 
                                          ? 'bg-indigo-500 border-indigo-500 text-white' 
                                          : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500'
                                      }
                                      ${isMyTimerRunning ? 'opacity-50 cursor-not-allowed' : ''}
                                  `}
                              >
                                  {sub.slice(0,1)}
                              </button>
                          ))}
                      </div>
                      <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-500 uppercase w-12">Time</span>
                          <input 
                              type="range" min="5" max="60" step="5"
                              value={myDuration}
                              onChange={(e) => setMyDuration(parseInt(e.target.value))}
                              disabled={isMyTimerRunning}
                              className="flex-1 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer disabled:opacity-50 accent-indigo-500"
                          />
                          <span className="text-xs font-mono font-bold text-white w-8 text-right">{myDuration}m</span>
                      </div>
                  </div>

                  {/* Play Button */}
                  <button
                      onClick={toggleMyTimer}
                      className={`
                          w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95
                          ${isMyTimerRunning 
                              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20' 
                              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                          }
                      `}
                  >
                      {isMyTimerRunning ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                  </button>
              </div>
          </div>
      </div>
  );
};
