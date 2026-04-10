import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Trash2, Check, Tag, Wallet, ArrowRight } from 'lucide-react';
import { cartService, CartItem } from '../services/cartService';
import { courseService } from '../services/courseService';
import { toolService } from '../services/toolService';
import { walletService } from '../services/walletService';
import { settingsService, Coupon } from '../services/settingsService';
import { useUserAuth } from './AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DetailedCartItem extends CartItem {
  title: string;
  price: number;
  image: string;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
  const { user, profile } = useUserAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<DetailedCartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const loadItems = async () => {
    setIsLoading(true);
    const cartItems = cartService.getCartItems();
    const [allCourses, allTools] = await Promise.all([
      courseService.getAllCoursesRaw(),
      toolService.getAllToolsRaw()
    ]);

    const detailedItems = cartItems.map(item => {
      if (item.type === 'course') {
        const course = allCourses.find(c => String(c.id) === String(item.id));
        return course ? { ...item, title: course.title, price: parseFloat(course.price.replace('$', '')), image: course.image } : null;
      } else {
        const tool = allTools.find(t => String(t.id) === String(item.id));
        return tool ? { ...item, title: tool.title, price: tool.price, image: tool.image } : null;
      }
    }).filter((item): item is DetailedCartItem => item !== null);

    setItems(detailedItems);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleCartUpdate = () => {
      loadItems();
    };
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const handleRemove = (id: string | number, type: 'course' | 'tool') => {
    cartService.removeFromCart(id, type);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    const settings = await settingsService.getSettings();
    
    // Check course coupons
    const courseCoupon = (settings.coupons || []).find(c => 
      c.code.toUpperCase() === couponCode.toUpperCase() && 
      c.isActive && 
      (!c.expiryDate || new Date(c.expiryDate) > new Date())
    );

    if (courseCoupon) {
      if (courseCoupon.courseId) {
        const itemInCart = items.find(i => String(i.id) === String(courseCoupon.courseId) && i.type === 'course');
        if (!itemInCart) {
          toast.error('This coupon is not applicable for items in your cart');
          return;
        }
      } else {
        // Global course coupon - check if any course is in cart
        const hasCourses = items.some(i => i.type === 'course');
        if (!hasCourses) {
          toast.error('This coupon is only applicable for courses');
          return;
        }
      }
      // Ensure it's marked as a course coupon if it doesn't have courseId (global course coupon)
      setAppliedCoupon({ ...courseCoupon, _type: 'course' } as any);
      toast.success(`Course coupon applied! ${courseCoupon.discount}% discount`);
      return;
    }

    // Check tool coupons
    const toolCoupon = (settings.toolCoupons || []).find(c => 
      c.code.toUpperCase() === couponCode.toUpperCase() && 
      c.isActive && 
      (!c.expiryDate || new Date(c.expiryDate) > new Date())
    );

    if (toolCoupon) {
      if (toolCoupon.toolId) {
        const itemInCart = items.find(i => String(i.id) === String(toolCoupon.toolId) && i.type === 'tool');
        if (!itemInCart) {
          toast.error('This coupon is not applicable for items in your cart');
          return;
        }
      } else {
        // Global tool coupon - check if any tool is in cart
        const hasTools = items.some(i => i.type === 'tool');
        if (!hasTools) {
          toast.error('This coupon is only applicable for tools');
          return;
        }
      }
      setAppliedCoupon({ ...toolCoupon, _type: 'tool' } as any);
      toast.success(`Tool coupon applied! ${toolCoupon.discount}% discount`);
      return;
    }

    toast.error('Invalid or expired coupon code');
  };

  const subtotal = items.reduce((acc, item) => acc + item.price, 0);
  
  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    const coupon = appliedCoupon as any;
    
    if (coupon._type === 'course') {
      if (coupon.courseId) {
        // Specific course coupon
        const item = items.find(i => String(i.id) === String(coupon.courseId) && i.type === 'course');
        return item ? (item.price * coupon.discount) / 100 : 0;
      } else {
        // Global course coupon - applies to all courses in cart
        const coursesSubtotal = items.filter(i => i.type === 'course').reduce((acc, i) => acc + i.price, 0);
        return (coursesSubtotal * coupon.discount) / 100;
      }
    } else if (coupon._type === 'tool') {
      if (coupon.toolId) {
        // Specific tool coupon
        const item = items.find(i => String(i.id) === String(coupon.toolId) && i.type === 'tool');
        return item ? (item.price * coupon.discount) / 100 : 0;
      } else {
        // Global tool coupon - applies to all tools in cart
        const toolsSubtotal = items.filter(i => i.type === 'tool').reduce((acc, i) => acc + i.price, 0);
        return (toolsSubtotal * coupon.discount) / 100;
      }
    }
    
    return 0;
  };

  const discount = calculateDiscount();
  const total = subtotal - discount;

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please login to checkout');
      navigate('/login');
      onClose();
      return;
    }

    if (items.length === 0) return;

    if ((profile?.walletBalance || 0) < total) {
      toast.error(`Insufficient balance. You need $${total.toFixed(2)}`);
      return;
    }

    setIsPurchasing(true);
    try {
      const checkoutItems = items.map(item => {
        let price = item.price;
        if (appliedCoupon) {
          const coupon = appliedCoupon as any;
          if (coupon._type === 'course' && item.type === 'course') {
            if (!coupon.courseId || String(item.id) === String(coupon.courseId)) {
              price = price * (1 - coupon.discount / 100);
            }
          } else if (coupon._type === 'tool' && item.type === 'tool') {
            if (!coupon.toolId || String(item.id) === String(coupon.toolId)) {
              price = price * (1 - coupon.discount / 100);
            }
          }
        }
        return { id: String(item.id), type: item.type, price, title: item.title };
      });

      const result = await walletService.checkoutCart(user.uid, user.email || '', checkoutItems);
      
      if (result.success) {
        toast.success('Purchase successful!');
        cartService.clearCart();
        setAppliedCoupon(null);
        setCouponCode('');
        onClose();
        navigate('/profile');
      } else {
        toast.error(result.error || 'Checkout failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during checkout');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-[#FF6B35] p-2 rounded-xl shadow-lg shadow-[#FF6B35]/20">
                  <ShoppingCart className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Your Cart</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{items.length} Items Selected</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors group"
              >
                <X className="w-6 h-6 text-slate-400 group-hover:text-slate-900" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-4">
                  <div className="w-10 h-10 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Items...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-slate-200">
                    <ShoppingCart className="w-10 h-10 text-slate-200" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase mb-2">Cart is Empty</h3>
                  <p className="text-slate-400 text-sm font-medium max-w-[200px]">Looks like you haven't added anything yet.</p>
                  <button 
                    onClick={onClose}
                    className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-[#FF6B35] transition-all"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div 
                    layout
                    key={`${item.type}-${item.id}`} 
                    className="flex gap-4 p-4 bg-white rounded-3xl border-2 border-slate-50 hover:border-slate-100 transition-all group relative"
                  >
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                          item.type === 'course' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                        )}>
                          {item.type}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm line-clamp-2 leading-tight mb-2">{item.title}</h4>
                      <p className="text-[#FF6B35] font-black text-lg">${item.price.toFixed(2)}</p>
                    </div>
                    <button 
                      onClick={() => handleRemove(item.id, item.type)}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 hover:border-red-100 shadow-sm transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 bg-slate-50/80 backdrop-blur-md border-t border-slate-100 space-y-6">
                {/* Coupon Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Have a coupon?</label>
                    {appliedCoupon && (
                      <button 
                        onClick={() => setAppliedCoupon(null)}
                        className="text-[10px] font-bold text-red-500 uppercase hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Enter code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:border-[#FF6B35] outline-none transition-all uppercase"
                      />
                    </div>
                    <button 
                      onClick={handleApplyCoupon}
                      className="px-4 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
                    >
                      Apply
                    </button>
                  </div>
                  {appliedCoupon && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-lg border border-green-100">
                      <Check className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-tight">Coupon "{appliedCoupon.code}" applied!</span>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold text-slate-500">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm font-bold text-green-600">
                      <span>Discount</span>
                      <span>-${discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-lg font-black text-slate-900 uppercase tracking-tight">Total</span>
                    <span className="text-3xl font-black text-[#FF6B35]">${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wallet Balance</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">${(profile?.walletBalance || 0).toLocaleString()}</span>
                  </div>

                  <button 
                    onClick={handleCheckout}
                    disabled={isPurchasing}
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-[#FF6B35] hover:text-black hover:shadow-[#FF6B35]/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 group"
                  >
                    {isPurchasing ? (
                      <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Checkout with Wallet
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}

export default CartDrawer;
