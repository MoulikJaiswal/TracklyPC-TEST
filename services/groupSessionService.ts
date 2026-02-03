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
    const q = query(collection(db, 'rooms'), where('isPrivate', '!=', true), orderBy('isPrivate'), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
        const rooms = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as StudyRoom))
            .filter(r => r.status !== 'closing'); 
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
          const presenceRef = doc(db, `users/${user.uid}/presence/status`);
          const presenceSnap = await getDoc(presenceRef);
          
          if (presenceSnap.exists()) {
              const prevRoomId = presenceSnap.data().currentRoomId;
              if (prevRoomId && prevRoomId !== roomId) {
                  await groupSessionService.leaveRoom(prevRoomId, user.uid);
              }
          }

          const participantRef = doc(db, `rooms/${roomId}/participants`, user.uid);
          const roomRef = doc(db, 'rooms', roomId);

          const partSnap = await getDoc(participantRef);
          const isNewJoin = !partSnap.exists() || !partSnap.data().isOnline;

          const participantData: StudyParticipant = {
              uid: user.uid,
              displayName: user.displayName || 'Anonymous',
              photoURL: user.photoURL,
              status: 'idle',
              subject: subject as any,
              lastActivity: Date.now(),
              isAway: false,
              isOnline: true // Explicitly set online status
          };

          await setDoc(participantRef, participantData, { merge: true });

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
            lastActivity: Date.now(),
            isOnline: true // Heartbeat confirms user is online
        }, { merge: true });
    } catch (e) {
        // Silent fail for heartbeat
    }
  },

  // 5. Leave Room & Mark as Offline
  leaveRoom: async (roomId: string, userId: string) => {
    if (!userId) return;
    
    const participantRef = doc(db, `rooms/${roomId}/participants`, userId);
    const presenceRef = doc(db, `users/${userId}/presence/status`);
    
    try {
        // Mark participant as offline instead of deleting to preserve stats
        await updateDoc(participantRef, { isOnline: false });

        const presenceSnap = await getDoc(presenceRef);
        if (presenceSnap.exists() && presenceSnap.data().currentRoomId === roomId) {
             await deleteDoc(presenceRef);
        }
    } catch (e) {
        console.warn("Error leaving room (might be benign if user was already gone):", e);
    }
  },

  // 6. Subscribe to ONLINE Room Participants
  subscribeToRoom: (roomId: string, callback: (participants: StudyParticipant[]) => void) => {
    // THE KEY CHANGE: Query only for participants explicitly marked as online.
    // This stops the firehose of updates from every user's heartbeat.
    const q = query(
        collection(db, `rooms/${roomId}/participants`), 
        where("isOnline", "==", true),
        orderBy('displayName', 'asc') // Sort alphabetically for a stable monitor election
    );
    
    return onSnapshot(q, (snapshot) => {
        const activeParts = snapshot.docs.map(d => d.data() as StudyParticipant);
        callback(activeParts);
    }, (error) => {
        console.error("Error in room subscription:", error);
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
