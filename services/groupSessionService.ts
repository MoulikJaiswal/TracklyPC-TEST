import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc,
  deleteDoc, 
  updateDoc,
  onSnapshot, 
  query, 
  orderBy,
  increment,
  getDocs,
  getDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { StudyParticipant, StudyRoom } from '../types';

export const groupSessionService = {
  
  // 1. Subscribe to PUBLIC Rooms (Lobby)
  subscribeToRooms: (callback: (rooms: StudyRoom[]) => void) => {
    const q = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
        const rooms = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as StudyRoom))
            .filter(r => r.status !== 'closing'); // Show all active rooms
        callback(rooms);
    }, (error) => {
        console.error("Error subscribing to rooms:", error);
    });
  },

  // 1.5 Get Specific Room
  getRoom: async (roomId: string): Promise<StudyRoom | null> => {
      try {
          const docRef = doc(db, 'rooms', roomId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
              const data = docSnap.data() as StudyRoom;
              if (data.status === 'closing') return null;
              return { id: docSnap.id, ...data };
          }
          return null;
      } catch (e) {
          console.error("Error fetching room:", e);
          return null;
      }
  },

  // 2. Create a Room
  createRoom: async (roomData: Omit<StudyRoom, 'id' | 'activeCount' | 'createdAt'>): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, 'rooms'), {
            ...roomData,
            activeCount: 0,
            createdAt: Date.now(),
            status: 'active'
        });
        return docRef.id;
    } catch (e) {
        console.error("Error creating room:", e);
        throw e;
    }
  },

  // 3. Join Session (Strict Single Room Enforcement)
  joinSession: async (roomId: string, user: { uid: string, displayName: string, photoURL?: string | null }, subject: string) => {
      try {
          // 1. Check Previous Room from User Presence Doc
          const presenceRef = doc(db, `users/${user.uid}/presence/status`);
          const presenceSnap = await getDoc(presenceRef);
          
          if (presenceSnap.exists()) {
              const prevRoomId = presenceSnap.data().currentRoomId;
              // If in a different room, leave it first
              if (prevRoomId && prevRoomId !== roomId) {
                  await groupSessionService.leaveRoom(prevRoomId, user.uid);
              }
          }

          // 2. Update Presence for NEW Room
          const participantRef = doc(db, `rooms/${roomId}/participants`, user.uid);
          const roomRef = doc(db, 'rooms', roomId);

          // Check if already in this room to avoid double count
          const partSnap = await getDoc(participantRef);
          const isNewJoin = !partSnap.exists();

          const participantData: StudyParticipant = {
              uid: user.uid,
              displayName: user.displayName || 'Anonymous',
              photoURL: user.photoURL,
              status: 'idle',
              subject: subject as any,
              lastActivity: Date.now(),
              isAway: false
          };

          await setDoc(participantRef, participantData, { merge: true });

          // 3. Update Global Presence Tracker
          await setDoc(presenceRef, { currentRoomId: roomId }, { merge: true });

          if (isNewJoin) {
              await updateDoc(roomRef, {
                  activeCount: increment(1)
              }).catch(() => {});
          }

      } catch (e) {
          console.error("Error joining session:", e);
          throw e;
      }
  },

  // 4. Update Presence (Heartbeat)
  updatePresence: async (
    roomId: string, 
    userId: string, 
    data: Partial<StudyParticipant>
  ) => {
    if (!userId) return;
    const participantRef = doc(db, `rooms/${roomId}/participants`, userId);
    try {
        await setDoc(participantRef, {
            ...data,
            lastActivity: Date.now()
        }, { merge: true });
    } catch (e) {
        // Silent fail for heartbeat
    }
  },

  // 5. Leave Room & Clear Presence
  leaveRoom: async (roomId: string, userId: string) => {
    if (!userId) return;
    
    const participantRef = doc(db, `rooms/${roomId}/participants`, userId);
    const roomRef = doc(db, 'rooms', roomId);
    const presenceRef = doc(db, `users/${userId}/presence/status`);
    
    try {
        await deleteDoc(participantRef);
        // Clear global presence if it matches this room
        const presenceSnap = await getDoc(presenceRef);
        if (presenceSnap.exists() && presenceSnap.data().currentRoomId === roomId) {
             await deleteDoc(presenceRef);
        }

        // Decrement count
        await updateDoc(roomRef, {
            activeCount: increment(-1)
        }).catch(() => {}); 
    } catch (e) {
        console.error("Error leaving room:", e);
    }
  },

  // 6. Subscribe to Room & Auto-Clean Ghosts
  subscribeToRoom: (roomId: string, callback: (participants: StudyParticipant[]) => void) => {
    const q = query(collection(db, `rooms/${roomId}/participants`), orderBy('lastActivity', 'desc'));
    
    return onSnapshot(q, async (snapshot) => {
        const parts = snapshot.docs.map(d => d.data() as StudyParticipant);
        
        // --- STRICT GHOST PROTOCOL ---
        // Reduce threshold to 15 seconds for faster "auto-leave" on tab close.
        // Heartbeat is sent every 5s. If 3 heartbeats missed, user is gone.
        const now = Date.now();
        const ghostThreshold = now - (15 * 1000); 
        
        const activeParts: StudyParticipant[] = [];
        const ghostIds: string[] = [];

        parts.forEach(p => {
            if (p.lastActivity < ghostThreshold) {
                ghostIds.push(p.uid);
            } else {
                activeParts.push(p);
            }
        });

        // Async cleanup
        if (ghostIds.length > 0) {
            ghostIds.forEach(uid => groupSessionService.leaveRoom(roomId, uid));
        }
        
        // Self-Healing Count Sync (approx 10% chance to run to save writes)
        if (activeParts.length < 5 || Math.random() < 0.1) {
             const roomRef = doc(db, 'rooms', roomId);
             updateDoc(roomRef, { activeCount: activeParts.length }).catch(() => {}); 
        }

        callback(activeParts);
    });
  },

  // 7. Delete Room
  deleteRoom: async (roomId: string) => {
      const roomRef = doc(db, 'rooms', roomId);
      try {
          await updateDoc(roomRef, { status: 'closing' });
          const participantsRef = collection(db, 'rooms', roomId, 'participants');
          const snapshot = await getDocs(participantsRef);
          const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.allSettled(deletePromises);
          await deleteDoc(roomRef);
      } catch (e) {
          console.error("Error deleting room:", e);
      }
  },

  subscribeToRoomStatus: (roomId: string, onUpdate: (data: StudyRoom | null) => void) => {
      return onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
          if (docSnap.exists()) {
              const data = { id: docSnap.id, ...docSnap.data() } as StudyRoom;
              if (data.status === 'closing') {
                  onUpdate(null);
              } else {
                  onUpdate(data);
              }
          } else {
              onUpdate(null); 
          }
      });
  },
};