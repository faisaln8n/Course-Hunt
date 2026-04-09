import { Course } from '../data/courses';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface CartItem {
  id: string | number;
  type: 'course' | 'tool';
}

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
      // One-time fetch from Firestore for logged-in users
      const cartRef = doc(db, 'carts', userId);
      getDoc(cartRef).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const items = data.items || [];
          const userKey = `course_hunt_cart_${userId}`;
          localStorage.setItem(userKey, JSON.stringify(items));
          window.dispatchEvent(new Event('cart-updated'));
        }
      }).catch((error) => {
        handleFirestoreError(error, OperationType.GET, `carts/${userId}`);
      });
    }
    
    window.dispatchEvent(new Event('cart-updated'));
  },

  getCartItems(): CartItem[] {
    let items: CartItem[] = [];
    if (currentUserId) {
      const userKey = `course_hunt_cart_${currentUserId}`;
      const stored = localStorage.getItem(userKey);
      items = stored ? JSON.parse(stored) : [];
    } else {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      items = stored ? JSON.parse(stored) : [];
    }
    
    // Migration: if items are just IDs (old format), convert them to courses
    if (items.length > 0 && (typeof items[0] === 'string' || typeof items[0] === 'number')) {
      return (items as unknown as (string | number)[]).map(id => ({ id, type: 'course' }));
    }
    
    return items;
  },

  async addToCart(id: string | number, type: 'course' | 'tool' = 'course') {
    const items = this.getCartItems();
    if (!items.find(item => item.id === id && item.type === type)) {
      items.push({ id, type });
      this._saveCart(items);
    }
  },

  async removeFromCart(id: string | number, type: 'course' | 'tool') {
    const items = this.getCartItems().filter(item => !(item.id === id && item.type === type));
    this._saveCart(items);
  },

  async _saveCart(items: CartItem[]) {
    if (currentUserId) {
      const userKey = `course_hunt_cart_${currentUserId}`;
      localStorage.setItem(userKey, JSON.stringify(items));
      
      // Sync to Firestore
      try {
        const cartRef = doc(db, 'carts', currentUserId);
        await setDoc(cartRef, {
          userId: currentUserId,
          items: items,
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

  isInCart(id: string | number, type: 'course' | 'tool'): boolean {
    return !!this.getCartItems().find(item => item.id === id && item.type === type);
  },

  async clearCart() {
    this._saveCart([]);
  }
};
