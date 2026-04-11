import { supabase } from '../supabase';

const CLICKS_TABLE = 'clicks';

export interface ClickEvent {
  id: string;
  courseId?: string;
  toolId?: string;
  uid: string | null;
  timestamp: string;
  trafficSource: string;
}

export const analyticsService = {
  async recordClick(id: string | number, type: 'course' | 'tool' = 'course') {
    try {
      // Get traffic source from URL or referrer
      const urlParams = new URLSearchParams(window.location.search);
      let source = urlParams.get('utm_source') || urlParams.get('ref') || 'Direct';
      
      if (source === 'Direct' && document.referrer) {
        try {
          const referrer = new URL(document.referrer).hostname;
          if (referrer.includes('facebook.com')) source = 'Facebook';
          else if (referrer.includes('t.co') || referrer.includes('twitter.com')) source = 'Twitter';
          else if (referrer.includes('instagram.com')) source = 'Instagram';
          else if (referrer.includes('linkedin.com')) source = 'LinkedIn';
          else if (referrer.includes('youtube.com')) source = 'YouTube';
          else if (referrer.includes('google.com')) source = 'Google Search';
          else source = `Referral: ${referrer}`;
        } catch (e) {
          source = 'Referral: Unknown';
        }
      }

      // Check if this item has already been clicked in this session
      const sessionKey = `clicked_${type}_${id}`;
      if (sessionStorage.getItem(sessionKey)) {
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const clickData: any = {
        uid: user?.id || null,
        timestamp: new Date().toISOString(),
        trafficSource: source
      };

      if (type === 'course') {
        clickData.courseId = String(id);
      } else {
        clickData.toolId = String(id);
      }

      const { error } = await supabase
        .from(CLICKS_TABLE)
        .insert(clickData);
      
      if (error) throw error;

      // Update user lifetime clicks if logged in
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('lifetimeClicks')
          .eq('uid', user.id)
          .single();
        
        if (userData) {
          await supabase
            .from('users')
            .update({
              lifetimeClicks: (userData.lifetimeClicks || 0) + 1
            })
            .eq('uid', user.id);
        }
      }

      // Mark as clicked in this session
      sessionStorage.setItem(sessionKey, 'true');
      
      window.dispatchEvent(new Event('analytics-updated'));
    } catch (error) {
      console.error('Error recording click:', error);
    }
  },

  async getClicks(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from(CLICKS_TABLE)
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching clicks:', error);
      return [];
    }
  },

  async getClickDataForChart(days: number = 7, courseId?: string | number) {
    try {
      const { data: clicks, error } = await supabase
        .from(CLICKS_TABLE)
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;

      const data: Record<string, number> = {};
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        data[dateStr] = 0;
      }

      clicks.forEach(click => {
        if (!click.timestamp) return;
        const clickDate = new Date(click.timestamp);
        const dateStr = clickDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        if (data[dateStr] !== undefined) {
          if (!courseId || String(click.courseId) === String(courseId)) {
            data[dateStr]++;
          }
        }
      });

      return Object.entries(data).map(([name, clicks]) => ({ name, clicks }));
    } catch (error) {
      console.error('Error fetching click data for chart:', error);
      return [];
    }
  },

  async getTopProducts(limitCount: number = 5) {
    try {
      const { data: clicks, error } = await supabase
        .from(CLICKS_TABLE)
        .select('courseId');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      clicks.forEach(click => {
        if (click.courseId) {
          counts[click.courseId] = (counts[click.courseId] || 0) + 1;
        }
      });

      return Object.entries(counts)
        .map(([courseId, count]) => ({ courseId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limitCount);
    } catch (error) {
      console.error('Error fetching top products:', error);
      return [];
    }
  },

  async getTrafficSourceStats() {
    try {
      const { data: clicks, error } = await supabase
        .from(CLICKS_TABLE)
        .select('trafficSource');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      clicks.forEach(click => {
        const source = click.trafficSource || 'Direct';
        counts[source] = (counts[source] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error fetching traffic source stats:', error);
      return [];
    }
  }
};
