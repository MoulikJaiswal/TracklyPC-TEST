import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database';
import { auth, db, rtdb, googleProvider } from '../firebase';
import { UserProfile, PresenceState } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isGuest: boolean;
  authStatus: 'loading' | 'loading_profile' | 'loaded';
  userName: string;
  handleLogin: () => Promise<void>;
  handleGuestLogin: (name: string) => void;
  handleLogout: () => Promise<void>;
  updatePresence: (status: Partial<PresenceState>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authStatus, setAuthStatus] = useState<'loading' | 'loading_profile' | 'loaded'>('loading');

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;
    const authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
      profileUnsubscribe?.();
      setUser(currentUser);
      if (currentUser) {
        setAuthStatus('loading_profile');
        setIsGuest(false);
        const userDocRef = doc(db, 'users', currentUser.uid);
        profileUnsubscribe = onSnapshot(userDocRef, async (userDoc) => {
            if (userDoc.exists()) {
              setUserProfile(userDoc.data() as UserProfile);
            } else {
              const newProfile: UserProfile = { uid: currentUser.uid, displayName: currentUser.displayName || 'Anonymous User', photoURL: currentUser.photoURL };
              await setDoc(userDocRef, newProfile).catch(e => console.error("Error creating user profile:", e));
            }
            setAuthStatus('loaded');
          }, (error) => {
            console.error("Error with user profile subscription:", error);
            signOut(auth).catch(e => console.error("Sign out failed on profile error", e));
            setAuthStatus('loaded');
          }
        );
      } else {
        setUserProfile(null);
        setAuthStatus('loaded');
      }
    });
    return () => {
      authUnsubscribe();
      profileUnsubscribe?.();
    };
  }, []);
  
  const updatePresence = useCallback((status: Partial<PresenceState>) => {
    if (!user) return;
    const presenceRef = ref(rtdb, `/status/${user.uid}`);
    set(presenceRef, { isOnline: true, ...status, lastChanged: serverTimestamp() }).catch(e => console.warn("Could not update presence", e));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const userStatusRef = ref(rtdb, `/status/${user.uid}`);
    const connectedRef = ref(rtdb, '.info/connected');
    const unsubscribe = onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            const con = onDisconnect(userStatusRef);
            con.set({ isOnline: false, lastChanged: serverTimestamp() });
            set(userStatusRef, { isOnline: true, state: 'idle', lastChanged: serverTimestamp() }).catch(e => console.warn("Could not set initial presence", e));
        }
    });
    return () => {
        unsubscribe();
        set(userStatusRef, { isOnline: false, lastChanged: serverTimestamp() }).catch(e => console.warn("Could not set offline presence", e));
    };
  }, [user]);

  useEffect(() => {
    const storedGuest = localStorage.getItem('trackly_is_guest');
    if (storedGuest === 'true' && !user) setIsGuest(true);
  }, [user]);
  
  const handleLogin = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  }, []);

  const handleGuestLogin = useCallback((name: string) => {
    if (!name.trim()) return;
    localStorage.setItem('trackly_guest_name', name.trim());
    setIsGuest(true);
    localStorage.setItem('trackly_is_guest', 'true');
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      if (user) {
        const userStatusRef = ref(rtdb, `/status/${user.uid}`);
        await set(userStatusRef, { isOnline: false, lastChanged: serverTimestamp() });
        await signOut(auth);
      }
      setIsGuest(false);
      setUser(null);
      setUserProfile(null);
      localStorage.removeItem('trackly_is_guest');
      localStorage.removeItem('trackly_guest_name');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [user]);

  const userName = useMemo(() => {
    if (isGuest) return localStorage.getItem('trackly_guest_name') || 'Guest';
    return userProfile?.studyBuddyUsername || userProfile?.displayName || user?.displayName || 'User';
  }, [user, userProfile, isGuest]);
  
  const value = { user, userProfile, isGuest, authStatus, userName, handleLogin, handleGuestLogin, handleLogout, updatePresence };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
