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
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Tool } from '../data/tools';

const TOOLS_COLLECTION = 'tools';

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
  }
};
