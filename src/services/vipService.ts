import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { walletService } from './walletService';
import { userService } from './userService';

const VIP_REQUESTS_COLLECTION = 'vip_requests';

export interface VIPRequest {
  id: string;
  userId: string;
  userEmail: string;
  fullName: string;
  telegramUsername: string;
  whatsappNumber: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  updatedAt: any;
}

export const vipService = {
  async submitVIPRequest(data: {
    userId: string;
    userEmail: string;
    fullName: string;
    telegramUsername: string;
    whatsappNumber: string;
    amount: number;
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, VIP_REQUESTS_COLLECTION), requestData);
      
      // 4. Update user status to pending
      await userService.updateUserProfile(data.userId, { vipStatus: 'pending' });

      return { success: true, id: docRef.id };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, VIP_REQUESTS_COLLECTION);
      return { success: false, error: 'Failed to submit VIP request' };
    }
  },

  async approveVIPRequest(requestId: string, userId: string) {
    try {
      const requestRef = doc(db, VIP_REQUESTS_COLLECTION, requestId);
      const requestSnap = await getDoc(requestRef);
      
      if (!requestSnap.exists()) {
        return { success: false, error: 'Request not found' };
      }

      const requestData = requestSnap.data() as VIPRequest;

      // Update request status
      await updateDoc(requestRef, {
        status: 'approved',
        updatedAt: serverTimestamp()
      });

      // Calculate expiry date (30 days from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      // Update user profile
      await userService.updateUserProfile(userId, {
        vipStatus: 'active',
        vipExpiryDate: expiryDate.toISOString(),
        vipJoinDate: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, VIP_REQUESTS_COLLECTION);
      return { success: false, error: 'Failed to approve VIP request' };
    }
  },

  async rejectVIPRequest(requestId: string, userId: string, refundAmount: number) {
    try {
      const requestRef = doc(db, VIP_REQUESTS_COLLECTION, requestId);
      
      // Update request status
      await updateDoc(requestRef, {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });

      // Refund funds
      await walletService.addFunds(userId, refundAmount, 'VIP Membership Request Rejected (Refund)');

      // Update user profile
      await userService.updateUserProfile(userId, {
        vipStatus: 'none'
      });

      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, VIP_REQUESTS_COLLECTION);
      return { success: false, error: 'Failed to reject VIP request' };
    }
  },

  onAllVIPRequestsSnapshot(callback: (requests: VIPRequest[]) => void) {
    const q = query(collection(db, VIP_REQUESTS_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as VIPRequest[];
      callback(requests);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, VIP_REQUESTS_COLLECTION);
    });
  },

  onUserVIPRequestSnapshot(userId: string, callback: (requests: VIPRequest[]) => void) {
    const q = query(
      collection(db, VIP_REQUESTS_COLLECTION), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as VIPRequest[];
      callback(requests);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, VIP_REQUESTS_COLLECTION);
    });
  }
};
