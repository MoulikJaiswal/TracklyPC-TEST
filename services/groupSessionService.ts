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
import { StudyParticipant, StudyRoom, UserProfile } from '../types';

const generateRoomCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const groupSessionService = {
  
  // 1. Subscribe to ALL Rooms (Lobby)
  subscribeToRooms: (callback: (rooms: StudyRoom[]) => void) => {
    // Use a simpler query that doesn't require a composite index, then sort on the client for robustness.
    const q = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
        const rooms = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() } as StudyRoom))
            .filter(r => r.status !== 'closing');

        // Client-side sorting for robustness
        rooms.sort((a, b) => {
            // System rooms first
            if (a.isSystem && !b.isSystem) return -1;
            if (!a.isSystem && b.isSystem) return 1;

            // Then public rooms before private
            if (!a.isPrivate && b.isPrivate) return -1;
            if (a.isPrivate && !b.isPrivate) return 1;

            // createdAt is the primary sort from the query, this is a fallback
            return (b.createdAt || 0) - (a.createdAt || 0);
        });

        callback(rooms);
    }, (error) => {
        console.error("Error subscribing to rooms:", error);
        callback([]); // Return empty array on error to prevent loading state lock
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
  createRoom: async (roomData: Omit<StudyRoom, 'id' | 'activeCount' | 'createdAt' | 'roomCode'>): Promise<{roomId: string, roomCode?: string}> => {
    try {
        const roomPayload: any = {
            ...roomData,
            activeCount: 0,
            createdAt: Date.now(),
            status: 'active'
        };

        let roomCode: string | undefined = undefined;
        if (roomData.isPrivate) {
            roomCode = generateRoomCode();
            roomPayload.roomCode = roomCode;
        }

        const docRef = await addDoc(collection(db, 'rooms'), roomPayload);
        return { roomId: docRef.id, roomCode };
    } catch (e) {
        console.error("Error creating room:", e);
        throw e;
    }
  },

  // 2.2 Update a Room
  updateRoom: async (roomId: string, userId: string, data: { name: string; description: string }) => {
    const roomRef = doc(db, 'rooms', roomId);
    try {
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists() && roomSnap.data().createdBy === userId) {
        await updateDoc(roomRef, {
          name: data.name,
          description: data.description,
        });
      } else {
        throw new Error("Permission denied or room not found.");
      }
    } catch (e) {
      console.error("Error updating room:", e);
      throw e;
    }
  },
  
  // 2.5 Verify Private Room Code
  verifyRoomCode: async (roomId: string, code: string): Promise<boolean> => {
    try {
      const room = await groupSessionService.getRoom(roomId);
      return !!(room && room.isPrivate && room.roomCode === code);
    } catch (e) {
      console.error("Error verifying room code:", e);
      return false;
    }
  },

  // 3. Join Session (Strict Single Room Enforcement)
  joinSession: async (roomId: string, userProfile: UserProfile, subject: string) => {
      const batch = writeBatch(db);
      const userId = userProfile.uid;
      
      // Check if user is in another room and prepare to leave it
      const presenceRef = doc(db, `users/${userId}/presence/status`);
      const presenceSnap = await getDoc(presenceRef);
      if (presenceSnap.exists()) {
          const prevRoomId = presenceSnap.data().currentRoomId;
          if (prevRoomId && prevRoomId !== roomId) {
              const oldParticipantRef = doc(db, `rooms/${prevRoomId}/participants`, userId);
              batch.delete(oldParticipantRef);
              const oldRoomRef = doc(db, 'rooms', prevRoomId);
              batch.update(oldRoomRef, { activeCount: increment(-1) });
          }
      }

      const participantRef = doc(db, `rooms/${roomId}/participants`, userId);
      const roomRef = doc(db, 'rooms', roomId);
      
      const participantData: StudyParticipant = {
          uid: userId,
          displayName: userProfile.studyBuddyUsername || userProfile.displayName || 'Anonymous',
          photoURL: userProfile.photoURL,
          status: 'idle',
          subject: subject as any,
          lastActivity: Date.now(),
          isAway: false,
          dailyFocusTime: 0,
          lastFocusDate: new Date().toISOString().split('T')[0],
      };
      
      batch.set(participantRef, participantData, { merge: true });
      batch.update(roomRef, { activeCount: increment(1) });
      batch.set(presenceRef, { currentRoomId: roomId });

      await batch.commit();
  },

  updateDailyFocusTime: async (roomId: string, userId: string, durationSeconds: number) => {
    if (!userId || !roomId) return;
    const participantRef = doc(db, `rooms/${roomId}/participants`, userId);
    try {
        const participantDoc = await getDoc(participantRef);
        if (!participantDoc.exists()) return;

        const participantData = participantDoc.data() as StudyParticipant;
        const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const batch = writeBatch(db);

        if (participantData.lastFocusDate === todayStr) {
            // Same day, just increment
            batch.update(participantRef, {
                dailyFocusTime: increment(durationSeconds),
                lastActivity: Date.now(),
            });
        } else {
            // New day, reset time to current duration
            batch.update(participantRef, {
                dailyFocusTime: durationSeconds,
                lastFocusDate: todayStr,
                lastActivity: Date.now(),
            });
        }
        await batch.commit();

    } catch (e) {
        console.error("Error updating daily focus time:", e);
    }
  },

  // 4. Update Presence (Heartbeat)
  updatePresence: async (
    roomId: string, 
    userId: string, 
    data: Partial<Omit<StudyParticipant, 'uid'>>
  ) => {
    if (!userId || !roomId) return;
    const participantRef = doc(db, `rooms/${roomId}/participants`, userId);
    try {
        await setDoc(participantRef, {
            ...data,
            lastActivity: Date.now(),
        }, { merge: true });
    } catch (e) {
        console.error("Error updating presence:", e);
    }
  },

  // 5. Leave Room
  leaveRoom: async (roomId: string, userId: string) => {
    if (!userId || !roomId) return;
    
    const batch = writeBatch(db);
    const participantRef = doc(db, `rooms/${roomId}/participants`, userId);
    const roomRef = doc(db, 'rooms', roomId);
    const presenceRef = doc(db, `users/${userId}/presence/status`);

    batch.delete(participantRef);
    batch.update(roomRef, { activeCount: increment(-1) });
    batch.delete(presenceRef);

    try {
        await batch.commit();
    } catch (e) {
        console.warn("Error leaving room (might be benign if room/user was already gone):", e);
    }
  },

  // 6. Subscribe to Room Participants
  subscribeToRoom: (roomId: string, callback: (participants: StudyParticipant[]) => void) => {
    const q = query(
        collection(db, `rooms/${roomId}/participants`), 
        orderBy('displayName')
    );
    
    return onSnapshot(q, (snapshot) => {
        const activeParts = snapshot.docs.map(d => d.data() as StudyParticipant);
        callback(activeParts);
    }, (error) => {
        console.error("Error in room subscription:", error);
    });
  },

  // 7. Delete Room
  deleteRoom: async (roomId: string, userId: string) => {
    const roomRef = doc(db, 'rooms', roomId);
    try {
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists() || roomSnap.data().createdBy !== userId) {
            console.error("Permission denied to delete room or room not found.");
            throw new Error("You do not have permission to delete this room.");
        }

        await updateDoc(roomRef, { status: 'closing' }); // Soft delete
        const participantsRef = collection(db, 'rooms', roomId, 'participants');
        const snapshot = await getDocs(participantsRef);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        batch.delete(roomRef);

        await batch.commit();
    } catch (e) {
        console.error("Error deleting room:", e);
        throw e;
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