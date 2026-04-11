import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';
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
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await userService.getUserProfile(user.id);
      setProfile(userProfile);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      handleUserChange(currentUser);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      handleUserChange(currentUser);
    });

    // Listen for OAuth success message from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        // Refresh session when popup signals success
        supabase.auth.getSession().then(({ data: { session } }) => {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          handleUserChange(currentUser);
          toast.success('Successfully signed in with Google!');
        });
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleUserChange = async (supabaseUser: User | null) => {
    cartService.setUserId(supabaseUser?.id || null);
    wishlistService.setUserId(supabaseUser?.id || null);
    
    if (supabaseUser) {
      try {
        // The database trigger handles initial profile creation
        // We just need to fetch it and update last login
        let userProfile = await userService.getUserProfile(supabaseUser.id);
        
        if (userProfile) {
          await userService.updateUserProfile(supabaseUser.id, {
            lastLogin: new Date().toISOString()
          });
          setProfile(userProfile);
        } else {
          // Fallback if trigger hasn't finished yet
          setLoading(true);
          // Wait a bit and retry once
          setTimeout(async () => {
            const retryProfile = await userService.getUserProfile(supabaseUser.id);
            setProfile(retryProfile);
            setLoading(false);
          }, 1000);
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("Error handling user profile:", error);
        setLoading(false);
      }
    } else {
      setProfile(null);
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    try {
      const isIframe = window.self !== window.top;
      const redirectTo = `${window.location.origin}/auth/callback`;

      if (!isIframe) {
        // Standard redirect for custom domain
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo }
        });
        if (error) throw error;
        return;
      }

      // Popup flow for AI Studio iframe
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true
        }
      });

      if (error) throw error;

      if (data?.url) {
        // 2. Open the OAuth provider's URL in a popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.url,
          'google_auth_popup',
          `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
        );

        if (!popup) {
          toast.error('Popup blocked. Please allow popups for this site.');
        }
      }
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      toast.error(error.message || 'Failed to sign in with Google');
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile, signInWithGoogle }}>
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
