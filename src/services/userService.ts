import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, getDocs, setDoc, updateDoc, collection, query, orderBy, where } from 'firebase/firestore';
import { cache } from '../lib/cache';

const CACHE_KEY_PROFILE = 'cached_user_profile';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for user profile

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
  walletBalance?: number | any;
  purchasedCourses?: string[];
  // Referral fields
  referralCode: string;
  referredBy?: string;
  affiliateBalance?: number | any;
  // VIP fields
  vipStatus?: 'active' | 'pending' | 'none';
  vipExpiryDate?: string;
  vipJoinDate?: string;
  vipRenewalCount?: number | any;
  lifetimeDeposit?: number | any;
  lifetimeClicks?: number | any;
}

export const userService = {
  /**
   * Fetches user profile with caching to reduce read quota usage.
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    // 1. Check cache first
    const cached = cache.get<UserProfile>(`${CACHE_KEY_PROFILE}_${uid}`);
    if (cached) {
      return cached;
    }

    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const profile = { uid, ...docSnap.data() } as UserProfile;
        // 2. Cache the profile
        cache.set(`${CACHE_KEY_PROFILE}_${uid}`, profile, CACHE_TTL);
        return profile;
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
      
      const newProfileData = {
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
      };

      await setDoc(docRef, newProfileData);

      // Cache the new profile immediately
      cache.set(`${CACHE_KEY_PROFILE}_${profile.uid}`, { uid: profile.uid, ...newProfileData } as UserProfile, CACHE_TTL);

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
      
      // 3. Invalidate cache on update to ensure fresh data on next read
      cache.remove(`${CACHE_KEY_PROFILE}_${uid}`);
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
