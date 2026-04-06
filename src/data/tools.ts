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
  features?: string[];
  sourceUrl?: string;
  password?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const tools: Tool[] = [];
