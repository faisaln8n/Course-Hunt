export interface Tool {
  id: string;
  title: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviews: number;
  image: string;
  category: string;
  description: string;
  gallery?: string[];
  bundles?: {
    name: string;
    price: number;
    isPopular?: boolean;
  }[];
  fakeReview?: {
    userName: string;
    rating: number;
    comment: string;
    date: string;
  };
  features?: string[];
  whatsIncluded?: string[];
  sourceUrl?: string;
  password?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const tools: Tool[] = [];
