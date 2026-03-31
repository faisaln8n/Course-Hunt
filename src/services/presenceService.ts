import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  doc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  Timestamp,
  deleteDoc,
  getDocs
} from 'firebase/firestore';

const PRESENCE_COLLECTION = 'presence';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const ONLINE_THRESHOLD = 60000; // 1 minute

export const presenceService = {
  privateHeartbeatInterval: null as any,
  privateGuestId: null as string | null,

  async startPresence() {
    if (this.privateHeartbeatInterval) return;

    const updatePresence = async () => {
      let uid = auth.currentUser?.uid;
      
      if (!uid) {
        if (!this.privateGuestId) {
          this.privateGuestId = localStorage.getItem('presence_guest_id') || 'guest-' + Math.random().toString(36).substring(2, 15);
          localStorage.setItem('presence_guest_id', this.privateGuestId);
        }
        uid = this.privateGuestId;
      }

      const presenceRef = doc(db, PRESENCE_COLLECTION, uid);
      
      try {
        await setDoc(presenceRef, {
          uid,
          lastSeen: serverTimestamp(),
          isGuest: !auth.currentUser,
          email: auth.currentUser?.email || 'Guest'
        }, { merge: true });
      } catch (error) {
        // Only log if it's not a permission error we're already handling or if we want more info
        if (error instanceof Error && error.message.includes('permission')) {
          try {
            handleFirestoreError(error, OperationType.WRITE, `${PRESENCE_COLLECTION}/${uid}`);
          } catch (e) {
            // Re-throw to be caught by any outer handlers if needed
          }
        } else {
          console.error('Error updating presence:', error);
        }
      }
    };

    // Initial update
    await updatePresence();

    // Set interval for heartbeat
    this.privateHeartbeatInterval = setInterval(updatePresence, HEARTBEAT_INTERVAL);

    // Clean up on window close
    window.addEventListener('beforeunload', () => this.stopPresence());
  },

  stopPresence() {
    if (this.privateHeartbeatInterval) {
      clearInterval(this.privateHeartbeatInterval);
      this.privateHeartbeatInterval = null;
    }
  },

  onLiveUsersCount(callback: (count: number) => void): () => void {
    return onSnapshot(collection(db, PRESENCE_COLLECTION), (snapshot) => {
      const now = Date.now();
      const onlineUsers = snapshot.docs.filter(doc => {
        const data = doc.data();
        if (!data.lastSeen) return false;
        const lastSeen = (data.lastSeen as Timestamp).toMillis();
        return now - lastSeen < ONLINE_THRESHOLD;
      });
      callback(onlineUsers.length);
    });
  },

  onLiveUsersSnapshot(callback: (users: any[]) => void): () => void {
    return onSnapshot(collection(db, PRESENCE_COLLECTION), (snapshot) => {
      const now = Date.now();
      const onlineUsers = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((user: any) => {
          if (!user.lastSeen) return false;
          const lastSeen = (user.lastSeen as Timestamp).toMillis();
          return now - lastSeen < ONLINE_THRESHOLD;
        })
        .sort((a: any, b: any) => (b.lastSeen as Timestamp).toMillis() - (a.lastSeen as Timestamp).toMillis());
      callback(onlineUsers);
    });
  },

  // Cleanup old presence documents (optional, can be done by admin or cloud function)
  async cleanupPresence() {
    const q = query(
      collection(db, PRESENCE_COLLECTION),
      where('lastSeen', '<', new Date(Date.now() - ONLINE_THRESHOLD * 5))
    );
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  }
};
