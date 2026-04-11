import { supabase } from '../supabase';

const GUEST_WISHLIST_KEY = 'course_hunt_wishlist_guest';
let currentUserId: string | null = null;

export const wishlistService = {
  setUserId(userId: string | null) {
    if (currentUserId === userId) return;
    currentUserId = userId;
    
    if (userId) {
      supabase
        .from('wishlists')
        .select('items')
        .eq('userId', userId)
        .single()
        .then(({ data, error }) => {
          if (data && !error) {
            const items = data.items || [];
            const userKey = `course_hunt_wishlist_${userId}`;
            localStorage.setItem(userKey, JSON.stringify(items));
            window.dispatchEvent(new Event('wishlist-updated'));
          }
        })
        .catch((error) => {
          console.error('Error fetching wishlist:', error);
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
        const { error } = await supabase
          .from('wishlists')
          .upsert({
            userId: currentUserId,
            items: items,
            updatedAt: new Date().toISOString()
          }, { onConflict: 'userId' });
        
        if (error) throw error;
      } catch (error) {
        console.error('Error saving wishlist:', error);
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
