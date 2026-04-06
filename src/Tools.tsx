import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  ShoppingCart, 
  X, 
  User, 
  Filter, 
  ChevronDown, 
  Star, 
  ShoppingCart as CartIcon,
  Check,
  Tag,
  ArrowLeft,
  Wrench,
  ExternalLink
} from 'lucide-react';
import { useUserAuth } from './components/AuthContext';
import Logo from './components/ui/Logo';
import { cartService } from './services/cartService';
import { toolService } from './services/toolService';
import { Tool } from './data/tools';
import { walletService } from './services/walletService';
import { Toaster, toast } from 'sonner';

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}

export default function Tools() {
  const { user, logout } = useUserAuth();
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>([]);
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cartCount, setCartCount] = useState<number>(cartService.getCartCount());
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [cartItems, setCartItems] = useState<Tool[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = toolService.subscribeToTools((data) => {
      setTools(data);
      setFilteredTools(data);
      setIsLoading(false);
    });

    const handleCartUpdate = () => {
      setCartCount(cartService.getCartCount());
      updateCartItems();
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    updateCartItems();

    return () => {
      unsubscribe();
      window.removeEventListener('cart-updated', handleCartUpdate);
    };
  }, []);

  const updateCartItems = async () => {
    const allTools = await toolService.getTools();
    const items = cartService.getCartItems()
      .map(cartId => allTools.find(t => t.id === cartId))
      .filter((t): t is Tool => !!t);
    setCartItems(items);
  };

  useEffect(() => {
    let result = tools;
    if (selectedCategory !== "All") {
      result = result.filter(t => t.category === selectedCategory);
    }
    if (searchQuery) {
      result = result.filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredTools(result);
  }, [searchQuery, selectedCategory, tools]);

  const categories = ["All", ...Array.from(new Set(tools.map(t => t.category)))];

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please login to purchase tools');
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
      const total = cartItems.reduce((acc, item) => acc + item.price, 0);

      if (balance < total) {
        toast.error(`Insufficient balance. You need $${total.toFixed(2)} but have $${balance.toFixed(2)}`);
        setIsPurchasing(false);
        return;
      }

      for (const item of cartItems) {
        const result = await walletService.orderTool(user.uid, user.email || '', item.id, item.price, item.title);
        if (!result.success) {
          throw new Error(result.error || `Failed to order ${item.title}`);
        }
      }

      cartService.clearCart();
      setCartItems([]);
      setCartCount(0);
      setIsCartOpen(false);
      
      toast.success('Order submitted! Admin will review and provide account info soon.');
      navigate('/profile');
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to complete purchase');
    } finally {
      setIsPurchasing(false);
    }
  };

  const addToCart = (tool: Tool) => {
    if (cartService.isInCart(tool.id)) {
      toast.error('Already in cart');
      return;
    }
    cartService.addToCart(tool.id);
    toast.success('Added to cart');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="no-underline">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-6">
            <div 
              className="relative cursor-pointer"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="w-5 h-5 text-slate-600" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#FF6B35] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                  {cartCount}
                </span>
              )}
            </div>

            {user ? (
              <Link to="/profile" className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 hover:border-[#FF6B35] transition-all">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-full" />
                ) : (
                  <User className="w-5 h-5 text-slate-600" />
                )}
                <span className="text-sm font-bold text-slate-700 max-w-[100px] truncate">
                  {user.displayName?.split(' ')[0] || 'User'}
                </span>
              </Link>
            ) : (
              <Link 
                to="/login"
                className="bg-[#FF6B35] text-white px-6 py-2 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest mb-6"
          >
            <Wrench className="w-4 h-4" />
            Premium Resources
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 uppercase tracking-tighter leading-none">
            Buy Premium <span className="text-[#FF6B35]">Tools</span>
          </h1>
          <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">
            Access high-quality tools, scripts, and resources to accelerate your learning and development journey.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mb-12">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-[#FF6B35] outline-none transition-all font-medium shadow-sm"
            />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-6 py-4 rounded-2xl font-bold whitespace-nowrap transition-all shadow-sm",
                  selectedCategory === cat 
                    ? "bg-[#FF6B35] text-white" 
                    : "bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTools.map((tool) => (
              <motion.div
                key={tool.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden hover:border-[#FF6B35] transition-all group shadow-sm hover:shadow-xl"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={tool.image} 
                    alt={tool.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
                      {tool.category}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-[#FF6B35] transition-colors uppercase tracking-tight">
                    {tool.title}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium line-clamp-2 mb-4">
                    {tool.description}
                  </p>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-slate-900">${tool.price}</span>
                      {tool.originalPrice > tool.price && (
                        <span className="text-sm text-slate-400 line-through font-bold">${tool.originalPrice}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-black text-slate-900">{tool.rating}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => addToCart(tool)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#FF6B35] transition-all flex items-center justify-center gap-2"
                  >
                    <CartIcon className="w-5 h-5" />
                    Add to Cart
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && filteredTools.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase">No tools found</h3>
            <p className="text-slate-500 font-medium">Try adjusting your search or filter to find what you're looking for.</p>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isCartOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setIsCartOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-2xl font-black flex items-center gap-3 text-slate-900 uppercase tracking-tight">
                  <ShoppingCart className="w-7 h-7 text-[#FF6B35]" />
                  Your Cart
                </h2>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-3 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <div className="max-h-[50vh] overflow-y-auto p-8 space-y-4">
                {cartItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ShoppingCart className="w-10 h-10 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Your cart is empty</p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 items-center bg-slate-50 p-4 rounded-3xl border border-slate-100">
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="w-16 h-16 object-cover rounded-2xl shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight truncate">{item.title}</h4>
                        <p className="text-[#FF6B35] font-black text-lg">${item.price}</p>
                      </div>
                      <button 
                        onClick={() => cartService.removeFromCart(item.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              {cartItems.length > 0 && (
                <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-slate-500 font-black uppercase tracking-widest text-xs">Total Amount</span>
                    <span className="text-3xl font-black text-slate-900">${cartItems.reduce((acc, item) => acc + item.price, 0).toFixed(2)}</span>
                  </div>
                  <button 
                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-[#FF6B35] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    disabled={isPurchasing}
                    onClick={handleCheckout}
                  >
                    {isPurchasing ? (
                      <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-6 h-6" />
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

      <Toaster position="top-center" />
    </div>
  );
}
