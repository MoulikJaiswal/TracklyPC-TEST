
import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, Friend, FriendRequest, PresenceState } from '../types';
import { db, rtdb } from '../firebase';
import { collection, query, where, getDocs, getDoc, doc, onSnapshot, setDoc, deleteDoc, writeBatch, runTransaction } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { User as UserIcon, Users, UserPlus, Mail, Search, Copy, Check, X, Brain, Coffee, Loader2, Info, ArrowRight, Sparkles, Clock, Calendar, CalendarDays, BookOpen, Flame } from 'lucide-react';
import { Card } from './Card';
import { GoogleIcon } from './GoogleIcon';
import { AnimatePresence, motion } from 'framer-motion';
import { STATS_MAINTENANCE_MODE } from '../constants';

interface StudyBuddyProps {
  user: User | null;
  userProfile: UserProfile | null;
}

const StudyBuddySetup = ({ user, userProfile }: { user: User, userProfile: UserProfile | null }) => {
  const [username, setUsername] = useState(userProfile?.displayName?.split(' ')[0] || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 15) {
      setError('Username must be 3-15 characters long.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setError('Use only letters, numbers, and underscores.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const usernameLower = trimmedUsername.toLowerCase();
      const usernameRef = doc(db, 'studyBuddyUsernames', usernameLower);
      const userRef = doc(db, 'users', user.uid);

      await runTransaction(db, async (transaction) => {
        const usernameDoc = await transaction.get(usernameRef);
        if (usernameDoc.exists()) {
          throw new Error('Username is already taken.');
        }

        let friendCode = '';
        let isUnique = false;
        for (let i = 0; i < 10; i++) { // Try 10 times to find a unique code
          const discriminator = Math.floor(1000 + Math.random() * 9000);
          const potentialCode = `${trimmedUsername}#${discriminator}`;
          const friendCodeRef = doc(db, 'friendCodes', potentialCode);
          const friendCodeDoc = await transaction.get(friendCodeRef);
          if (!friendCodeDoc.exists()) {
            friendCode = potentialCode;
            isUnique = true;
            transaction.set(friendCodeRef, {
              uid: user.uid,
              displayName: trimmedUsername,
              photoURL: userProfile?.photoURL || null
            });
            break;
          }
        }

        if (!isUnique) {
          throw new Error('Could not generate a unique friend code. Please try a different username.');
        }

        transaction.set(usernameRef, { uid: user.uid });
        transaction.update(userRef, {
          studyBuddyUsername: trimmedUsername,
          friendCode: friendCode
        });
      });

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-4">
      <Card className="w-full max-w-md">
        <div className="p-4 bg-indigo-500/10 rounded-full mb-6 border border-indigo-500/20 inline-block">
          <Sparkles size={40} className="text-indigo-500" />
        </div>
        <h2 className="text-2xl font-bold text-theme-text mb-2">Create Your Profile</h2>
        <p className="text-theme-text-secondary mb-8 max-w-sm mx-auto text-sm">
          Choose a unique username to generate your friend code and start connecting with others.
        </p>
        <form onSubmit={handleCreateProfile} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            className="w-full p-4 bg-theme-bg-tertiary border border-theme-border rounded-xl text-center font-bold text-lg text-theme-text"
          />
          {error && <p className="text-xs text-rose-500">{error}</p>}
          <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-theme-accent text-theme-text-on-accent rounded-xl text-sm font-bold uppercase tracking-widest shadow-lg hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50">
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <>Create Profile & Get Code <ArrowRight size={16} /></>}
          </button>
        </form>
      </Card>
    </div>
  );
};

interface FriendCardProps {
  friend: Friend;
  presence: PresenceState | null;
  onClick: (friend: Friend, liveProfile: UserProfile | null) => void;
}

