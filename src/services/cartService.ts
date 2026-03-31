import { Course } from '../data/courses';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const GUEST_CART_KEY = 'course_hunt_cart_guest';
let currentUserId: string | null = null;
let unsubscribe: (() => void) | null = null;

export const cartService = {
  setUserId(userId: string | null) {
    if (currentUserId === userId) return;
    currentUserId = userId;
    
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    if (userId) {
      // Set up real-time sync with Firestore for logged-in users
      const cartRef = doc(db, 'carts', userId);
      unsubscribe = onSnapshot(cartRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const items = data.items || [];
          const userKey = `course_hunt_cart_${userId}`;
          localStorage.setItem(userKey, JSON.stringify(items));
          window.dispatchEvent(new Event('cart-updated'));
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `carts/${userId}`);
      });
    }
    
    window.dispatchEvent(new Event('cart-updated'));
  },

  getCartItems(): (string | number)[] {
    if (currentUserId) {
      // For now, we'll use a hybrid approach: localStorage for speed, 
      // but scoped to the user. Firestore sync handles persistence across devices.
      const userKey = `course_hunt_cart_${currentUserId}`;
      const stored = localStorage.getItem(userKey);
      return stored ? JSON.parse(stored) : [];
    } else {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      return stored ? JSON.parse(stored) : [];
    }
  },

  async addToCart(courseId: string | number) {
    const items = this.getCartItems();
    if (!items.includes(courseId)) {
      items.push(courseId);
      this._saveCart(items);
    }
  },

  async removeFromCart(courseId: string | number) {
    const items = this.getCartItems().filter(id => id !== courseId);
    this._saveCart(items);
  },

  async _saveCart(items: (string | number)[]) {
    if (currentUserId) {
      const userKey = `course_hunt_cart_${currentUserId}`;
      localStorage.setItem(userKey, JSON.stringify(items));
      
      // Sync to Firestore
      try {
        const cartRef = doc(db, 'carts', currentUserId);
        await setDoc(cartRef, {
          userId: currentUserId,
          items: items.map(String),
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `carts/${currentUserId}`);
      }
    } else {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    }
    window.dispatchEvent(new Event('cart-updated'));
  },

  getCartCount(): number {
    return this.getCartItems().length;
  },

  isInCart(courseId: string | number): boolean {
    return this.getCartItems().includes(courseId);
  },

  async clearCart() {
    this._saveCart([]);
  }
};
