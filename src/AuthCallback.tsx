import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // 1. Check if we are in a popup
      const isPopup = window.opener && window.opener !== window;

      if (isPopup) {
        // Send message to the parent window
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
        // Close the popup after a short delay
        setTimeout(() => window.close(), 1000);
      } else {
        // 2. Standard redirect flow (for custom domain)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate('/profile');
        } else {
          navigate('/login');
        }
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#FF6B35] border-t-transparent mx-auto mb-4"></div>
        <h2 className="text-xl font-bold text-slate-900">Completing login...</h2>
        <p className="text-slate-500 mt-2">Please wait while we redirect you.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
