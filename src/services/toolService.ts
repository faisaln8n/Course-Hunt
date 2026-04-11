import { supabase } from '../supabase';
import { Tool } from '../data/tools';
import { Review } from '../data/courses';

const TOOLS_TABLE = 'tools';
const REVIEWS_TABLE = 'reviews';

export const toolService = {
  async getTools(): Promise<Tool[]> {
    try {
      const { data, error } = await supabase
        .from(TOOLS_TABLE)
        .select('*')
        .order('title', { ascending: true });
      
      if (error) throw error;
      return data as Tool[];
    } catch (error) {
      console.error('Error fetching tools:', error);
      return [];
    }
  },

  async getToolById(id: string): Promise<Tool | undefined> {
    try {
      const { data, error } = await supabase
        .from(TOOLS_TABLE)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return data as Tool;
    } catch (error) {
      console.error('Error fetching tool by id:', error);
      return undefined;
    }
  },

  async updateTool(updatedTool: Tool) {
    try {
      const { id, ...data } = updatedTool;
      const { error } = await supabase
        .from(TOOLS_TABLE)
        .update({
          ...data,
          updatedAt: new Date().toISOString()
        })
        .eq('id', id);
      
      return { error };
    } catch (error) {
      console.error('Error updating tool:', error);
      return { error };
    }
  },

  async addTool(newTool: Omit<Tool, 'id'>) {
    try {
      const { data, error } = await supabase
        .from(TOOLS_TABLE)
        .insert({
          ...newTool,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .select()
        .single();
      
      return { id: data?.id || null, error };
    } catch (error) {
      console.error('Error adding tool:', error);
      return { id: null, error };
    }
  },

  async deleteTool(id: string) {
    try {
      const { error } = await supabase
        .from(TOOLS_TABLE)
        .delete()
        .eq('id', id);
      return { error };
    } catch (error) {
      console.error('Error deleting tool:', error);
      return { error };
    }
  },

  async getReviews(toolId: string): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from(REVIEWS_TABLE)
        .select('*')
        .eq('tool_id', toolId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as Review[];
    } catch (error) {
      console.error('Error fetching tool reviews:', error);
      return [];
    }
  },

  async addReview(review: Omit<Review, 'id' | 'created_at'> & { tool_id: string }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newReviewData = {
        ...review,
        uid: user?.id || null,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from(REVIEWS_TABLE)
        .insert(newReviewData)
        .select()
        .single();

      if (error) throw error;

      await this.updateToolStats(review.tool_id);

      return { data: data as unknown as Review, error: null };
    } catch (error) {
      console.error('Error adding tool review:', error);
      return { data: null, error };
    }
  },

  async updateToolStats(toolId: string) {
    try {
      const reviews = await this.getReviews(toolId);
      const totalRating = reviews.reduce((acc, r) => acc + r.rating, 0);
      const averageRating = reviews.length > 0 ? Math.round((totalRating / reviews.length) * 10) / 10 : 0;

      const { error } = await supabase
        .from(TOOLS_TABLE)
        .update({
          rating: averageRating,
          reviews: reviews.length
        })
        .eq('id', toolId);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error updating tool stats:", error);
    }
  }
};
