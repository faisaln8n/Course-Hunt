import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const SETTINGS_COLLECTION = 'settings';
const APP_SETTINGS_DOC = 'app';
const ANNOUNCEMENTS_DOC = 'announcements';
const CATEGORIES_DOC = 'categories';
const COUPONS_COLLECTION = 'coupons';

export interface Coupon {
  code: string;
  discount: number;
  isActive: boolean;
  courseId?: string; // Optional: if missing, applies to all
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
}

export const settingsService = {
  getDefaultSettings(): AppSettings {
    return {
      announcement: '',
      announcementLink: '',
      announcementCountdown: '',
      categories: ['Development', 'Design', 'Marketing', 'Business'],
      coupons: [],
      depositCoupons: []
    };
  },

  async getSettings(): Promise<AppSettings> {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          announcement: data.announcement || '',
          announcementLink: data.announcementLink || '',
          announcementCountdown: data.announcementCountdown || '',
          categories: data.categories || this.getDefaultSettings().categories,
          coupons: data.coupons || [],
          depositCoupons: data.depositCoupons || []
        };
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
      window.dispatchEvent(new Event('settings-updated'));
      return { error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/${APP_SETTINGS_DOC}`);
      return { error };
    }
  }
};
