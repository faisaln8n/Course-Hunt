import { supabase } from '../supabase';
import { walletService } from './walletService';
import { userService } from './userService';

const VIP_REQUESTS_TABLE = 'vip_requests';

export interface VIPRequest {
  id: string;
  userId: string;
  userEmail: string;
  fullName: string;
  telegramUsername: string;
  whatsappNumber: string;
  amount: number;
  couponCode?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export const vipService = {
  async submitVIPRequest(data: {
    userId: string;
    userEmail: string;
    fullName: string;
    telegramUsername: string;
    whatsappNumber: string;
    amount: number;
    couponCode?: string;
  }) {
    try {
      // 1. Check balance
      const balance = await walletService.getBalance(data.userId);
      if (balance < data.amount) {
        return { success: false, error: 'Insufficient wallet balance' };
      }

      // 2. Deduct balance
      const deductResult = await walletService.deductFunds(data.userId, data.amount, `VIP Membership Request (${data.amount === 10 ? '1st Month' : 'Renewal'})`);
      if (!deductResult.success) {
        return { success: false, error: 'Failed to deduct funds' };
      }

      // 3. Create VIP request
      const requestData = {
        ...data,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const { data: insertedData, error } = await supabase
        .from(VIP_REQUESTS_TABLE)
        .insert(requestData)
        .select()
        .single();
      
      if (error) throw error;
      
      // 4. Update user status to pending
      await userService.updateUserProfile(data.userId, { vipStatus: 'pending' });

      return { success: true, id: insertedData.id };
    } catch (error) {
      console.error('Error submitting VIP request:', error);
      return { success: false, error: 'Failed to submit VIP request' };
    }
  },

  async approveVIPRequest(requestId: string, userId: string) {
    try {
      const { data: requestData, error: fetchError } = await supabase
        .from(VIP_REQUESTS_TABLE)
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (fetchError || !requestData) {
        return { success: false, error: 'Request not found' };
      }

      // Update request status
      const { error: updateError } = await supabase
        .from(VIP_REQUESTS_TABLE)
        .update({
          status: 'approved',
          updatedAt: new Date().toISOString()
        })
        .eq('id', requestId);
      
      if (updateError) throw updateError;

      // Calculate expiry date (30 days from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      // Update user profile
      const { data: userData } = await supabase
        .from('users')
        .select('vipRenewalCount')
        .eq('uid', userId)
        .single();

      await userService.updateUserProfile(userId, {
        vipStatus: 'active',
        vipExpiryDate: expiryDate.toISOString(),
        vipJoinDate: new Date().toISOString(),
        vipRenewalCount: (userData?.vipRenewalCount || 0) + 1
      });

      return { success: true };
    } catch (error) {
      console.error('Error approving VIP request:', error);
      return { success: false, error: 'Failed to approve VIP request' };
    }
  },

  async rejectVIPRequest(requestId: string, userId: string, refundAmount: number) {
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from(VIP_REQUESTS_TABLE)
        .update({
          status: 'rejected',
          updatedAt: new Date().toISOString()
        })
        .eq('id', requestId);
      
      if (updateError) throw updateError;

      // Refund funds
      await walletService.addFunds(userId, refundAmount, 'VIP Membership Request Rejected (Refund)');

      // Update user profile
      await userService.updateUserProfile(userId, {
        vipStatus: 'none'
      });

      return { success: true };
    } catch (error) {
      console.error('Error rejecting VIP request:', error);
      return { success: false, error: 'Failed to reject VIP request' };
    }
  },

  async getAllVIPRequests(): Promise<VIPRequest[]> {
    try {
      const { data, error } = await supabase
        .from(VIP_REQUESTS_TABLE)
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (error) throw error;
      return data as VIPRequest[];
    } catch (error) {
      console.error('Error getting all VIP requests:', error);
      return [];
    }
  },

  async getUserVIPRequests(userId: string): Promise<VIPRequest[]> {
    try {
      const { data, error } = await supabase
        .from(VIP_REQUESTS_TABLE)
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });
      
      if (error) throw error;
      return data as VIPRequest[];
    } catch (error) {
      console.error('Error getting user VIP requests:', error);
      return [];
    }
  }
};
