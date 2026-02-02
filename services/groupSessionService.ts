
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
            .filter(r => r.status !== 'closing' && !r.isPrivate); // Filter out closing AND private rooms
        callback(rooms);
    }, (error) => {
        console.error("Error subscribing to rooms:", error);
    });
  },

  // 1.5 Get Specific Room (for joining via ID/Link)
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
  createRoom: async (roomData: Omit<StudyRoom, 'id' | 'activeCount' | 'createdAt'>) => {
    try {
        await addDoc(collection(db, 'rooms'), {
            ...roomData,
            activeCount: 0,
            createdAt: Date.now(),
            status: 'active' // Default status
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
            // Check if room is closing before joining? 
            // Ideally yes, but Firestore rules or client check usually handles this.
            await updateDoc(roomRef, {
                activeCount: increment(1)
            }).catch(e => console.warn("Failed to increment count (room might be closing)", e));
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
        }).catch(() => {}); // Ignore error if room already deleted
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
        // If we find ghosts (inactive > 20m), we delete them to fix the count
        // We only do this if we are receiving data (someone is online looking at the room)
        const now = Date.now();
        const ghostThreshold = now - (20 * 60 * 1000); // 20 minutes timeout
        
        const activeParts: StudyParticipant[] = [];
        const ghostIds: string[] = [];

        parts.forEach(p => {
            if (p.lastActivity < ghostThreshold) {
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
        
        // Self-Healing Count Sync
        // To fix drift between 'activeCount' on room doc and actual participants
        // We randomly update the room doc with the true count to ensure eventual consistency
        // Probability is 10% per update per client to avoid write contention
        if (Math.random() < 0.1) {
             const roomRef = doc(db, 'rooms', roomId);
             // Just set it to the actual length of active parts
             // This overrides any drift caused by missed decrements
             updateDoc(roomRef, { activeCount: activeParts.length }).catch(() => {}); 
        }

        callback(activeParts);
    }, (error) => {
        // console.error("Error subscribing to room participants:", error);
        // Suppress error log if permission denied (likely caused by room deletion)
    });
  },

  // 6. Delete Room (Host only)
  deleteRoom: async (roomId: string) => {
      const roomRef = doc(db, 'rooms', roomId);

      // 1. Soft Delete: Mark as closing immediately.
      // This hides it from the lobby while we clean up.
      try {
          await updateDoc(roomRef, { status: 'closing' });
      } catch (e) {
          console.warn("Could not mark room as closing (might already be deleted or perm issue):", e);
      }

      // 2. Try to delete participants (Best Effort)
      try {
          const participantsRef = collection(db, 'rooms', roomId, 'participants');
          const snapshot = await getDocs(participantsRef);
          
          const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.allSettled(deletePromises);
      } catch (e) {
          console.warn("Partial failure clearing participants (ignoring):", e);
      }

      // 3. Hard Delete the room document
      try {
          await deleteDoc(roomRef);
      } catch (e) {
          console.error("CRITICAL: Error deleting room doc:", e);
          throw e;
      }
  },

  // 7. Subscribe to Room Doc Status (to detect shutdown)
  subscribeToRoomStatus: (roomId: string, onUpdate: (data: StudyRoom | null) => void) => {
      return onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
          if (docSnap.exists()) {
              const data = { id: docSnap.id, ...docSnap.data() } as StudyRoom;
              // Treat 'closing' status as deleted for the active participants
              if (data.status === 'closing') {
                  onUpdate(null);
              } else {
                  onUpdate(data);
              }
          } else {
              onUpdate(null); // Room deleted
          }
      });
  },

  // 8. Send Reaction (Emoji)
  sendReaction: async (roomId: string, targetUserId: string, emoji: string, fromName: string) => {
      const participantRef = doc(db, `rooms/${roomId}/participants`, targetUserId);
      try {
          await updateDoc(participantRef, {
              lastReaction: {
                  emoji,
                  fromName,
                  timestamp: Date.now()
              }
          });
      } catch (e) {
          console.error("Failed to send reaction", e);
      }
  }
};
