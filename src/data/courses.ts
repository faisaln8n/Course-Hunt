export interface Course {
  id: string | number;
  title: string;
  price: string;
  originalPrice: string;
  rating: number;
  reviews: number;
  image: string;
  category: string;
  additionalChoices?: string;
  sourceUrl?: string;
  about?: string;
  objectives?: string[];
  gallery?: string[];
  fileImages?: string[];
  courseLink?: string;
}

export interface Review {
  id: string | number;
  course_id: string | number;
  tool_id?: string; // Added to support tool reviews
  user_name: string;
  uid?: string;
  rating: number;
  comment: string;
  image_url?: string;
  created_at: string;
}

export const courses: Course[] = [];
