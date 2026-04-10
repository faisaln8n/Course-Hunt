import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { cache } from '../lib/cache';

const SETTINGS_COLLECTION = 'settings';
const APP_SETTINGS_DOC = 'app';
const CACHE_KEY_SETTINGS = 'cached_app_settings';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes for settings

export interface Coupon {
  code: string;
  discount: number;
  isActive: boolean;
  courseId?: string; // Optional: if missing, applies to all
  toolId?: string; // Optional: for tool-specific coupons
  expiryDate?: string; // ISO string for the expiration date/time
}

export interface DepositCoupon {
  code: string;
  bonusPercentage: number;
  isActive: boolean;
  expiryDate?: string;
}

export interface AppSettings {
  announcement: string;
  announcementLink?: string;
  announcementCountdown?: string;
  categories: string[];
  coupons: Coupon[];
  depositCoupons: DepositCoupon[];
  toolCoupons?: Coupon[];
  vipCoupons?: Coupon[];
  featuredToolIds?: string[];
}

export const settingsService = {
  getDefaultSettings(): AppSettings {
    return {
      announcement: '',
      announcementLink: '',
      announcementCountdown: '',
      categories: ['Development', 'Design', 'Marketing', 'Business'],
      coupons: [],
      depositCoupons: [],
      toolCoupons: [],
      vipCoupons: []
    };
  },

  /**
   * Fetches app settings with caching.
   * Settings are global and change infrequently, making them ideal for caching.
   */
  async getSettings(): Promise<AppSettings> {
    // 1. Check cache first
    const cached = cache.get<AppSettings>(CACHE_KEY_SETTINGS);
    if (cached) {
      console.log('Serving settings from cache');
      return cached;
    }

    try {
      const docRef = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const settings = {
          announcement: data.announcement || '',
          announcementLink: data.announcementLink || '',
          announcementCountdown: data.announcementCountdown || '',
          categories: data.categories || this.getDefaultSettings().categories,
          coupons: data.coupons || [],
          depositCoupons: data.depositCoupons || [],
          toolCoupons: data.toolCoupons || [],
          vipCoupons: data.vipCoupons || [],
          featuredToolIds: data.featuredToolIds || []
        };
        
        // 2. Cache the settings
        cache.set(CACHE_KEY_SETTINGS, settings, CACHE_TTL);
        return settings;
      }
      return this.getDefaultSettings();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${SETTINGS_COLLECTION}/${APP_SETTINGS_DOC}`);
      return this.getDefaultSettings();
    }
  },

  async updateSettings(settings: AppSettings) {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC);
      
      // Sanitize settings to remove undefined values which Firestore doesn't support
      const sanitizedSettings = JSON.parse(JSON.stringify(settings));
      
      await setDoc(docRef, { 
        ...sanitizedSettings,
        updatedAt: serverTimestamp()
      });
      
      // 3. Invalidate cache on update
      cache.remove(CACHE_KEY_SETTINGS);
      
      window.dispatchEvent(new Event('settings-updated'));
      return { error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${APP_SETTINGS_DOC}`);
      return { error };
    }
  }
};
