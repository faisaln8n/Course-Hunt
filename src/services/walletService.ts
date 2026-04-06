import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  onSnapshot,
  query, 
  where, 
  getDocs, 
  orderBy, 
  serverTimestamp,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Transaction {
  id?: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'purchase';
  description: string;
  timestamp: any;
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
  timestamp: any;
}

export interface WithdrawalRequest {
  id?: string;
  userId: string;
  userEmail: string;
  amount: number;
  method: 'bKash' | 'Binance';
  details: string; // bKash number or Binance UID
  status: 'Pending' | 'Approved' | 'Rejected' | 'Processed';
  timestamp: any;
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
  timestamp: any;
}

export const walletService = {
  async getBalance(userId: string): Promise<number> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().walletBalance || 0;
    }
    return 0;
  },

  async submitDepositRequest(request: Omit<DepositRequest, 'id' | 'status' | 'timestamp'>): Promise<{ success: boolean; error?: string }> {
    try {
      const data: any = {
        userId: request.userId,
        userEmail: request.userEmail,
        amount: request.amount,
        method: request.method,
        screenshotUrl: request.screenshotUrl,
        status: 'Pending',
        timestamp: serverTimestamp()
      };

      if (request.transactionId !== undefined) data.transactionId = request.transactionId;
      if (request.binanceUid !== undefined) data.binanceUid = request.binanceUid;
      if (request.couponCode !== undefined) data.couponCode = request.couponCode;

      await addDoc(collection(db, 'deposit_requests'), data);
      return { success: true };
    } catch (error: any) {
      console.error('Error submitting deposit request:', error);
      return { success: false, error: error.message };
    }
  },

  onDepositRequestsSnapshot(callback: (requests: DepositRequest[]) => void): () => void {
    const q = query(
      collection(db, 'deposit_requests'),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DepositRequest[];
      callback(requests);
    }, (error) => {
      console.error("Error fetching deposit requests:", error);
    });
  },

  onUserDepositRequestsSnapshot(userId: string, callback: (requests: DepositRequest[]) => void): () => void {
    const q = query(
      collection(db, 'deposit_requests'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DepositRequest[];
      callback(requests);
    }, (error) => {
      console.error("Error fetching user deposit requests:", error);
    });
  },

  async updateDepositStatus(requestId: string, status: DepositRequest['status']): Promise<{ success: boolean; error?: string }> {
    try {
      const requestRef = doc(db, 'deposit_requests', requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) throw new Error('Request not found');
      
      const requestData = requestDoc.data() as DepositRequest;
      
      if (requestData.status !== 'Pending') {
        throw new Error('Request already processed');
      }

      await updateDoc(requestRef, { status });

      if (status === 'Paid') {
        let finalAmount = requestData.amount;
        let bonusAmount = 0;
        
        if (requestData.couponCode) {
          const settingsDoc = await getDoc(doc(db, 'settings', 'app_settings'));
          if (settingsDoc.exists()) {
            const settings = settingsDoc.data();
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

        const userRef = doc(db, 'users', requestData.userId);
        await updateDoc(userRef, {
          walletBalance: increment(finalAmount)
        });

        await addDoc(collection(db, 'transactions'), {
          userId: requestData.userId,
          amount: finalAmount,
          type: 'deposit',
          description: `Deposit via ${requestData.method} approved${bonusAmount > 0 ? ` (Includes $${bonusAmount.toFixed(2)} bonus)` : ''}`,
          timestamp: serverTimestamp()
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating deposit status:', error);
      return { success: false, error: error.message };
    }
  },

  async getTransactions(userId: string): Promise<Transaction[]> {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const transactions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Transaction[];
    
    // Sort in memory to avoid composite index requirement
    transactions.sort((a, b) => {
      const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
      const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
      return timeB - timeA;
    });
    
    return transactions;
  },

  onTransactionsSnapshot(userId: string, callback: (transactions: Transaction[]) => void): () => void {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      
      // Sort in memory to avoid composite index requirement
      transactions.sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
        return timeB - timeA;
      });
      
      callback(transactions);
    }, (error) => {
      console.error("Error fetching transactions:", error);
    });
  },

  onAllTransactionsSnapshot(callback: (transactions: (Transaction & { userEmail?: string })[]) => void): () => void {
    const q = query(
      collection(db, 'transactions'),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, async (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (Transaction & { userEmail?: string })[];
      
      // Fetch user emails for each transaction
      const userIds = [...new Set(transactions.map(t => t.userId))];
      const userEmails: Record<string, string> = {};
      
      for (const userId of userIds) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          userEmails[userId] = userDoc.data().email;
        }
      }
      
      const transactionsWithEmails = transactions.map(t => ({
        ...t,
        userEmail: userEmails[t.userId] || 'Unknown User'
      }));
      
      callback(transactionsWithEmails);
    }, (error) => {
      console.error("Error fetching all transactions:", error);
    });
  },

  async purchaseCourse(userId: string, courseId: string, amount: number, courseTitle: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) throw new Error('User not found');
      
      const userData = userDoc.data();
      const currentBalance = userData.walletBalance || 0;
      const purchasedCourses = userData.purchasedCourses || [];
      const referredBy = userData.referredBy;
      
      if (purchasedCourses.includes(courseId)) {
        throw new Error('You already own this course');
      }
      
      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }

      // Update user balance and purchased courses
      await updateDoc(userRef, {
        walletBalance: increment(-amount),
        purchasedCourses: arrayUnion(courseId)
      });

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId,
        amount: -amount,
        type: 'purchase',
        description: `Purchased course: ${courseTitle}`,
        timestamp: serverTimestamp()
      });

      // Commission Logic: 30% on first purchase
      if (referredBy && purchasedCourses.length === 0) {
        const commission = amount * 0.3;
        const referrerRef = doc(db, 'users', referredBy);
        
        await updateDoc(referrerRef, {
          affiliateBalance: increment(commission)
        });

        // Record commission transaction for referrer
        await addDoc(collection(db, 'transactions'), {
          userId: referredBy,
          amount: commission,
          type: 'commission',
          description: `Referral commission from ${userData.email}'s first purchase`,
          timestamp: serverTimestamp()
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error purchasing course:', error);
      return { success: false, error: error.message };
    }
  },

  async addFundsByEmail(email: string, amount: number): Promise<{ success: boolean; error?: string }> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('User with this email not found');
      }

      const userDoc = querySnapshot.docs[0];
      const userRef = doc(db, 'users', userDoc.id);

      // Update user balance
      await updateDoc(userRef, {
        walletBalance: increment(amount)
      });

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId: userDoc.id,
        amount,
        type: 'deposit',
        description: 'Funds added by administrator',
        timestamp: serverTimestamp()
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error adding funds:', error);
      return { success: false, error: error.message };
    }
  },

  async submitWithdrawalRequest(request: Omit<WithdrawalRequest, 'id' | 'status' | 'timestamp'>): Promise<{ success: boolean; error?: string }> {
    try {
      const userRef = doc(db, 'users', request.userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) throw new Error('User not found');
      const affiliateBalance = userDoc.data().affiliateBalance || 0;
      
      if (affiliateBalance < request.amount) {
        throw new Error('Insufficient affiliate balance');
      }

      // Deduct from affiliate balance immediately (or wait for approval? usually deduct immediately to prevent double spend)
      await updateDoc(userRef, {
        affiliateBalance: increment(-request.amount)
      });

      await addDoc(collection(db, 'withdrawals'), {
        ...request,
        status: 'Pending',
        timestamp: serverTimestamp()
      });

      // Record withdrawal transaction
      await addDoc(collection(db, 'transactions'), {
        userId: request.userId,
        amount: -request.amount,
        type: 'withdrawal',
        description: `Withdrawal request submitted via ${request.method}`,
        timestamp: serverTimestamp()
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error submitting withdrawal:', error);
      return { success: false, error: error.message };
    }
  },

  onWithdrawalsSnapshot(userId: string, callback: (requests: WithdrawalRequest[]) => void): () => void {
    const q = query(
      collection(db, 'withdrawals'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WithdrawalRequest[];
      callback(requests);
    }, (error) => {
      console.error("Error fetching withdrawals:", error);
    });
  },

  onAllWithdrawalsSnapshot(callback: (requests: WithdrawalRequest[]) => void): () => void {
    const q = query(
      collection(db, 'withdrawals'),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WithdrawalRequest[];
      callback(requests);
    }, (error) => {
      console.error("Error fetching all withdrawals:", error);
    });
  },

  async updateWithdrawalStatus(requestId: string, status: WithdrawalRequest['status']): Promise<{ success: boolean; error?: string }> {
    try {
      const requestRef = doc(db, 'withdrawals', requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) throw new Error('Request not found');
      const requestData = requestDoc.data() as WithdrawalRequest;

      if (requestData.status === 'Processed' || requestData.status === 'Rejected') {
        throw new Error('Request already finalized');
      }

      await updateDoc(requestRef, { status });

      // If rejected, refund the affiliate balance
      if (status === 'Rejected') {
        const userRef = doc(db, 'users', requestData.userId);
        await updateDoc(userRef, {
          affiliateBalance: increment(requestData.amount)
        });

        await addDoc(collection(db, 'transactions'), {
          userId: requestData.userId,
          amount: requestData.amount,
          type: 'refund',
          description: `Withdrawal request rejected - funds refunded`,
          timestamp: serverTimestamp()
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
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) throw new Error('User not found');
      
      const userData = userDoc.data();
      const currentBalance = userData.walletBalance || 0;
      
      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }

      // Update user balance
      await updateDoc(userRef, {
        walletBalance: increment(-amount)
      });

      // Create tool order
      await addDoc(collection(db, 'tool_orders'), {
        userId,
        userEmail,
        toolId,
        toolTitle,
        amount,
        status: 'Ordered',
        timestamp: serverTimestamp()
      });

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId,
        amount: -amount,
        type: 'purchase',
        description: `Ordered tool: ${toolTitle}`,
        timestamp: serverTimestamp()
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error ordering tool:', error);
      return { success: false, error: error.message };
    }
  },

  onUserToolOrdersSnapshot(userId: string, callback: (orders: ToolOrder[]) => void): () => void {
    const q = query(
      collection(db, 'tool_orders'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ToolOrder[];
      callback(orders);
    }, (error) => {
      console.error("Error fetching user tool orders:", error);
    });
  },

  onAllToolOrdersSnapshot(callback: (orders: ToolOrder[]) => void): () => void {
    const q = query(
      collection(db, 'tool_orders'),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ToolOrder[];
      callback(orders);
    }, (error) => {
      console.error("Error fetching all tool orders:", error);
    });
  },

  async updateToolOrderStatus(orderId: string, status: ToolOrder['status'], accountInfo?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const orderRef = doc(db, 'tool_orders', orderId);
      const updateData: any = { status };
      if (accountInfo !== undefined) updateData.accountInfo = accountInfo;
      
      await updateDoc(orderRef, updateData);

      // If rejected, refund the wallet balance
      if (status === 'Rejected') {
        const orderDoc = await getDoc(orderRef);
        if (orderDoc.exists()) {
          const orderData = orderDoc.data() as ToolOrder;
          const userRef = doc(db, 'users', orderData.userId);
          await updateDoc(userRef, {
            walletBalance: increment(orderData.amount)
          });

          await addDoc(collection(db, 'transactions'), {
            userId: orderData.userId,
            amount: orderData.amount,
            type: 'refund',
            description: `Tool order rejected - funds refunded: ${orderData.toolTitle}`,
            timestamp: serverTimestamp()
          });
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating tool order status:', error);
      return { success: false, error: error.message };
    }
  }
};
