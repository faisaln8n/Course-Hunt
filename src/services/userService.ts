import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  coverURL?: string;
  bio?: string;
  role: 'admin' | 'user';
  status?: 'active' | 'blocked';
  lastLogin?: string;
  createdAt?: string;
}

export const userService = {
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { uid, ...docSnap.data() } as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async createUserProfile(profile: UserProfile): Promise<void> {
    const path = `users/${profile.uid}`;
    try {
      const docRef = doc(db, 'users', profile.uid);
      await setDoc(docRef, {
        email: profile.email,
        displayName: profile.displayName || '',
        photoURL: profile.photoURL || '',
        coverURL: profile.coverURL || '',
        role: profile.role,
        bio: profile.bio || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateUserProfile(uid: string, data: Partial<Omit<UserProfile, 'role' | 'uid' | 'email'>>): Promise<void> {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Admin methods
  onAllUsersSnapshot(callback: (users: UserProfile[]) => void, onError?: (error: any) => void): () => void {
    const usersCollection = collection(db, 'users');
    // No query/orderBy to avoid index issues or missing field filtering
    return onSnapshot(usersCollection, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      // Sort in memory: newest first
      users.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      callback(users);
    }, (error) => {
      console.error("Error fetching users:", error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
  },

  async updateUserByAdmin(uid: string, data: Partial<UserProfile>): Promise<void> {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
