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
import { useAuth } from '../contexts/AuthContext';

const StudyBuddySetup = ({ user, userProfile }: { user: User, userProfile: UserProfile | null }) => {
    // ... (This component remains the same as it receives props directly)
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
                        transaction.set(friendCodeRef, { uid: user.uid, displayName: trimmedUsername, photoURL: userProfile?.photoURL || null });
                        break;
                    }
                }

                if (!isUnique) throw new Error('Could not generate a unique friend code. Please try a different username.');
                transaction.set(usernameRef, { uid: user.uid });
                transaction.update(userRef, { studyBuddyUsername: trimmedUsername, friendCode: friendCode });
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
                <div className="p-4 bg-indigo-500/10 rounded-full mb-6 border border-indigo-500/20 inline-block"><Sparkles size={40} className="text-indigo-500" /></div>
                <h2 className="text-2xl font-bold text-theme-text mb-2">Create Your Profile</h2>
                <p className="text-theme-text-secondary mb-8 max-w-sm mx-auto text-sm">Choose a unique username to generate your friend code and start connecting with others.</p>
                <form onSubmit={handleCreateProfile} className="space-y-4">
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" className="w-full p-4 bg-theme-bg-tertiary border border-theme-border rounded-xl text-center font-bold text-lg text-theme-text" />
                    {error && <p className="text-xs text-rose-500">{error}</p>}
                    <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-theme-accent text-theme-text-on-accent rounded-xl text-sm font-bold uppercase tracking-widest shadow-lg hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50">
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <>Create Profile & Get Code <ArrowRight size={16} /></>}
                    </button>
                </form>
            </Card>
        </div>
    );
};


const FriendCard: React.FC<{ friend: Friend; presence: PresenceState | null; }> = ({ friend, presence }) => { /* ... implementation ... */ return null; };

const StudyBuddy: React.FC = () => {
  const { user, userProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [presences, setPresences] = useState<Record<string, PresenceState>>({});
  const [isLoading, setIsLoading] = useState(true);

  // ... (rest of the component logic is the same, using `user` and `userProfile` from context)

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const friendsUnsub = onSnapshot(collection(db, `users/${user.uid}/friends`), (snapshot) => { setFriends(snapshot.docs.map(doc => doc.data() as Friend)); setIsLoading(false); }, (error) => { console.error("Error fetching friends:", error); setIsLoading(false); });
    const requestsUnsub = onSnapshot(collection(db, `users/${user.uid}/friendRequests`), (snapshot) => setRequests(snapshot.docs.map(doc => doc.data() as FriendRequest)));
    return () => { friendsUnsub(); requestsUnsub(); };
  }, [user]);

  // ... (other useEffects and handlers)

  if (!user) {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center p-6 animate-in fade-in duration-500">
            <div className="p-4 bg-indigo-500/10 rounded-full mb-6 border border-indigo-500/20"><Users size={48} className="text-indigo-500" /></div>
            <h2 className="text-2xl font-bold text-theme-text mb-2">Study with Friends</h2>
            <p className="text-theme-text-secondary mb-8 max-w-sm">Sign in with Google to add friends, see their live study status, and stay motivated together.</p>
        </div>
    );
  }

  if (!userProfile?.studyBuddyUsername || !userProfile?.friendCode) {
    return <StudyBuddySetup user={user} userProfile={userProfile} />;
  }

  // ... (rest of the render logic)
  return <div>Study Buddy Content</div>;
};

export default StudyBuddy;
