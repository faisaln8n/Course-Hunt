import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  limit,
  startAfter,
  Timestamp,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { Course, Review } from '../data/courses';
import { cache } from '../lib/cache';

const COURSES_COLLECTION = 'courses';
const REVIEWS_COLLECTION = 'reviews';
const CACHE_KEY_COURSES = 'cached_courses';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const courseService = {
  /**
   * Fetches courses with caching and optional pagination.
   * Caching reduces reads by serving data from localStorage if available and fresh.
   */
  async getCourses(lastDoc?: QueryDocumentSnapshot<DocumentData>): Promise<{ courses: Course[], lastDoc?: QueryDocumentSnapshot<DocumentData> }> {
    // 1. Check cache first for the first page
    if (!lastDoc) {
      const cached = cache.get<Course[]>(CACHE_KEY_COURSES);
      if (cached) {
        console.log('Serving courses from cache');
        return { courses: cached };
      }
    }

    try {
      // 2. Implement pagination with limit() to reduce the number of documents read per request
      let q = query(
        collection(db, COURSES_COLLECTION), 
        orderBy('title', 'asc'),
        limit(16) // Fetch only what's needed for the current view
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(q);
      const courses = querySnapshot.docs
        .map(doc => ({
          ...doc.data() as any,
          id: doc.id
        }))
        .filter(course => course.title && course.image) as unknown as Course[];

      // 3. Cache the first page to avoid repeated reads on page reload
      if (!lastDoc) {
        cache.set(CACHE_KEY_COURSES, courses, CACHE_TTL);
      }

      return { 
        courses, 
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] 
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COURSES_COLLECTION);
      return { courses: [] };
    }
  },

  /**
   * Fetches all courses (used for admin or search).
   * Uses caching to minimize quota consumption.
   */
  async getAllCoursesRaw(): Promise<Course[]> {
    const cached = cache.get<Course[]>(`${CACHE_KEY_COURSES}_all`);
    if (cached) return cached;

    try {
      const q = query(collection(db, COURSES_COLLECTION), orderBy('title', 'asc'));
      const querySnapshot = await getDocs(q);
      const courses = querySnapshot.docs.map(doc => ({
        ...doc.data() as any,
        id: doc.id
      })) as unknown as Course[];
      
      cache.set(`${CACHE_KEY_COURSES}_all`, courses, CACHE_TTL);
      return courses;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COURSES_COLLECTION);
      return [];
    }
  },

  async getCourseBySlug(slug: string): Promise<Course | undefined> {
    // 1. Check cache first
    const cacheKey = `course_slug_${slug}`;
    const cached = cache.get<Course>(cacheKey);
    if (cached) return cached;

    try {
      // Since we don't have a slug field in Firestore, we use the cached all courses
      const courses = await this.getAllCoursesRaw();
      const found = courses.find(c => {
        const s = c.title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
        return s === slug;
      });
      
      if (found) {
        cache.set(cacheKey, found, 30 * 60 * 1000); // 30 mins
      }
      return found;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, COURSES_COLLECTION);
      return undefined;
    }
  },

  async getCourseById(id: string | number): Promise<Course | undefined> {
    const cacheKey = `course_id_${id}`;
    const cached = cache.get<Course>(cacheKey);
    if (cached) return cached;

    const path = `${COURSES_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, COURSES_COLLECTION, String(id));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = { ...docSnap.data(), id: docSnap.id } as unknown as Course;
        cache.set(cacheKey, data, 30 * 60 * 1000); // 30 mins
        return data;
      }
      return undefined;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return undefined;
    }
  },

  async updateCourse(updatedCourse: Course) {
    const path = `${COURSES_COLLECTION}/${updatedCourse.id}`;
    try {
      const { id, ...data } = updatedCourse;
      const docRef = doc(db, COURSES_COLLECTION, String(id));
      
      // Sanitize data to remove undefined values
      const sanitizedData = JSON.parse(JSON.stringify(data));
      
      await updateDoc(docRef, {
        ...sanitizedData,
        updatedAt: serverTimestamp()
      });
      return { error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      return { error };
    }
  },

  async addCourse(newCourse: Omit<Course, 'id'>) {
    try {
      // Sanitize data to remove undefined values
      const sanitizedCourse = JSON.parse(JSON.stringify(newCourse));
      
      const docRef = await addDoc(collection(db, COURSES_COLLECTION), {
        ...sanitizedCourse,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      const courseWithId = { ...newCourse, id: docRef.id } as unknown as Course;
      return { data: [courseWithId], error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COURSES_COLLECTION);
      return { data: null, error };
    }
  },

  async deleteCourse(id: string | number) {
    const path = `${COURSES_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, COURSES_COLLECTION, String(id));
      await deleteDoc(docRef);
      return { error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      return { error };
    }
  },

  async getReviews(courseId: string | number): Promise<Review[]> {
    try {
      const q = query(
        collection(db, REVIEWS_COLLECTION), 
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const allReviews = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as unknown as Review[];
      
      return allReviews.filter(r => String(r.course_id) === String(courseId));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, REVIEWS_COLLECTION);
      return [];
    }
  },

  async addReview(review: Omit<Review, 'id' | 'created_at'>) {
    try {
      const newReviewData = {
        ...review,
        uid: auth.currentUser?.uid || null,
        created_at: new Date().toISOString(),
        timestamp: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, REVIEWS_COLLECTION), newReviewData);
      const newReview: Review = {
        ...newReviewData,
        id: docRef.id
      } as unknown as Review;

      await this.updateCourseStats(review.course_id);

      return { data: newReview, error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, REVIEWS_COLLECTION);
      return { data: null, error };
    }
  },

  async updateReview(reviewId: string, courseId: string | number, updates: Partial<Review>) {
    const path = `${REVIEWS_COLLECTION}/${reviewId}`;
    try {
      const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date().toISOString(),
        timestamp: serverTimestamp()
      });

      await this.updateCourseStats(courseId);
      return { error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      return { error };
    }
  },

  async deleteReview(reviewId: string, courseId: string | number) {
    const path = `${REVIEWS_COLLECTION}/${reviewId}`;
    try {
      const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
      await deleteDoc(docRef);

      await this.updateCourseStats(courseId);
      return { error: null };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      return { error };
    }
  },

  async updateCourseStats(courseId: string | number) {
    try {
      const reviews = await this.getReviews(courseId);
      const totalRating = reviews.reduce((acc, r) => acc + r.rating, 0);
      const averageRating = reviews.length > 0 ? Math.round((totalRating / reviews.length) * 10) / 10 : 0;

      const courseRef = doc(db, COURSES_COLLECTION, String(courseId));
      await updateDoc(courseRef, {
        rating: averageRating,
        reviews: reviews.length
      });
    } catch (error) {
      console.error("Error updating course stats:", error);
    }
  }
};
