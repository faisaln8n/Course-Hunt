/**
 * Simple localStorage caching utility with expiry
 */
export const cache = {
  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to store
   * @param ttl Time to live in milliseconds (default 10 minutes)
   */
  set(key: string, value: any, ttl: number = 10 * 60 * 1000) {
    if (typeof window === 'undefined') return;
    
    const item = {
      value,
      expiry: Date.now() + ttl,
    };
    localStorage.setItem(key, JSON.stringify(item));
  },

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns The cached value or null if expired/not found
   */
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;

    try {
      const item = JSON.parse(itemStr);
      if (Date.now() > item.expiry) {
        localStorage.removeItem(key);
        return null;
      }
      return item.value as T;
    } catch (e) {
      localStorage.removeItem(key);
      return null;
    }
  },

  /**
   * Remove an item from the cache
   * @param key Cache key
   */
  remove(key: string) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },

  /**
   * Clear all items from the cache
   */
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  }
};
