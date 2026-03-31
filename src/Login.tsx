import React from 'react';
import { motion } from 'framer-motion';
import { auth, googleProvider } from './firebase';
import { signInWithPopup } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Target } from 'lucide-react';
import Logo from './components/ui/Logo';

const Login: React.FC = () => {
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Successfully signed in!');
      navigate('/');
    } catch (error) {
      console.error('Error signing in with Google:', error);
      toast.error('Failed to sign in. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center"
      >
        <div className="mb-8 flex flex-col items-center">
          <Link to="/" className="no-underline mb-6">
            <Logo size="xl" />
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
          <p className="text-slate-500 mt-2">Sign in to access your courses and progress</p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 py-3.5 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          Continue with Google
        </button>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-slate-500 text-sm">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
