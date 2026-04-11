import { supabase } from '../supabase';

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
  vipRenewalCount?: number;
  lifetimeDeposit?: number;
  lifetimeClicks?: number;
}

export const userService = {
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', uid)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  },

  async createUserProfile(profile: UserProfile): Promise<void> {
    try {
      const referredBy = localStorage.getItem('referredBy');
      
      const { error } = await supabase
        .from('users')
        .insert({
          uid: profile.uid,
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
          referralCode: profile.uid.substring(0, 8),
          referredBy: referredBy || null
        });

      if (error) throw error;

      if (referredBy) {
        localStorage.removeItem('referredBy');
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  },

  async updateUserProfile(uid: string, data: Partial<Omit<UserProfile, 'role' | 'uid' | 'email'>>): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('uid', uid);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  },

  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) throw error;
      return data as UserProfile[];
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  },

  async updateUserByAdmin(uid: string, data: Partial<UserProfile>): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('uid', uid);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating user by admin:', error);
    }
  },

  async getReferredUsers(referrerId: string): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('referredBy', referrerId);
      if (error) throw error;
      return data as UserProfile[];
    } catch (error) {
      console.error('Error fetching referred users:', error);
      return [];
    }
  }
};
