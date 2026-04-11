import { supabase } from '../supabase';

export interface CartItem {
  id: string | number;
  type: 'course' | 'tool';
}

const GUEST_CART_KEY = 'course_hunt_cart_guest';
let currentUserId: string | null = null;

export const cartService = {
  setUserId(userId: string | null) {
    if (currentUserId === userId) return;
    currentUserId = userId;
    
    if (userId) {
      // One-time fetch from Supabase for logged-in users
      supabase
        .from('carts')
        .select('items')
        .eq('userId', userId)
        .single()
        .then(({ data, error }) => {
          if (data && !error) {
            const items = data.items || [];
            const userKey = `course_hunt_cart_${userId}`;
            localStorage.setItem(userKey, JSON.stringify(items));
            window.dispatchEvent(new Event('cart-updated'));
          }
        })
        .catch((error) => {
          console.error('Error fetching cart:', error);
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
    
    if (items.length > 0 && (typeof items[0] === 'string' || typeof items[0] === 'number')) {
      return (items as unknown as (string | number)[]).map(id => ({ id, type: 'course' }));
    }
    
    return items;
  },

  async addToCart(id: string | number, type: 'course' | 'tool' = 'course') {
    const items = this.getCartItems();
    if (!items.find(item => item.id === id && item.type === type)) {
      items.push({ id, type });
      await this._saveCart(items);
    }
  },

  async removeFromCart(id: string | number, type: 'course' | 'tool') {
    const items = this.getCartItems().filter(item => !(item.id === id && item.type === type));
    await this._saveCart(items);
  },

  async _saveCart(items: CartItem[]) {
    if (currentUserId) {
      const userKey = `course_hunt_cart_${currentUserId}`;
      localStorage.setItem(userKey, JSON.stringify(items));
      
      try {
        const { error } = await supabase
          .from('carts')
          .upsert({
            userId: currentUserId,
            items: items,
            updatedAt: new Date().toISOString()
          }, { onConflict: 'userId' });
        
        if (error) throw error;
      } catch (error) {
        console.error('Error saving cart:', error);
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
    await this._saveCart([]);
  }
};
