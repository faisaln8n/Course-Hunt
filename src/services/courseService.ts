import { supabase } from '../supabase';
import { Course, Review } from '../data/courses';

const COURSES_TABLE = 'courses';
const REVIEWS_TABLE = 'reviews';

export const courseService = {
  async getCourses(): Promise<Course[]> {
    try {
      const { data, error } = await supabase
        .from(COURSES_TABLE)
        .select('*')
        .order('title', { ascending: true });
      
      if (error) throw error;
      
      return (data || [])
        .filter(course => course.title && course.image) as unknown as Course[];
    } catch (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
  },

  async getAllCoursesRaw(): Promise<Course[]> {
    try {
      const { data, error } = await supabase
        .from(COURSES_TABLE)
        .select('*')
        .order('title', { ascending: true });
      
      if (error) throw error;
      return data as unknown as Course[];
    } catch (error) {
      console.error('Error fetching all courses raw:', error);
      return [];
    }
  },

  async getCourseById(id: string | number): Promise<Course | undefined> {
    try {
      const { data, error } = await supabase
        .from(COURSES_TABLE)
        .select('*')
        .eq('id', String(id))
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return undefined;
        throw error;
      }
      return data as unknown as Course;
    } catch (error) {
      console.error('Error fetching course by id:', error);
      return undefined;
    }
  },

  async updateCourse(updatedCourse: Course) {
    try {
      const { id, ...data } = updatedCourse;
      const { error } = await supabase
        .from(COURSES_TABLE)
        .update({
          ...data,
          updatedAt: new Date().toISOString()
        })
        .eq('id', String(id));
      
      return { error };
    } catch (error) {
      console.error('Error updating course:', error);
      return { error };
    }
  },

  async addCourse(newCourse: Omit<Course, 'id'>) {
    try {
      const { data, error } = await supabase
        .from(COURSES_TABLE)
        .insert({
          ...newCourse,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .select();
      
      return { data, error };
    } catch (error) {
      console.error('Error adding course:', error);
      return { data: null, error };
    }
  },

  async deleteCourse(id: string | number) {
    try {
      const { error } = await supabase
        .from(COURSES_TABLE)
        .delete()
        .eq('id', String(id));
      return { error };
    } catch (error) {
      console.error('Error deleting course:', error);
      return { error };
    }
  },

  async getReviews(courseId: string | number): Promise<Review[]> {
    try {
      const { data, error } = await supabase
        .from(REVIEWS_TABLE)
        .select('*')
        .eq('course_id', String(courseId))
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as Review[];
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }
  },

  async addReview(review: Omit<Review, 'id' | 'created_at'>) {
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

      await this.updateCourseStats(review.course_id);

      return { data: data as unknown as Review, error: null };
    } catch (error) {
      console.error('Error adding review:', error);
      return { data: null, error };
    }
  },

  async updateReview(reviewId: string, courseId: string | number, updates: Partial<Review>) {
    try {
      const { error } = await supabase
        .from(REVIEWS_TABLE)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId);

      if (error) throw error;

      await this.updateCourseStats(courseId);
      return { error: null };
    } catch (error) {
      console.error('Error updating review:', error);
      return { error };
    }
  },

  async deleteReview(reviewId: string, courseId: string | number) {
    try {
      const { error } = await supabase
        .from(REVIEWS_TABLE)
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      await this.updateCourseStats(courseId);
      return { error: null };
    } catch (error) {
      console.error('Error deleting review:', error);
      return { error };
    }
  },

  async updateCourseStats(courseId: string | number) {
    try {
      const reviews = await this.getReviews(courseId);
      const totalRating = reviews.reduce((acc, r) => acc + r.rating, 0);
      const averageRating = reviews.length > 0 ? Math.round((totalRating / reviews.length) * 10) / 10 : 0;

      const { error } = await supabase
        .from(COURSES_TABLE)
        .update({
          rating: averageRating,
          reviews: reviews.length
        })
        .eq('id', String(courseId));
      
      if (error) throw error;
    } catch (error) {
      console.error("Error updating course stats:", error);
    }
  }
};
