import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { Course, Review } from '../data/courses';

const COURSES_COLLECTION = 'courses';
const REVIEWS_COLLECTION = 'reviews';

export const courseService = {
  async getCourses(): Promise<Course[]> {
    try {
      const q = query(collection(db, COURSES_COLLECTION), orderBy('title', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => ({
          ...doc.data() as any,
          id: doc.id
        }))
        .filter(course => course.title && course.image) as unknown as Course[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COURSES_COLLECTION);
      return [];
    }
  },

  async getAllCoursesRaw(): Promise<Course[]> {
    try {
      const q = query(collection(db, COURSES_COLLECTION), orderBy('title', 'asc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...doc.data() as any,
        id: doc.id
      })) as unknown as Course[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COURSES_COLLECTION);
      return [];
    }
  },

  async getCourseById(id: string | number): Promise<Course | undefined> {
    const path = `${COURSES_COLLECTION}/${id}`;
    try {
      const docRef = doc(db, COURSES_COLLECTION, String(id));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as unknown as Course;
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
  },

  subscribeToCourses(callback: (courses: Course[]) => void) {
    const q = query(collection(db, COURSES_COLLECTION), orderBy('title', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const courses = snapshot.docs
        .map(doc => ({
          ...doc.data() as any,
          id: doc.id
        }))
        .filter(course => course.title && course.image) as unknown as Course[];
      callback(courses);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COURSES_COLLECTION);
    });

    return unsubscribe;
  },

  subscribeToAllCoursesRaw(callback: (courses: Course[]) => void) {
    const q = query(collection(db, COURSES_COLLECTION), orderBy('title', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const courses = snapshot.docs
        .map(doc => ({
          ...doc.data() as any,
          id: doc.id
        })) as unknown as Course[];
      callback(courses);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COURSES_COLLECTION);
    });

    return unsubscribe;
  }
};
