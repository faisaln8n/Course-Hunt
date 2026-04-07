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
  const [visibleCount, setVisibleCount] = useState(25); // 5 columns * 5 rows = 25

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
    const cartItems = cartService.getCartItems();
    const items = cartItems
      .filter(item => item.type === 'tool')
      .map(item => allTools.find(t => t.id === item.id))
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
    if (cartService.isInCart(tool.id, 'tool')) {
      toast.error('Already in cart');
      window.dispatchEvent(new Event('open-cart'));
      return;
    }
    cartService.addToCart(tool.id, 'tool');
    toast.success('Added to cart');
    window.dispatchEvent(new Event('open-cart'));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
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
              onClick={() => window.dispatchEvent(new Event('open-cart'))}
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

      <main className="container mx-auto px-4 py-8">
        {/* Profile Header Section - Text Only */}
        <div className="max-w-5xl mx-auto bg-white rounded-2xl p-10 mb-12 shadow-sm border border-slate-100 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-slate-900 mb-6 uppercase tracking-tighter"
          >
            Explore Our <span className="text-[#FF6B35]">Premium</span> <span className="text-[#6907f7]">Tools</span>
          </motion.h1>
          <p className="text-slate-600 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-medium">
            Find practical digital products and services designed to help creators, freelancers, and brands grow online.
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
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-12">
              {filteredTools.slice(0, visibleCount).map((tool) => (
                <motion.div
                  key={tool.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-transparent overflow-hidden transition-all group flex flex-col cursor-pointer"
                  onClick={() => navigate(`/tool/${tool.id}`)}
                >
                  <div className="relative aspect-square overflow-hidden rounded-md mb-4 shadow-sm border border-slate-100 bg-white">
                    <img 
                      src={tool.image} 
                      alt={tool.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    {tool.category && (
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 bg-white/90 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
                          {tool.category}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight line-clamp-2 leading-snug mb-1 group-hover:text-[#FF6B35] transition-colors">
                      {tool.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {tool.price === 0 ? 'FREE' : `$ ${tool.price}`}
                      </span>
                      {tool.originalPrice > tool.price && (
                        <span className="text-xs text-slate-400 line-through font-medium">
                          $ {tool.originalPrice}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredTools.length > visibleCount && (
              <div className="flex justify-center mt-16">
                <button
                  onClick={() => setVisibleCount(prev => prev + 12)}
                  className="px-12 py-4 bg-white border border-slate-200 rounded-xl font-bold uppercase tracking-widest text-slate-900 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all shadow-sm active:scale-95"
                >
                  See More
                </button>
              </div>
            )}
          </>
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

        {/* Footer - Matching Screenshot */}
        <div className="mt-24 pt-12 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 pb-12">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-100 shadow-sm">
            <span className="text-xs text-slate-400">Powered by</span>
            <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">Owl's Club</span>
          </div>
          <div className="flex items-center gap-6 text-slate-400 text-sm font-medium">
            <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Contact</a>
          </div>
        </div>
      </main>

      <Toaster position="top-center" />
    </div>
  );
}
