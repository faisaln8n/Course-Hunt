import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const GUEST_WISHLIST_KEY = 'course_hunt_wishlist_guest';
let currentUserId: string | null = null;
let unsubscribe: (() => void) | null = null;

export const wishlistService = {
  setUserId(userId: string | null) {
    if (currentUserId === userId) return;
    currentUserId = userId;
    
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    if (userId) {
      const wishlistRef = doc(db, 'wishlists', userId);
      unsubscribe = onSnapshot(wishlistRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const items = data.items || [];
          const userKey = `course_hunt_wishlist_${userId}`;
          localStorage.setItem(userKey, JSON.stringify(items));
          window.dispatchEvent(new Event('wishlist-updated'));
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `wishlists/${userId}`);
      });
    }
    
    window.dispatchEvent(new Event('wishlist-updated'));
  },

  getWishlistItems(): string[] {
    if (currentUserId) {
      const userKey = `course_hunt_wishlist_${currentUserId}`;
      const stored = localStorage.getItem(userKey);
      return stored ? JSON.parse(stored) : [];
    } else {
      const stored = localStorage.getItem(GUEST_WISHLIST_KEY);
      return stored ? JSON.parse(stored) : [];
    }
  },

  async toggleWishlist(courseId: string) {
    const items = this.getWishlistItems();
    const index = items.indexOf(courseId);
    if (index === -1) {
      items.push(courseId);
    } else {
      items.splice(index, 1);
    }
    await this._saveWishlist(items);
  },

  async addToWishlist(courseId: string) {
    const items = this.getWishlistItems();
    if (!items.includes(courseId)) {
      items.push(courseId);
      await this._saveWishlist(items);
    }
  },

  async removeFromWishlist(courseId: string) {
    const items = this.getWishlistItems().filter(id => id !== courseId);
    await this._saveWishlist(items);
  },

  async _saveWishlist(items: string[]) {
    if (currentUserId) {
      const userKey = `course_hunt_wishlist_${currentUserId}`;
      localStorage.setItem(userKey, JSON.stringify(items));
      
      try {
        const wishlistRef = doc(db, 'wishlists', currentUserId);
        await setDoc(wishlistRef, {
          userId: currentUserId,
          items: items,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `wishlists/${currentUserId}`);
      }
    } else {
      localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(items));
    }
    window.dispatchEvent(new Event('wishlist-updated'));
  },

  isInWishlist(courseId: string): boolean {
    return this.getWishlistItems().includes(courseId);
  }
};
