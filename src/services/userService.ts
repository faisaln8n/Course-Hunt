import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, getDocs, setDoc, updateDoc, collection, query, orderBy, where } from 'firebase/firestore';

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
  walletBalance?: number;
  purchasedCourses?: string[];
  // Referral fields
  referralCode: string;
  referredBy?: string;
  affiliateBalance?: number;
  // VIP fields
  vipStatus?: 'active' | 'pending' | 'none';
  vipExpiryDate?: string;
  vipJoinDate?: string;
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
      
      // Check for stored referral code
      const referredBy = localStorage.getItem('referredBy');
      
      await setDoc(docRef, {
        email: profile.email,
        displayName: profile.displayName || '',
        photoURL: profile.photoURL || '',
        coverURL: profile.coverURL || '',
        role: profile.role,
        bio: profile.bio || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        walletBalance: 0,
        affiliateBalance: 0,
        purchasedCourses: [],
        referralCode: profile.uid.substring(0, 8), // Unique code based on UID
        referredBy: referredBy || null
      });

      // Clear referral after use
      if (referredBy) {
        localStorage.removeItem('referredBy');
      }
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

  async getAllUsers(): Promise<UserProfile[]> {
    const usersCollection = collection(db, 'users');
    const querySnapshot = await getDocs(usersCollection);
    const users = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    users.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    return users;
  },

  // Admin methods
  async updateUserByAdmin(uid: string, data: Partial<UserProfile>): Promise<void> {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getReferredUsers(referrerId: string): Promise<UserProfile[]> {
    const q = query(
      collection(db, 'users'),
      where('referredBy', '==', referrerId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
  }
};
