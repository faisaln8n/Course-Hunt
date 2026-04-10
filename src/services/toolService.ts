import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { Tool } from '../data/tools';
import { Review } from '../data/courses';
import { cache } from '../lib/cache';

const TOOLS_COLLECTION = 'tools';
const REVIEWS_COLLECTION = 'reviews';
const CACHE_KEY_TOOLS = 'cached_tools';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const toolService = {
  /**
   * Fetches tools with caching and optional pagination.
   * Caching ensures that repeated visits to the tools page don't consume extra read quota.
   */
  async getTools(lastDoc?: QueryDocumentSnapshot<DocumentData>): Promise<{ tools: Tool[], lastDoc?: QueryDocumentSnapshot<DocumentData> }> {
    // 1. Check cache first for first page
    if (!lastDoc) {
      const cached = cache.get<Tool[]>(CACHE_KEY_TOOLS);
      if (cached) {
        console.log('Serving tools from cache');
        return { tools: cached };
      }
    }

    try {
      // 2. Use limit() to only fetch a small batch of tools at a time
      let q = query(
        collection(db, TOOLS_COLLECTION), 
        orderBy('title', 'asc'),
        limit(20)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(q);
      const tools = querySnapshot.docs.map(doc => ({
        ...doc.data() as any,
        id: doc.id
      })) as Tool[];

      // 3. Cache the results to prevent redundant reads
      if (!lastDoc) {
        cache.set(CACHE_KEY_TOOLS, tools, CACHE_TTL);
      }

      return { 
        tools, 
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] 
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, TOOLS_COLLECTION);
      return { tools: [] };
    }
  },

  async getToolById(id: string | number): Promise<Tool | undefined> {
    const cacheKey = `tool_id_${id}`;
    const cached = cache.get<Tool>(cacheKey);
    if (cached) return cached;

    const path = `${TOOLS_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, TOOLS_COLLECTION, String(id));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = { ...docSnap.data(), id: docSnap.id } as unknown as Tool;
        cache.set(cacheKey, data, 30 * 60 * 1000); // 30 mins
        return data;
      }
      return undefined;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return undefined;
    }
  },

  async getAllToolsRaw(): Promise<Tool[]> {
    const cacheKey = `${CACHE_KEY_TOOLS}_all`;
    const cached = cache.get<Tool[]>(cacheKey);
    if (cached) return cached;

    try {
      const q = query(collection(db, TOOLS_COLLECTION), orderBy('title', 'asc'));
      const querySnapshot = await getDocs(q);
      const tools = querySnapshot.docs.map(doc => ({
        ...doc.data() as any,
        id: doc.id
      })) as Tool[];
      
      cache.set(cacheKey, tools, CACHE_TTL);
      return tools;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, TOOLS_COLLECTION);
      return [];
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
