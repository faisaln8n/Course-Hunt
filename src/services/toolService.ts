import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { Tool } from '../data/tools';
import { Review } from '../data/courses';

const TOOLS_COLLECTION = 'tools';
const REVIEWS_COLLECTION = 'reviews';

export const toolService = {
  async getTools(): Promise<Tool[]> {
    try {
      const q = query(collection(db, TOOLS_COLLECTION), orderBy('title', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data() as any,
        id: doc.id
      })) as Tool[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, TOOLS_COLLECTION);
      return [];
    }
  },

  async getToolById(id: string): Promise<Tool | undefined> {
    const path = `${TOOLS_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, TOOLS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as Tool;
      }
      return undefined;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return undefined;
    }
  },

  async updateTool(updatedTool: Tool) {
    const path = `${TOOLS_COLLECTION}/${updatedTool.id}`;
    try {
      const { id, ...data } = updatedTool;
      const docRef = doc(db, TOOLS_COLLECTION, id);
      
      const sanitizedData = JSON.parse(JSON.stringify(data));
      
      await updateDoc(docRef, {
        ...sanitizedData,
        updatedAt: serverTimestamp()
      });
      return { error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      return { error };
    }
  },

  async addTool(newTool: Omit<Tool, 'id'>) {
    try {
      const sanitizedTool = JSON.parse(JSON.stringify(newTool));
      
      const docRef = await addDoc(collection(db, TOOLS_COLLECTION), {
        ...sanitizedTool,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, TOOLS_COLLECTION);
      return { id: null, error };
    }
  },

  async deleteTool(id: string) {
    const path = `${TOOLS_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, TOOLS_COLLECTION, id);
      await deleteDoc(docRef);
      return { error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      return { error };
    }
  },

  subscribeToTools(callback: (tools: Tool[]) => void) {
    const q = query(collection(db, TOOLS_COLLECTION), orderBy('title', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tools = snapshot.docs.map(doc => ({
        ...doc.data() as any,
        id: doc.id
      })) as Tool[];
      callback(tools);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, TOOLS_COLLECTION);
    });

    return unsubscribe;
  },

  async getReviews(toolId: string): Promise<Review[]> {
    try {
      const q = query(
        collection(db, REVIEWS_COLLECTION), 
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const allReviews = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as unknown as Review[];
      
      return allReviews.filter(r => String(r.tool_id) === String(toolId));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, REVIEWS_COLLECTION);
      return [];
    }
  },

  async addReview(review: Omit<Review, 'id' | 'created_at'> & { tool_id: string }) {
    try {
      const newReviewData = {
        ...review,
        uid: auth.currentUser?.uid || null,
        created_at: new Date().toISOString(),
        timestamp: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), newReviewData);
      const newReview: Review = {
        ...newReviewData,
        id: docRef.id
      } as unknown as Review;

      await this.updateToolStats(review.tool_id);

      return { data: newReview, error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, REVIEWS_COLLECTION);
      return { data: null, error };
    }
  },

  async updateToolStats(toolId: string) {
    try {
      const reviews = await this.getReviews(toolId);
      const totalRating = reviews.reduce((acc, r) => acc + r.rating, 0);
      const averageRating = reviews.length > 0 ? Math.round((totalRating / reviews.length) * 10) / 10 : 0;

      const toolRef = doc(db, TOOLS_COLLECTION, toolId);
      await updateDoc(toolRef, {
        rating: averageRating,
        reviews: reviews.length
      });
    } catch (error) {
      console.error("Error updating tool stats:", error);
    }
  }
};