const FriendCard: React.FC<FriendCardProps> = ({ friend, presence, onClick }) => {
  const displayName = friend.displayName;
  const photoURL = friend.photoURL;

  const getStatus = () => {
    if (!presence || !presence.isOnline) {
      return { text: 'Offline', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800', icon: <div className="w-2 h-2 rounded-full bg-slate-500" /> };
    }
    switch (presence.state) {
      case 'focus':
        return { text: `Focus: ${presence.subject || '...'}`, color: 'text-indigo-500 bg-indigo-500/10', icon: <Brain size={12} /> };
      case 'break':
        return { text: 'On Break', color: 'text-emerald-500 bg-emerald-500/10', icon: <Coffee size={12} /> };
      default:
        return { text: 'Idle', color: 'text-blue-500 bg-blue-500/10', icon: <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> };
    }
  };

  const status = getStatus();

  return (
    <Card
      className="p-4 cursor-pointer border border-theme-border/50 hover:border-theme-accent hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(var(--theme-accent-rgb),0.15)] transition-all duration-300 transform hover:-translate-y-1.5 hover:scale-[1.02] group relative overflow-hidden"
      onClick={() => onClick(friend, null)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-theme-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="flex items-center gap-4 relative z-10">
        <img src={photoURL || `https://ui-avatars.com/api/?name=${displayName}&background=random`} alt={displayName} className="w-12 h-12 rounded-full object-cover" />
        <div className="flex-1 min-w-0 flex justify-between items-center">
          <div>
            <p className="font-bold text-theme-text truncate">{displayName}</p>
            <div className={`mt-1 flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full w-fit ${status.color}`}>
              {status.icon}
              <span>{status.text}</span>
            </div>
          </div>
          {/* Daily focus time removed for maintenance */}
        </div>
      </div>
    </Card>
  );
};

const StudyBuddy: React.FC<StudyBuddyProps> = ({ user, userProfile }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [presences, setPresences] = useState<Record<string, PresenceState>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Add Friend State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<UserProfile | null | 'loading' | 'not_found' | 'self' | 'already_friend' | 'request_sent'>(null);
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  const [isCopied, setIsCopied] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<{ friend: Friend, profile: UserProfile | null } | null>(null);

  // Fetch initial data
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const friendsUnsub = onSnapshot(collection(db, `users/${user.uid}/friends`),
      (snapshot) => {
        const friendList = snapshot.docs.map(doc => doc.data() as Friend);
        setFriends(friendList);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching friends:", error);
        setIsLoading(false);
      }
    );

    const requestsUnsub = onSnapshot(collection(db, `users/${user.uid}/friendRequests`), (snapshot) => {
      const requestList = snapshot.docs.map(doc => doc.data() as FriendRequest);
      setRequests(requestList);
    });

    return () => {
      friendsUnsub();
      requestsUnsub();
    };
  }, [user]);

  // Sync profile to friendCode for searchability (Self-healing)
  useEffect(() => {
    if (user && userProfile?.friendCode) {
      const syncProfile = async () => {
        try {
          const codeRef = doc(db, 'friendCodes', userProfile.friendCode!);
          await setDoc(codeRef, {
            uid: user.uid,
            displayName: userProfile.studyBuddyUsername || userProfile.displayName || 'Anonymous',
            photoURL: userProfile.photoURL || null
          }, { merge: true });
        } catch (e) {
          console.error("Error syncing profile to friend code:", e);
        }
      };
      syncProfile();
    }
  }, [user, userProfile]);

  // Subscribe to friend presences
  useEffect(() => {
    if (friends.length === 0) {
      setPresences({});
      return;
    }

    const unsubscribers = friends.map(friend => {
      const presenceRef = ref(rtdb, `status/${friend.uid}`);
      return onValue(presenceRef, (snapshot) => {
        if (snapshot.exists()) {
          setPresences(prev => ({ ...prev, [friend.uid]: snapshot.val() as PresenceState }));
        }
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [friends]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !userProfile?.friendCode) return;
    setSearchResult('loading');

    const code = searchQuery.trim();

    if (code === userProfile.friendCode) {
      setSearchResult('self');
      return;
    }

    try {
      const codeRef = doc(db, 'friendCodes', code);
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists()) {
        setSearchResult('not_found');
        return;
      }

      const data = codeSnap.data();
      const targetUid = data.uid;

      if (friends.some(f => f.uid === targetUid)) {
        setSearchResult('already_friend');
        return;
      }
      if (sentRequests.includes(targetUid)) {
        setSearchResult('request_sent');
        return;
      }

      const resultProfile: UserProfile = {
        uid: targetUid,
        displayName: data.displayName || 'User',
        photoURL: data.photoURL || null,
        friendCode: code,
        studyBuddyUsername: data.displayName || 'User'
      };
      setSearchResult(resultProfile);

    } catch (error) {
      console.error("Search error:", error);
      setSearchResult('not_found');
    }
  };

  const handleSendRequest = async (targetUser: UserProfile) => {
    if (!user || !userProfile?.friendCode) return;
    const requestRef = doc(db, `users/${targetUser.uid}/friendRequests`, user.uid);

    await setDoc(requestRef, {
      uid: user.uid,
      displayName: userProfile.studyBuddyUsername || userProfile.displayName,
      photoURL: userProfile.photoURL,
      friendCode: userProfile.friendCode,
      timestamp: Date.now(),
    });
    setSentRequests(prev => [...prev, targetUser.uid]);
    setSearchResult('request_sent');
  };

  const handleRequest = async (requestor: FriendRequest, action: 'accept' | 'decline') => {
    if (!user || !userProfile?.friendCode) return;

    const batch = writeBatch(db);
    const myRequestRef = doc(db, `users/${user.uid}/friendRequests`, requestor.uid);
    batch.delete(myRequestRef);

    if (action === 'accept') {
      const myFriendRef = doc(db, `users/${user.uid}/friends`, requestor.uid);
      const theirFriendRef = doc(db, `users/${requestor.uid}/friends`, user.uid);

      batch.set(myFriendRef, {
        uid: requestor.uid,
        displayName: requestor.displayName,
        photoURL: requestor.photoURL,
        friendCode: requestor.friendCode,
      });

      batch.set(theirFriendRef, {
        uid: user.uid,
        displayName: userProfile?.studyBuddyUsername || userProfile?.displayName,
        photoURL: userProfile?.photoURL,
        friendCode: userProfile?.friendCode,
      });
    }

    await batch.commit();
  };

  const handleCopyCode = () => {
    if (!userProfile?.friendCode) return;
    navigator.clipboard.writeText(userProfile.friendCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center p-6 animate-in fade-in duration-500">
        <div className="p-4 bg-indigo-500/10 rounded-full mb-6 border border-indigo-500/20">
          <Users size={48} className="text-indigo-500" />
        </div>
        <h2 className="text-2xl font-bold text-theme-text mb-2">Study with Friends</h2>
        <p className="text-theme-text-secondary mb-8 max-w-sm">
          Sign in with Google to add friends, see their live study status, and stay motivated together.
        </p>
      </div>
    );
  }

  if (!userProfile?.studyBuddyUsername || !userProfile?.friendCode) {
    return <StudyBuddySetup user={user} userProfile={userProfile} />;
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-3xl font-bold text-theme-text tracking-tight flex items-center gap-3">
          <Users className="text-indigo-400" /> Study Buddy
        </h2>
        <p className="text-xs text-theme-accent uppercase tracking-widest mt-1 font-bold">
          Connect and stay motivated
        </p>
      </div>

      <div className="p-4 bg-theme-bg-tertiary rounded-2xl border border-theme-border flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-theme-text-secondary">Your Friend Code</p>
          <p className="text-lg font-mono font-bold text-theme-text">{userProfile.friendCode}</p>
        </div>
        <button onClick={handleCopyCode} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-theme-accent text-theme-text-on-accent rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg hover:opacity-90 transition-all active:scale-95">
          {isCopied ? <Check size={16} /> : <Copy size={16} />}
          {isCopied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>

      <div className="flex bg-theme-bg-tertiary p-1 rounded-xl border border-theme-border">
        <button onClick={() => setActiveTab('friends')} className={`relative flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'friends' ? 'bg-theme-card shadow-sm text-theme-text' : 'text-theme-text-secondary hover:text-theme-text'}`}>Friends</button>
        <button onClick={() => setActiveTab('requests')} className={`relative flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-theme-card shadow-sm text-theme-text' : 'text-theme-text-secondary hover:text-theme-text'}`}>
          Requests {requests.length > 0 && <span className="absolute top-1 right-2 w-4 h-4 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center">{requests.length}</span>}
        </button>
        <button onClick={() => setActiveTab('add')} className={`relative flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'add' ? 'bg-theme-card shadow-sm text-theme-text' : 'text-theme-text-secondary hover:text-theme-text'}`}>Add Friend</button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'friends' && (
            <div className="space-y-4">
              {isLoading ? <div className="text-center py-10"><Loader2 className="animate-spin text-theme-accent mx-auto" /></div> :
                friends.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {friends.map(friend => (
                      <FriendCard
                        key={friend.uid}
                        friend={friend}
                        presence={presences[friend.uid] || null}
                        onClick={(f, p) => setSelectedFriend({ friend: f, profile: p })}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 opacity-50 border-2 border-dashed border-theme-border rounded-2xl">
                    <Users size={40} className="mx-auto mb-4" />
                    <p className="text-sm font-bold">Your friends list is empty.</p>
                    <p className="text-xs mt-1">Add friends to see their live study status!</p>
                  </div>
                )}
            </div>
          )}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {requests.length > 0 ? (
                requests.map(req => (
                  <Card key={req.uid} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img src={req.photoURL || `https://ui-avatars.com/api/?name=${req.displayName}&background=random`} alt={req.displayName} className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="font-bold text-theme-text">{req.displayName}</p>
                        <p className="text-xs font-mono text-theme-text-secondary">{req.friendCode}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRequest(req, 'accept')} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><Check size={16} /></button>
                      <button onClick={() => handleRequest(req, 'decline')} className="p-2 bg-rose-500/10 text-rose-500 rounded-lg"><X size={16} /></button>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-16 opacity-50 border-2 border-dashed border-theme-border rounded-2xl">
                  <Mail size={40} className="mx-auto mb-4" />
                  <p className="text-sm font-bold">No pending friend requests.</p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'add' && (
            <div className="space-y-4">
              <Card className="p-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Enter Friend Code (e.g., User#1234)" className="flex-1 p-3 bg-theme-bg-tertiary border border-theme-border rounded-xl text-sm text-theme-text" />
                  <button type="submit" className="p-3 bg-theme-accent text-theme-text-on-accent rounded-xl"><Search size={20} /></button>
                </form>
              </Card>

              {searchResult && (
                <Card className="p-4">
                  {searchResult === 'loading' && <Loader2 className="animate-spin text-theme-accent mx-auto" />}
                  {searchResult === 'not_found' && <p className="text-center text-sm text-theme-text-secondary">User not found. Please check the code.</p>}
                  {searchResult === 'self' && <p className="text-center text-sm text-theme-text-secondary">You can't add yourself as a friend!</p>}
                  {searchResult === 'already_friend' && <p className="text-center text-sm text-theme-text-secondary">You are already friends with this user.</p>}
                  {searchResult === 'request_sent' && <p className="text-center text-sm text-emerald-500 flex items-center justify-center gap-2"><Check size={16} /> Friend request sent!</p>}

                  {typeof searchResult === 'object' && searchResult !== null && (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <img src={searchResult.photoURL || `https://ui-avatars.com/api/?name=${searchResult.displayName}&background=random`} alt={searchResult.displayName} className="w-10 h-10 rounded-full" />
                        <div>
                          <p className="font-bold text-theme-text">{searchResult.displayName}</p>
                          <p className="text-xs font-mono text-theme-text-secondary">{searchResult.friendCode}</p>
                        </div>
                      </div>
                      <button onClick={() => handleSendRequest(searchResult)} className="flex items-center gap-2 px-3 py-2 bg-theme-accent text-theme-text-on-accent rounded-xl text-xs font-bold uppercase tracking-wider">
                        <UserPlus size={16} /> Add
                      </button>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {selectedFriend && (
          <FriendStatsModal
            friend={selectedFriend.friend}
            profile={selectedFriend.profile}
            presence={presences[selectedFriend.friend.uid] || null}
            onClose={() => setSelectedFriend(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const FriendStatsModal = ({ friend, profile, presence, onClose }: { friend: Friend, profile: UserProfile | null, presence: PresenceState | null, onClose: () => void }) => {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'yearly'>('daily');
  const displayName = profile?.studyBuddyUsername || friend.displayName;
  const photoURL = profile?.photoURL || friend.photoURL;

  const formatTimeFull = (seconds?: number) => {
    if (!seconds) return '0h 0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatHoursOnly = (seconds?: number) => {
    if (!seconds) return '0 hrs';
    const h = (seconds / 3600).toFixed(1);
    return `${h} hrs`;
  };

  const getStatusFull = () => {
    if (!presence || !presence.isOnline) return { text: 'Currently Offline', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: <div className="w-2.5 h-2.5 rounded-full bg-slate-400" /> };
    switch (presence.state) {
      case 'focus': return { text: `Focusing on ${presence.subject || '...'}`, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', icon: <Brain size={16} className="animate-pulse" /> };
      case 'break': return { text: 'Taking a Break', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: <Coffee size={16} /> };
      default: return { text: 'Online (Idle)', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" /> };
    }
  };

  const status = getStatusFull();

  // Calculate active split based on selected timeframe
  const activeSplit = timeframe === 'daily' ? (presence?.dailySubjectSplit || {})
    : timeframe === 'weekly' ? (presence?.weeklySubjectSplit || {})
      : (presence?.yearlySubjectSplit || presence?.subjectSplit || {});

  // Calculate total focus time for percentages
  const totalSubjectSeconds = Object.values(activeSplit).reduce((a, b) => a + b, 0);

  // Premium color palette for subjects
  const subjectColors = [
    'bg-indigo-500 shadow-indigo-500/50', 'bg-rose-500 shadow-rose-500/50',
    'bg-emerald-500 shadow-emerald-500/50', 'bg-amber-500 shadow-amber-500/50',
    'bg-cyan-500 shadow-cyan-500/50', 'bg-purple-500 shadow-purple-500/50'
  ];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">

      {/* Background Glow Orb behind modal */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-theme-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <Card className="w-full max-w-md overflow-hidden flex flex-col relative border border-white/10 dark:border-white/5 bg-white/90 dark:bg-[#0f1117]/90 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.3)]">

        {/* Cover Photo / Header Gradient */}
        <div className="h-36 bg-gradient-to-br from-theme-accent/30 via-theme-accent/10 to-transparent w-full absolute top-0 left-0 -z-10" />
        <div className="absolute top-0 left-0 w-full h-36 bg-white/20 dark:bg-black/20 backdrop-blur-sm -z-10" />
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent absolute top-36 left-0 -z-10" />

        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-colors z-20"><X size={18} /></button>

        <div className="p-6 pt-12 flex flex-col items-center">
          {/* Avatar Profile Picture */}
          <div className="relative mb-3 group pt-4">
            <div className="absolute inset-0 bg-theme-accent/30 rounded-full blur-2xl scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-y-4" />
            <img src={photoURL || `https://ui-avatars.com/api/?name=${displayName}&background=random`} alt={displayName} className="w-28 h-28 rounded-full object-cover shadow-2xl border-[3px] border-white dark:border-[#1a1c23] relative z-10 transition-transform duration-500 group-hover:scale-105" />
            {presence?.isOnline && <div className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 border-[3px] border-white dark:border-[#1a1c23] rounded-full z-20 shadow-lg" />}
          </div>

          {/* Name and ID */}
          <h3 className="text-2xl font-black text-theme-text tracking-tight mb-1 drop-shadow-sm">{displayName}</h3>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 mb-6">
            <Sparkles size={12} className="text-theme-accent/70" />
            <p className="text-[11px] font-mono font-medium text-theme-text-secondary">{friend.friendCode}</p>
          </div>

          {/* Current Status Badge */}
          <div className={`w-full flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border backdrop-blur-md ${status.bg} ${status.border} ${status.color} mb-8 shadow-sm`}>
            {status.icon}
            <span className="font-bold text-[13px] tracking-wide uppercase">{status.text}</span>
          </div>

          {/* Main Stats Grid - Glassmorphism floating cards */}
          <div className="w-full grid grid-cols-3 gap-3 mb-8">
            <div
              onClick={() => setTimeframe('daily')}
              className={`backdrop-blur-md p-4 rounded-3xl border flex flex-col items-center justify-center text-center group transition-all duration-300 cursor-pointer ${timeframe === 'daily' ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-500/30'}`}>
              <Clock size={22} className={`mb-2 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-transform ${timeframe === 'daily' ? 'text-emerald-400 scale-110' : 'text-emerald-500 group-hover:scale-110'}`} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-theme-text-secondary mb-0.5 opacity-80">Today</p>
              <p className="text-lg font-black text-theme-text tracking-tight">{STATS_MAINTENANCE_MODE ? '--h --m' : formatTimeFull(presence?.dailyFocusTime)}</p>
            </div>
            <div
              onClick={() => setTimeframe('weekly')}
              className={`backdrop-blur-md p-4 rounded-3xl border flex flex-col items-center justify-center text-center group transition-all duration-300 cursor-pointer ${timeframe === 'weekly' ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-500/30'}`}>
              <CalendarDays size={22} className={`mb-2 drop-shadow-[0_0_10px_rgba(99,102,241,0.4)] transition-transform ${timeframe === 'weekly' ? 'text-indigo-400 scale-110' : 'text-indigo-500 group-hover:scale-110'}`} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-theme-text-secondary mb-0.5 opacity-80">This Week</p>
              <p className="text-lg font-black text-theme-text tracking-tight">{STATS_MAINTENANCE_MODE ? '-- hrs' : formatHoursOnly(presence?.weeklyFocusTime)}</p>
            </div>
            <div
              onClick={() => setTimeframe('yearly')}
              className={`backdrop-blur-md p-4 rounded-3xl border flex flex-col items-center justify-center text-center group transition-all duration-300 cursor-pointer ${timeframe === 'yearly' ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/10 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/10 hover:border-amber-500/30'}`}>
              <Flame size={22} className={`mb-2 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)] transition-transform ${timeframe === 'yearly' ? 'text-amber-400 scale-110' : 'text-amber-500 group-hover:scale-110'}`} />
              <p className="text-[10px] font-bold uppercase tracking-widest text-theme-text-secondary mb-0.5 opacity-80">This Year</p>
              <p className="text-lg font-black text-theme-text tracking-tight">{STATS_MAINTENANCE_MODE ? '-- hrs' : formatHoursOnly(presence?.yearlyFocusTime ?? (presence?.subjectSplit ? Object.values(presence.subjectSplit).reduce((a, b) => a + b, 0) : 0))}</p>
            </div>
          </div>

          {/* Subject Split Section - Premium Look */}
          <div className="w-full space-y-4">
            <div className="flex items-center gap-2 mb-3 pl-1">
              <div className="p-1.5 bg-theme-accent/10 rounded-lg text-theme-accent">
                <BookOpen size={14} />
              </div>
              <h4 className="text-xs font-black text-theme-text uppercase tracking-widest">Subject Breakdown</h4>
            </div>

            {(STATS_MAINTENANCE_MODE || !activeSplit || Object.keys(activeSplit).length === 0) ? (
              <div className="text-center py-8 bg-black/5 dark:bg-white/5 rounded-3xl border border-black/10 dark:border-white/10 border-dashed backdrop-blur-sm">
                <p className="text-sm font-bold text-theme-text-secondary">{STATS_MAINTENANCE_MODE ? 'Stats Paused for Maintenance' : `No subjects tracked ${timeframe === 'daily' ? 'today' : timeframe === 'weekly' ? 'this week' : 'this year'}.`}</p>
                <p className="text-[11px] text-theme-text-secondary/70 mt-1">{STATS_MAINTENANCE_MODE ? 'Detailed breakdowns are temporarily disabled.' : "Their studying stats will appear here."}</p>
              </div>
            ) : (
              <div className="space-y-4 p-5 bg-black/5 dark:bg-white/5 rounded-3xl border border-black/5 dark:border-white/10 backdrop-blur-sm shadow-inner overflow-hidden relative">
                {/* Subtle background pattern for the subject split card */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }} />

                {Object.entries(activeSplit)
                  .sort(([, a], [, b]) => b - a) // Sort by most time requested
                  .slice(0, 5) // Top 5 subjects
                  .map(([subject, seconds], index) => {
                    const percentage = totalSubjectSeconds > 0 ? (seconds / totalSubjectSeconds) * 100 : 0;
                    const colorClass = subjectColors[index % subjectColors.length];

                    return (
                      <div key={subject} className="relative z-10 group">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-sm font-bold text-theme-text truncate group-hover:text-theme-accent transition-colors">{subject}</span>
                          <span className="text-xs font-mono font-bold text-theme-text-secondary bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md">{formatTimeFull(seconds)}</span>
                        </div>
                        <div className="w-full h-3 bg-black/10 dark:bg-black/40 overflow-hidden rounded-full shadow-inner relative">
                          <div
                            className={`absolute top-0 left-0 h-full ${colorClass} rounded-full transition-all duration-1000 ease-out`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Overlay to block stats during maintenance */}
          {STATS_MAINTENANCE_MODE && (
            <div className="absolute inset-0 bg-white/60 dark:bg-[#0f1117]/80 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center rounded-3xl mt-[280px]">
              <div className="p-3 bg-amber-500/10 rounded-full mb-4">
                <Brain size={32} className="text-amber-500" />
              </div>
              <h4 className="text-lg font-bold text-theme-text mb-2">Upgrading Analytics Engine</h4>
              <p className="text-sm text-theme-text-secondary max-w-[250px]">
                Due to extremely high traffic, we are temporarily pausing detailed stats to keep the servers running smoothly for everyone.
                <br /><br />
                <b>Live status is still active!</b>
              </p>
            </div>
          )}

        </div>
      </Card>
    </div>
  );
};

export default StudyBuddy;
