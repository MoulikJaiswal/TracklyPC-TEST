
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
  where
} from 'firebase/firestore';
import { StudyParticipant, StudyRoom } from '../types';

export const groupSessionService = {
  
  // 1. Subscribe to ALL Rooms (Lobby)
  subscribeToRooms: (callback: (rooms: StudyRoom[]) => void) => {
    // Order by creation time or activity? Let's do creation for now to keep list stable
    const q = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
        const rooms = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudyRoom));
        callback(rooms);
    }, (error) => {
        console.error("Error subscribing to rooms:", error);
    });
  },

  // 2. Create a Room
  createRoom: async (roomData: Omit<StudyRoom, 'id' | 'activeCount' | 'createdAt'>) => {
    try {
        await addDoc(collection(db, 'rooms'), {
            ...roomData,
            activeCount: 0,
            createdAt: Date.now()
        });
    } catch (e) {
        console.error("Error creating room:", e);
        throw e;
    }
  },

  // 3. Join/Update Presence
  updatePresence: async (
    roomId: string, 
    userId: string, 
    data: Partial<StudyParticipant>,
    isJoining: boolean = false
  ) => {
    if (!userId) return;
    
    const participantRef = doc(db, `rooms/${roomId}/participants`, userId);
    const roomRef = doc(db, 'rooms', roomId);
    
    try {
        await setDoc(participantRef, {
            ...data,
            lastActivity: Date.now()
        }, { merge: true });

        // If joining for the first time in this session, increment count
        if (isJoining) {
            await updateDoc(roomRef, {
                activeCount: increment(1)
            });
        }
    } catch (e) {
        console.error("Error updating presence:", e);
    }
  },

  // 4. Leave Room
  leaveRoom: async (roomId: string, userId: string) => {
    if (!userId) return;
    
    const participantRef = doc(db, `rooms/${roomId}/participants`, userId);
    const roomRef = doc(db, 'rooms', roomId);
    
    try {
        await deleteDoc(participantRef);
        // Decrement count
        await updateDoc(roomRef, {
            activeCount: increment(-1)
        });
    } catch (e) {
        console.error("Error leaving room:", e);
    }
  },

  // 5. Subscribe to Room Participants & Clean Ghosts
  subscribeToRoom: (roomId: string, callback: (participants: StudyParticipant[]) => void) => {
    const q = query(collection(db, `rooms/${roomId}/participants`), orderBy('lastActivity', 'desc'));
    
    return onSnapshot(q, async (snapshot) => {
        const parts = snapshot.docs.map(d => d.data() as StudyParticipant);
        
        // Client-Side Ghost Check
        // If we find ghosts (inactive > 2h), we delete them to fix the count
        // We only do this if we are receiving data (someone is online looking at the room)
        const now = Date.now();
        const twoHoursAgo = now - (2 * 60 * 60 * 1000);
        
        const activeParts: StudyParticipant[] = [];
        const ghostIds: string[] = [];

        parts.forEach(p => {
            if (p.lastActivity < twoHoursAgo) {
                ghostIds.push(p.uid);
            } else {
                activeParts.push(p);
            }
        });

        // Async cleanup (don't block UI)
        if (ghostIds.length > 0) {
            const batchPromises = ghostIds.map(uid => groupSessionService.leaveRoom(roomId, uid));
            Promise.allSettled(batchPromises).then(() => console.log(`Cleaned ${ghostIds.length} ghosts`));
        }
        
        callback(activeParts);
    }, (error) => {
        console.error("Error subscribing to room participants:", error);
    });
  },

  // 6. Delete Room (Host only)
  deleteRoom: async (roomId: string) => {
      // 1. Try to delete participants (Best Effort)
      // We use Promise.allSettled so if one fails (e.g., permission denied for another user's doc),
      // it doesn't stop the whole process.
      try {
          const participantsRef = collection(db, 'rooms', roomId, 'participants');
          const snapshot = await getDocs(participantsRef);
          
          const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.allSettled(deletePromises);
      } catch (e) {
          console.warn("Could not clear all participants (likely permission issues), proceeding to delete room:", e);
      }

      // 2. Delete the room document (Critical)
      try {
          await deleteDoc(doc(db, 'rooms', roomId));
      } catch (e) {
          console.error("Error deleting room doc:", e);
          throw e; // This is the actual error we care about for the UI
      }
  },

  // 7. Subscribe to Room Doc Status (to detect shutdown)
  subscribeToRoomStatus: (roomId: string, onUpdate: (data: StudyRoom | null) => void) => {
      return onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
          if (docSnap.exists()) {
              onUpdate({ id: docSnap.id, ...docSnap.data() } as StudyRoom);
          } else {
              onUpdate(null); // Room deleted
          }
      });
  }
};
