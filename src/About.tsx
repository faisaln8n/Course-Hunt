import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ShoppingCart, X, User, LogOut, Target, MessageSquare, Wallet, Check } from 'lucide-react';
import { useUserAuth } from './components/AuthContext';
import Logo from './components/ui/Logo';
import { cartService } from './services/cartService';
import { courseService } from './services/courseService';
import { Course } from './data/courses';
import { Toaster, toast } from 'sonner';
import { walletService } from './services/walletService';
import { userService } from './services/userService';
import { useNavigate } from 'react-router-dom';

export default function About() {
  const { user, logout } = useUserAuth();
  const [cartCount, setCartCount] = useState<number>(cartService.getCartCount());
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [cartItems, setCartItems] = useState<Course[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadInitialData = async () => {
      setCartCount(cartService.getCartCount());
      const allCourses = await courseService.getAllCoursesRaw();
      const cartItems = cartService.getCartItems();
      const items = cartItems
        .filter(item => item.type === 'course')
        .map(item => allCourses.find(c => c.id === item.id))
        .filter((c): c is Course => !!c);
      setCartItems(items);
    };

    const handleCartUpdate = async () => {
      setCartCount(cartService.getCartCount());
      const allCourses = await courseService.getAllCoursesRaw();
      const cartItems = cartService.getCartItems();
      const items = cartItems
        .filter(item => item.type === 'course')
        .map(item => allCourses.find(c => c.id === item.id))
        .filter((c): c is Course => !!c);
      setCartItems(items);
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    
    loadInitialData();
    
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please login to purchase courses');
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setIsPurchasing(true);
    try {
      const balance = await walletService.getBalance(user.uid);
      const total = cartItems.reduce((acc, item) => acc + Number(item.price.replace('$', '')), 0);

      if (balance < total) {
        toast.error(`Insufficient balance. You need $${total.toFixed(2)} but have $${balance.toFixed(2)}`);
        setIsPurchasing(false);
        return;
      }

      // Purchase each course
      for (const item of cartItems) {
        const result = await walletService.purchaseCourse(user.uid, String(item.id), Number(item.price.replace('$', '')), item.title);
        if (!result.success) {
          throw new Error(result.error || `Failed to purchase ${item.title}`);
        }
      }

      // Clear cart
      cartService.clearCart();
      setCartItems([]);
      setCartCount(0);
      setIsCartOpen(false);
      
      toast.success('Purchase successful! You can now access your courses in your profile.');
      navigate('/profile');
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to complete purchase');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 relative">
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-[#f09433]/5 via-[#dc2743]/5 to-[#bc1888]/5" />
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="no-underline">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-6">
            <Link 
              to="/tools" 
              className="bg-[#FFD700] text-black px-6 py-2 rounded-full text-sm font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all active:scale-95 no-underline"
            >
              Buy Tools
            </Link>
            <div 
              className="relative cursor-pointer"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {cartCount >= 0 && (
                <span className="absolute -top-2 -right-2 instagram-gradient text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                  {cartCount}
                </span>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/profile" className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 hover:border-[#00E5FF] transition-all" style={{ textDecoration: 'none' }}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-full" />
                  ) : (
                    <User className="w-5 h-5 text-slate-600" />
                  )}
                  <span className="text-sm font-bold text-slate-700 max-w-[100px] truncate">
                    {user.displayName?.split(' ')[0] || 'User'}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link 
                  to="/login"
                  className="bg-[#4D00FF] text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg shadow-[#4D00FF]/30 hover:shadow-[#4D00FF]/50 transition-all active:scale-95"
                  style={{ textDecoration: 'none' }}
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 md:pt-16 pb-16 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#f09433]/10 to-[#bc1888]/10 rounded-full mb-8">
            <ShieldCheck className="w-10 h-10 instagram-text" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">About course-hunt</h1>
          <div className="bg-gradient-to-br from-[#f09433]/10 via-[#dc2743]/10 to-[#bc1888]/10 p-8 rounded-3xl border-2 border-[#dc2743]/30 shadow-xl mb-12">
            <p className="text-2xl md:text-3xl font-bold instagram-text">
              7-day money-back guarantee
            </p>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              We are committed to your success. If you're not satisfied with your learning experience, we offer a full refund within the first 7 days of purchase. No questions asked.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mb-16">
            <div className="bg-white p-6 rounded-2xl border-2 border-[#dc2743]/10 shadow-sm hover:border-[#dc2743]/30 transition-colors">
              <h3 className="text-xl font-bold mb-3 text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full instagram-gradient"></span>
                Our Mission
              </h3>
              <p className="text-gray-600">
                To provide high-quality, accessible education to everyone, everywhere. We believe that learning should be a lifelong journey.
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border-2 border-[#dc2743]/10 shadow-sm hover:border-[#dc2743]/30 transition-colors">
              <h3 className="text-xl font-bold mb-3 text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full instagram-gradient"></span>
                Quality Content
              </h3>
              <p className="text-gray-600">
                Every course on our platform is carefully vetted to ensure it meets our high standards for instruction and practical value.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-8 rounded-3xl border-2 border-[#dc2743]/20 mb-12 text-left">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="instagram-gradient text-white p-2 rounded-lg">
                <ShieldCheck className="w-6 h-6" />
              </span>
              Payment Methods
            </h2>
            <p className="text-gray-600 mb-6">
              We accept a wide range of payment methods to make your learning journey as smooth as possible. You can pay via:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {['Bkash', 'Binance', 'Credit/Debit Card'].map((method) => (
                <div key={method} className="bg-white p-4 rounded-xl border border-[#dc2743]/20 text-center font-bold text-gray-800 shadow-sm hover:border-[#dc2743] transition-colors">
                  {method}
                </div>
              ))}
            </div>
          </div>

          {/* New Review Request Section */}
          <div className="bg-white p-8 md:p-12 rounded-[40px] border-2 border-black mb-16 text-center shadow-sm relative overflow-hidden">
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-black uppercase tracking-tighter">
              We Value Your Voice!
            </h2>
            <p className="text-gray-600 font-medium text-lg mb-10 max-w-xl mx-auto leading-relaxed">
              Did you receive your course? How was your experience? Share your personal review with us and help other students choose the best!
            </p>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                toast.success('Review system coming soon! You can also email us.');
              }}
              className="bg-black text-white px-12 py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-gray-900 transition-all flex items-center justify-center gap-3 mx-auto"
            >
              Submit Your Review
              <MessageSquare className="w-6 h-6" />
            </motion.button>
          </div>

          <div className="bg-white p-8 rounded-3xl border-2 border-[#dc2743] mb-12 text-left shadow-xl">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
              <span className="bg-[#FF6B35] text-white p-2 rounded-lg">
                <Wallet className="w-6 h-6" />
              </span>
              How to Purchase with Wallet
            </h2>
            <div className="space-y-6">
              {[
                { step: 1, title: "Add Funds to Wallet", desc: "Contact our support team to add funds to your account wallet via Bkash, Binance, or other methods." },
                { step: 2, title: "Choose Your Course", desc: "Browse our catalog and find the course you want to enroll in." },
                { step: 3, title: "Add to Cart", desc: "Click the 'Add to Cart' button on the course detail page." },
                { step: 4, title: "Checkout with Wallet", desc: "Open your cart and click 'Checkout with Wallet'. The course price will be deducted from your balance." },
                { step: 5, title: "Instant Access", desc: "Once the purchase is complete, you will have instant access to your course in your profile." }
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 instagram-gradient text-white rounded-full flex items-center justify-center font-black">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{item.title}</h4>
                    <p className="text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="border-t-2 border-gray-200 bg-white py-10 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600 font-medium">© 2023 course-hunt. All rights reserved.</p>
        </div>
      </footer>

      <Toaster position="top-center" />
      
      {/* Cart Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setIsCartOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6 instagram-text" />
                  Your Cart
                </h2>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="max-h-[60vh] overflow-y-auto p-6">
                {cartItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingCart className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">Your cart is empty</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 instagram-text font-bold hover:underline"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex gap-4 items-center bg-gray-50 p-3 rounded-2xl">
                        <img 
                          src={item.image || null} 
                          alt={item.title} 
                          className="w-16 h-16 object-cover rounded-xl"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://picsum.photos/seed/${item.id}/200/200`;
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm line-clamp-1">{item.title}</h4>
                          <p className="instagram-text font-bold">{item.price}</p>
                        </div>
                        <button 
                          onClick={() => {
                            cartService.removeFromCart(item.id, 'course');
                            toast.success('Removed from cart');
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {cartItems.length > 0 && (
                <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600 font-medium">Total Items:</span>
                    <span className="text-xl font-bold">{cartItems.length}</span>
                  </div>
                  <button 
                    className="w-full instagram-gradient text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#dc2743]/20 hover:shadow-xl hover:shadow-[#dc2743]/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    disabled={isPurchasing}
                    onClick={handleCheckout}
                  >
                    {isPurchasing ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Checkout with Wallet
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
