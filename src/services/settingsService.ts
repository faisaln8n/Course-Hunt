import { supabase } from '../supabase';

const SETTINGS_TABLE = 'settings';
const APP_SETTINGS_ID = 'app';

export interface Coupon {
  code: string;
  discount: number;
  isActive: boolean;
  courseId?: string;
  toolId?: string;
  expiryDate?: string;
}

export interface DepositCoupon {
  code: string;
  bonusPercentage: number;
  isActive: boolean;
  expiryDate?: string;
}

export interface CurrencyRates {
  INR: number;
  PKR: number;
  BDT: number;
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
  currencyRates?: CurrencyRates;
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
      vipCoupons: [],
      currencyRates: {
        INR: 83.5,
        PKR: 278.5,
        BDT: 110.2
      }
    };
  },

  async getSettings(): Promise<AppSettings> {
    try {
      const { data, error } = await supabase
        .from(SETTINGS_TABLE)
        .select('*')
        .eq('id', APP_SETTINGS_ID)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return this.getDefaultSettings();
        throw error;
      }

      return {
        announcement: data.announcement || '',
        announcementLink: data.announcementLink || '',
        announcementCountdown: data.announcementCountdown || '',
        categories: data.categories || this.getDefaultSettings().categories,
        coupons: data.coupons || [],
        depositCoupons: data.depositCoupons || [],
        toolCoupons: data.toolCoupons || [],
        vipCoupons: data.vipCoupons || [],
        featuredToolIds: data.featuredToolIds || [],
        currencyRates: data.currencyRates || this.getDefaultSettings().currencyRates
      };
    } catch (error) {
      console.error('Error fetching settings:', error);
      return this.getDefaultSettings();
    }
  },

  async updateSettings(settings: AppSettings) {
    try {
      const { error } = await supabase
        .from(SETTINGS_TABLE)
        .upsert({ 
          id: APP_SETTINGS_ID,
          ...settings,
          updatedAt: new Date().toISOString()
        });
      
      if (error) throw error;
      
      window.dispatchEvent(new Event('settings-updated'));
      return { error: null };
    } catch (error) {
      console.error('Error updating settings:', error);
      return { error };
    }
  }
};
