import { supabase } from '../supabase';

export interface Transaction {
  id?: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'course_purchase' | 'tool_purchase' | 'affiliate_commission' | 'vip_join' | 'refund' | 'purchase';
  description: string;
  timestamp: string;
  productName?: string;
}

export interface DepositRequest {
  id?: string;
  userId: string;
  userEmail: string;
  amount: number;
  method: 'bKash' | 'Binance';
  transactionId?: string;
  binanceUid?: string;
  screenshotUrl: string;
  couponCode?: string;
  status: 'Pending' | 'Paid' | 'Rejected' | 'Declined';
  timestamp: string;
}

export interface WithdrawalRequest {
  id?: string;
  userId: string;
  userEmail: string;
  amount: number;
  method: 'bKash' | 'Binance';
  details: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Processed';
  timestamp: string;
}

export interface ToolOrder {
  id?: string;
  userId: string;
  userEmail: string;
  toolId: string;
  toolTitle: string;
  amount: number;
  status: 'Ordered' | 'Purchased' | 'Rejected';
  accountInfo?: string;
  timestamp: string;
}

export interface CourseOrder {
  id?: string;
  userId: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  status: 'Pending' | 'Completed' | 'Rejected';
  timestamp: string;
}

export const walletService = {
  async getBalance(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('walletBalance')
        .eq('uid', userId)
        .single();
      if (error) throw error;
      return data?.walletBalance || 0;
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  },

  async submitDepositRequest(request: Omit<DepositRequest, 'id' | 'status' | 'timestamp'>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('deposit_requests')
        .insert({
          ...request,
          status: 'Pending',
          timestamp: new Date().toISOString()
        });
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error submitting deposit request:', error);
      return { success: false, error: error.message };
    }
  },

  async getDepositRequests(): Promise<DepositRequest[]> {
    try {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data as DepositRequest[];
    } catch (error) {
      console.error('Error getting deposit requests:', error);
      return [];
    }
  },

  async getAllWithdrawals(): Promise<WithdrawalRequest[]> {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data as WithdrawalRequest[];
    } catch (error) {
      console.error('Error getting withdrawals:', error);
      return [];
    }
  },

  async getAllToolOrders(): Promise<ToolOrder[]> {
    try {
      const { data, error } = await supabase
        .from('tool_orders')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data as ToolOrder[];
    } catch (error) {
      console.error('Error getting tool orders:', error);
      return [];
    }
  },

  async getAllCourseOrders(): Promise<CourseOrder[]> {
    try {
      const { data, error } = await supabase
        .from('course_orders')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data as CourseOrder[];
    } catch (error) {
      console.error('Error getting course orders:', error);
      return [];
    }
  },

  async getAllTransactions(): Promise<(Transaction & { userEmail?: string })[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          users:userId (email)
        `)
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      return data.map((t: any) => ({
        ...t,
        userEmail: t.users?.email || 'Unknown User'
      }));
    } catch (error) {
      console.error('Error getting all transactions:', error);
      return [];
    }
  },

  async getUserDepositRequests(userId: string): Promise<DepositRequest[]> {
    try {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('userId', userId)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data as DepositRequest[];
    } catch (error) {
      console.error('Error getting user deposit requests:', error);
      return [];
    }
  },

  async getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('userId', userId)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data as WithdrawalRequest[];
    } catch (error) {
      console.error('Error getting user withdrawals:', error);
      return [];
    }
  },

  async getUserToolOrders(userId: string): Promise<ToolOrder[]> {
    try {
      const { data, error } = await supabase
        .from('tool_orders')
        .select('*')
        .eq('userId', userId)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data as ToolOrder[];
    } catch (error) {
      console.error('Error getting user tool orders:', error);
      return [];
    }
  },

  async getUserCourseOrders(userId: string): Promise<CourseOrder[]> {
    try {
      const { data, error } = await supabase
        .from('course_orders')
        .select('*')
        .eq('userId', userId)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data as CourseOrder[];
    } catch (error) {
      console.error('Error getting user course orders:', error);
      return [];
    }
  },

  async updateDepositStatus(requestId: string, status: DepositRequest['status']): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: requestData, error: fetchError } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (fetchError || !requestData) throw new Error('Request not found');
      if (requestData.status !== 'Pending') throw new Error('Request already processed');

      const { error: updateError } = await supabase
        .from('deposit_requests')
        .update({ status })
        .eq('id', requestId);
      
      if (updateError) throw updateError;

      if (status === 'Paid') {
        let finalAmount = requestData.amount;
        let bonusAmount = 0;
        
        if (requestData.couponCode) {
          const { data: settings } = await supabase
            .from('settings')
            .select('depositCoupons')
            .eq('id', 'app_settings')
            .single();
          
          if (settings) {
            const coupon = (settings.depositCoupons || []).find((c: any) => 
              c.code === requestData.couponCode && 
              c.isActive && 
              (!c.expiryDate || new Date(c.expiryDate) > new Date())
            );
            if (coupon) {
              bonusAmount = (requestData.amount * coupon.bonusPercentage) / 100;
              finalAmount += bonusAmount;
            }
          }
        }

        // Update user balance and lifetime deposit
        const { data: userData } = await supabase
          .from('users')
          .select('walletBalance, lifetimeDeposit')
          .eq('uid', requestData.userId)
          .single();
        
        if (userData) {
          await supabase
            .from('users')
            .update({
              walletBalance: (userData.walletBalance || 0) + finalAmount,
              lifetimeDeposit: (userData.lifetimeDeposit || 0) + requestData.amount
            })
            .eq('uid', requestData.userId);
        }

        await supabase.from('transactions').insert({
          userId: requestData.userId,
          amount: finalAmount,
          type: 'deposit',
          description: `Deposit via ${requestData.method} approved${bonusAmount > 0 ? ` (Includes $${bonusAmount.toFixed(2)} bonus)` : ''}`,
          timestamp: new Date().toISOString()
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating deposit status:', error);
      return { success: false, error: error.message };
    }
  },

  async getTransactions(userId: string): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('userId', userId)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  },

  async deductFunds(userId: string, amount: number, description: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('walletBalance')
        .eq('uid', userId)
        .single();
      
      if (fetchError || !userData) throw new Error('User not found');
      
      const currentBalance = userData.walletBalance || 0;
      if (currentBalance < amount) throw new Error('Insufficient balance');

      const { error: updateError } = await supabase
        .from('users')
        .update({ walletBalance: currentBalance - amount })
        .eq('uid', userId);
      
      if (updateError) throw updateError;

      await supabase.from('transactions').insert({
        userId,
        amount: -amount,
        type: 'purchase',
        description,
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error deducting funds:', error);
      return { success: false, error: error.message };
    }
  },

  async addFunds(userId: string, amount: number, description: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('walletBalance')
        .eq('uid', userId)
        .single();
      
      await supabase
        .from('users')
        .update({ walletBalance: (userData?.walletBalance || 0) + amount })
        .eq('uid', userId);

      await supabase.from('transactions').insert({
        userId,
        amount,
        type: 'deposit',
        description,
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error adding funds:', error);
      return { success: false, error: error.message };
    }
  },

  async purchaseCourse(userId: string, courseId: string, amount: number, courseTitle: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('uid', userId)
        .single();
      
      if (fetchError || !userData) throw new Error('User not found');
      
      const currentBalance = userData.walletBalance || 0;
      const purchasedCourses = userData.purchasedCourses || [];
      const referredBy = userData.referredBy;
      
      if (currentBalance < amount) throw new Error('Insufficient balance');

      await supabase
        .from('users')
        .update({ walletBalance: currentBalance - amount })
        .eq('uid', userId);

      await supabase.from('course_orders').insert({
        userId,
        userEmail: userData.email,
        courseId,
        courseTitle,
        amount,
        status: 'Pending',
        timestamp: new Date().toISOString()
      });

      await supabase.from('transactions').insert({
        userId,
        amount: -amount,
        type: 'course_purchase',
        productName: courseTitle,
        description: `Purchased course: ${courseTitle}`,
        timestamp: new Date().toISOString()
      });

      if (referredBy && purchasedCourses.length === 0) {
        const commission = amount * 0.3;
        const { data: referrerData } = await supabase
          .from('users')
          .select('affiliateBalance')
          .eq('uid', referredBy)
          .single();
        
        await supabase
          .from('users')
          .update({ affiliateBalance: (referrerData?.affiliateBalance || 0) + commission })
          .eq('uid', referredBy);

        await supabase.from('transactions').insert({
          userId: referredBy,
          amount: commission,
          type: 'affiliate_commission',
          description: `Referral commission from ${userData.email}'s first purchase`,
          timestamp: new Date().toISOString()
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error purchasing course:', error);
      return { success: false, error: error.message };
    }
  },

  async checkoutCart(userId: string, userEmail: string, items: { id: string; type: 'course' | 'tool'; price: number; title: string }[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('walletBalance')
        .eq('uid', userId)
        .single();
      
      if (fetchError || !userData) throw new Error('User not found');
      
      const currentBalance = userData.walletBalance || 0;
      const totalAmount = items.reduce((acc, item) => acc + item.price, 0);
      
      if (currentBalance < totalAmount) throw new Error('Insufficient balance');

      await supabase
        .from('users')
        .update({ walletBalance: currentBalance - totalAmount })
        .eq('uid', userId);

      for (const item of items) {
        if (item.type === 'course') {
          await supabase.from('course_orders').insert({
            userId, userEmail, courseId: item.id, courseTitle: item.title, amount: item.price,
            status: 'Pending', timestamp: new Date().toISOString()
          });
        } else {
          await supabase.from('tool_orders').insert({
            userId, userEmail, toolId: item.id, toolTitle: item.title, amount: item.price,
            status: 'Ordered', timestamp: new Date().toISOString()
          });
        }

        await supabase.from('transactions').insert({
          userId, amount: -item.price, type: item.type === 'course' ? 'course_purchase' : 'tool_purchase',
          productName: item.title, description: `Purchased ${item.type}: ${item.title}`,
          timestamp: new Date().toISOString()
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error during checkout:', error);
      return { success: false, error: error.message };
    }
  },

  async addFundsByEmail(email: string, amount: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('uid, walletBalance')
        .eq('email', email)
        .single();
      
      if (fetchError || !userData) throw new Error('User with this email not found');

      await supabase
        .from('users')
        .update({ walletBalance: (userData.walletBalance || 0) + amount })
        .eq('uid', userData.uid);

      await supabase.from('transactions').insert({
        userId: userData.uid,
        amount,
        type: 'deposit',
        description: 'Funds added by administrator',
        timestamp: new Date().toISOString()
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error adding funds by email:', error);
      return { success: false, error: error.message };
    }
  },

  async submitWithdrawalRequest(request: Omit<WithdrawalRequest, 'id' | 'status' | 'timestamp'>): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('affiliateBalance')
        .eq('uid', request.userId)
        .single();
      
      if (fetchError || !userData) throw new Error('User not found');
      const affiliateBalance = userData.affiliateBalance || 0;
      
      if (affiliateBalance < request.amount) throw new Error('Insufficient affiliate balance');

      await supabase
        .from('users')
        .update({ affiliateBalance: affiliateBalance - request.amount })
        .eq('uid', request.userId);

      await supabase.from('withdrawals').insert({
        ...request,
        status: 'Pending',
        timestamp: new Date().toISOString()
      });

      await supabase.from('transactions').insert({
        userId: request.userId,
        amount: -request.amount,
        type: 'withdrawal',
        description: `Withdrawal request submitted via ${request.method}`,
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error submitting withdrawal:', error);
      return { success: false, error: error.message };
    }
  },

  async updateWithdrawalStatus(requestId: string, status: WithdrawalRequest['status']): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: requestData, error: fetchError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (fetchError || !requestData) throw new Error('Request not found');
      if (requestData.status === 'Processed' || requestData.status === 'Rejected') throw new Error('Request already finalized');

      await supabase
        .from('withdrawals')
        .update({ status })
        .eq('id', requestId);

      if (status === 'Rejected') {
        const { data: userData } = await supabase
          .from('users')
          .select('affiliateBalance')
          .eq('uid', requestData.userId)
          .single();
        
        await supabase
          .from('users')
          .update({ affiliateBalance: (userData?.affiliateBalance || 0) + requestData.amount })
          .eq('uid', requestData.userId);

        await supabase.from('transactions').insert({
          userId: requestData.userId,
          amount: requestData.amount,
          type: 'refund',
          description: `Withdrawal request rejected - funds refunded`,
          timestamp: new Date().toISOString()
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating withdrawal status:', error);
      return { success: false, error: error.message };
    }
  },

  async orderTool(userId: string, userEmail: string, toolId: string, amount: number, toolTitle: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('walletBalance')
        .eq('uid', userId)
        .single();
      
      if (fetchError || !userData) throw new Error('User not found');
      
      const currentBalance = userData.walletBalance || 0;
      if (currentBalance < amount) throw new Error('Insufficient balance');

      await supabase
        .from('users')
        .update({ walletBalance: currentBalance - amount })
        .eq('uid', userId);

      await supabase.from('tool_orders').insert({
        userId, userEmail, toolId, toolTitle, amount,
        status: 'Ordered', timestamp: new Date().toISOString()
      });

      await supabase.from('transactions').insert({
        userId, amount: -amount, type: 'tool_purchase', productName: toolTitle,
        description: `Ordered tool: ${toolTitle}`, timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error ordering tool:', error);
      return { success: false, error: error.message };
    }
  },

  async updateToolOrderStatus(orderId: string, status: ToolOrder['status'], accountInfo?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: orderData, error: fetchError } = await supabase
        .from('tool_orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (fetchError || !orderData) throw new Error('Order not found');

      const updateData: any = { status };
      if (accountInfo !== undefined) updateData.accountInfo = accountInfo;
      
      await supabase
        .from('tool_orders')
        .update(updateData)
        .eq('id', orderId);

      if (status === 'Rejected') {
        const { data: userData } = await supabase
          .from('users')
          .select('walletBalance')
          .eq('uid', orderData.userId)
          .single();
        
        await supabase
          .from('users')
          .update({ walletBalance: (userData?.walletBalance || 0) + orderData.amount })
          .eq('uid', orderData.userId);

        await supabase.from('transactions').insert({
          userId: orderData.userId, amount: orderData.amount, type: 'refund',
          description: `Tool order rejected - funds refunded: ${orderData.toolTitle}`,
          timestamp: new Date().toISOString()
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating tool order status:', error);
      return { success: false, error: error.message };
    }
  },

  async updateCourseOrderStatus(orderId: string, status: CourseOrder['status']): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: orderData, error: fetchError } = await supabase
        .from('course_orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (fetchError || !orderData) throw new Error('Order not found');

      await supabase
        .from('course_orders')
        .update({ status })
        .eq('id', orderId);

      if (status === 'Completed') {
        const { data: userData } = await supabase
          .from('users')
          .select('purchasedCourses')
          .eq('uid', orderData.userId)
          .single();
        
        const purchasedCourses = userData?.purchasedCourses || [];
        if (!purchasedCourses.includes(orderData.courseId)) {
          await supabase
            .from('users')
            .update({ purchasedCourses: [...purchasedCourses, orderData.courseId] })
            .eq('uid', orderData.userId);
        }
      } else if (status === 'Rejected') {
        const { data: userData } = await supabase
          .from('users')
          .select('walletBalance')
          .eq('uid', orderData.userId)
          .single();
        
        await supabase
          .from('users')
          .update({ walletBalance: (userData?.walletBalance || 0) + orderData.amount })
          .eq('uid', orderData.userId);

        await supabase.from('transactions').insert({
          userId: orderData.userId, amount: orderData.amount, type: 'refund',
          description: `Course order rejected - funds refunded: ${orderData.courseTitle}`,
          timestamp: new Date().toISOString()
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating course order status:', error);
      return { success: false, error: error.message };
    }
  }
};
