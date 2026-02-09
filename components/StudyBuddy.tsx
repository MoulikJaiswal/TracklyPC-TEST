
import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, Friend, FriendRequest, PresenceState } from '../types';
import { db, rtdb } from '../firebase';
import { collection, query, where, getDocs, getDoc, doc, onSnapshot, setDoc, deleteDoc, writeBatch, runTransaction } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { User as UserIcon, Users, UserPlus, Mail, Search, Copy, Check, X, Brain, Coffee, Loader2, Info, ArrowRight, Sparkles } from 'lucide-react';
import { Card } from './Card';
import { GoogleIcon } from './GoogleIcon';
import { AnimatePresence, motion } from 'framer-motion';

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
                        className="w-full p-4 bg-theme-bg-tertiary border border-theme-border rounded-xl text-center font-bold text-lg"
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
}

const FriendCard: React.FC<FriendCardProps> = ({ friend, presence }) => {
  const [liveProfile, setLiveProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!friend.uid) return;
    const unsub = onSnapshot(doc(db, 'users', friend.uid), (docSnap) => {
      if (docSnap.exists()) {
        setLiveProfile(docSnap.data() as UserProfile);
      }
    });
    return () => unsub();
  }, [friend.uid]);

  const displayName = liveProfile?.studyBuddyUsername || friend.displayName;
  const photoURL = liveProfile?.photoURL || friend.photoURL;

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
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <img src={photoURL || `https://ui-avatars.com/api/?name=${displayName}&background=random`} alt={displayName} className="w-12 h-12 rounded-full object-cover" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-theme-text truncate">{displayName}</p>
          <div className={`mt-1 flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full w-fit ${status.color}`}>
            {status.icon}
            <span>{status.text}</span>
          </div>
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
              {isCopied ? <Check size={16}/> : <Copy size={16} />}
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
                                <FriendCard key={friend.uid} friend={friend} presence={presences[friend.uid] || null} />
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
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Enter Friend Code (e.g., User#1234)" className="flex-1 p-3 bg-theme-bg-tertiary border border-theme-border rounded-xl text-sm" />
                            <button type="submit" className="p-3 bg-theme-accent text-theme-text-on-accent rounded-xl"><Search size={20} /></button>
                        </form>
                    </Card>

                    {searchResult && (
                        <Card className="p-4">
                            {searchResult === 'loading' && <Loader2 className="animate-spin text-theme-accent mx-auto" />}
                            {searchResult === 'not_found' && <p className="text-center text-sm text-theme-text-secondary">User not found. Please check the code.</p>}
                            {searchResult === 'self' && <p className="text-center text-sm text-theme-text-secondary">You can't add yourself as a friend!</p>}
                            {searchResult === 'already_friend' && <p className="text-center text-sm text-theme-text-secondary">You are already friends with this user.</p>}
                            {searchResult === 'request_sent' && <p className="text-center text-sm text-emerald-500 flex items-center justify-center gap-2"><Check size={16}/> Friend request sent!</p>}
                            
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
    </div>
  );
};

export default StudyBuddy;
