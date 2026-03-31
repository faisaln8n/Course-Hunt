import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { toast } from 'sonner';
import { userService, UserProfile } from '../services/userService';
import { cartService } from '../services/cartService';
import { wishlistService } from '../services/wishlistService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await userService.getUserProfile(user.uid);
      setProfile(userProfile);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      cartService.setUserId(firebaseUser?.uid || null);
      wishlistService.setUserId(firebaseUser?.uid || null);
      
      if (firebaseUser) {
        try {
          let userProfile = await userService.getUserProfile(firebaseUser.uid);
          
          if (!userProfile) {
            // Create initial profile
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              role: 'user',
              status: 'active',
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            };
            await userService.createUserProfile(newProfile);
            userProfile = newProfile;
          } else {
            // Update last login and ensure email is stored
            const updates: Partial<UserProfile> = {
              lastLogin: new Date().toISOString()
            };
            
            // If email is missing for some reason, restore it from auth
            if (!userProfile.email && firebaseUser.email) {
              updates.email = firebaseUser.email;
            }
            
            await userService.updateUserProfile(firebaseUser.uid, updates);
            userProfile = { ...userProfile, ...updates };
          }
          setProfile(userProfile);
        } catch (error) {
          console.error("Error handling user profile:", error);
          toast.error('Failed to update user profile. Please check your connection.');
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useUserAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useUserAuth must be used within an AuthProvider');
  }
  return context;
};
