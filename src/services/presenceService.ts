import { supabase } from '../supabase';
import { userService } from './userService';

const PRESENCE_TABLE = 'presence';
const ONLINE_THRESHOLD = 120000; // 2 minutes

export const presenceService = {
  privateHeartbeatInterval: null as any,
  privateGuestId: null as string | null,

  async startPresence() {
    if (this.privateHeartbeatInterval) return;

    const updatePresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      let uid = user?.id;
      
      if (!uid) {
        if (!this.privateGuestId) {
          this.privateGuestId = localStorage.getItem('presence_guest_id') || 'guest-' + Math.random().toString(36).substring(2, 15);
          localStorage.setItem('presence_guest_id', this.privateGuestId);
        }
        uid = this.privateGuestId;
      }

      let vipStatus = 'none';
      if (user) {
        try {
          const profile = await userService.getUserProfile(user.id);
          if (profile) {
            vipStatus = profile.vipStatus || 'none';
          }
        } catch (e) {
          console.error('Error fetching profile for presence:', e);
        }
      }

      try {
        const { error } = await supabase
          .from(PRESENCE_TABLE)
          .upsert({
            uid,
            lastSeen: new Date().toISOString(),
            isGuest: !user,
            email: user?.email || 'Guest',
            vipStatus
          }, { onConflict: 'uid' });
        
        if (error) throw error;
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    // Initial update
    await updatePresence();

    // Set interval for heartbeat
    this.privateHeartbeatInterval = setInterval(updatePresence, 60000);

    // Clean up on window close
    window.addEventListener('beforeunload', () => this.stopPresence());
  },

  stopPresence() {
    if (this.privateHeartbeatInterval) {
      clearInterval(this.privateHeartbeatInterval);
      this.privateHeartbeatInterval = null;
    }
  },

  async getLiveUsersCount(): Promise<number> {
    try {
      const now = new Date(Date.now() - ONLINE_THRESHOLD).toISOString();
      const { count, error } = await supabase
        .from(PRESENCE_TABLE)
        .select('*', { count: 'exact', head: true })
        .gt('lastSeen', now);
      
      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting live users count:', error);
      return 0;
    }
  },

  async getLiveUsers(): Promise<any[]> {
    try {
      const now = new Date(Date.now() - ONLINE_THRESHOLD).toISOString();
      const { data, error } = await supabase
        .from(PRESENCE_TABLE)
        .select('*')
        .gt('lastSeen', now)
        .order('lastSeen', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting live users:', error);
      return [];
    }
  },

  async cleanupPresence() {
    try {
      const threshold = new Date(Date.now() - ONLINE_THRESHOLD * 5).toISOString();
      const { error } = await supabase
        .from(PRESENCE_TABLE)
        .delete()
        .lt('lastSeen', threshold);
      if (error) throw error;
    } catch (error) {
      console.error('Error cleaning up presence:', error);
    }
  }
};
