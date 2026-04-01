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

export const walletService = {
  async getBalance(userId: string): Promise<number> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().walletBalance || 0;
    }
    return 0;
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
      
      const currentBalance = userDoc.data().walletBalance || 0;
      const purchasedCourses = userDoc.data().purchasedCourses || [];
      
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
  }
};
