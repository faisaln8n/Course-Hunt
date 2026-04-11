import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from './components/ui/Logo';
import { 
  LayoutDashboard, 
  BookOpen, 
  Plus, 
  Settings, 
  LogOut, 
  Search, 
  Filter, 
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  X as CloseIcon,
  Save,
  Image as ImageIcon,
  DollarSign,
  Star as StarIcon,
  TrendingUp,
  Megaphone,
  Tag,
  List,
  ChevronRight,
  BarChart3,
  Users,
  UserCog,
  Shield,
  ShieldAlert,
  Ban,
  Activity,
  UserCheck,
  UserX,
  Mail,
  Target,
  Wallet,
  Wrench,
  ShoppingCart,
  Link as LinkIcon
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Course } from './data/courses';
import { Tool } from './data/tools';
import { analyticsService } from './services/analyticsService';
import { courseService } from './services/courseService';
import { toolService } from './services/toolService';
import { settingsService, AppSettings } from './services/settingsService';
import { userService, UserProfile } from './services/userService';
import { presenceService } from './services/presenceService';
import { walletService, DepositRequest, WithdrawalRequest, ToolOrder, CourseOrder } from './services/walletService';
import { vipService, VIPRequest } from './services/vipService';

import { supabase } from './supabase';
import { LogIn as LoginIcon, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [courses, setCourses] = useState<Course[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddToolModalOpen, setIsAddToolModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [fileImagesPreviews, setFileImagesPreviews] = useState<string[]>([]);
  
  const [selectedCourses, setSelectedCourses] = useState<(string | number)[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [toolToDelete, setToolToDelete] = useState<Tool | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [toolOrders, setToolOrders] = useState<ToolOrder[]>([]);
  const [courseOrders, setCourseOrders] = useState<CourseOrder[]>([]);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState<string | null>(null);
  const [orderAccountInfo, setOrderAccountInfo] = useState('');
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const handleFirebaseSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/admin'
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Supabase Sign In Error:', error);
      toast.error('Failed to sign in with Google: ' + error.message);
    }
  };

  // Users State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(settingsService.getDefaultSettings());

  // Coupon Form State
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount: '',
    courseId: 'all',
    expiryDate: ''
  });
  const [editingCouponIndex, setEditingCouponIndex] = useState<number | null>(null);

  // Deposit Coupon Form State
  const [depositCouponForm, setDepositCouponForm] = useState({
    code: '',
    bonus: '',
    expiryDate: ''
  });
  const [editingDepositCouponIndex, setEditingDepositCouponIndex] = useState<number | null>(null);
  
  // Tool Coupon Form State
  const [toolCouponForm, setToolCouponForm] = useState({
    code: '',
    discount: '',
    toolId: 'all',
    expiryDate: ''
  });
  const [editingToolCouponIndex, setEditingToolCouponIndex] = useState<number | null>(null);

  // VIP Coupon Form State
  const [vipCouponForm, setVipCouponForm] = useState({
    code: '',
    discount: '',
    expiryDate: ''
  });
  const [editingVipCouponIndex, setEditingVipCouponIndex] = useState<number | null>(null);

  // Analytics State
  const [timeframe, setTimeframe] = useState(7);
  const [selectedCourseId, setSelectedCourseId] = useState<string | 'all'>('all');
  const [chartData, setChartData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<{ course: Course; count: number }[]>([]);
  const [trafficSourceStats, setTrafficSourceStats] = useState<{ source: string; count: number }[]>([]);
  const [liveUsersCount, setLiveUsersCount] = useState(0);
  const [liveUsers, setLiveUsers] = useState<any[]>([]);

  // Wallet Management State
  const [walletEmail, setWalletEmail] = useState('');
  const [walletAmount, setWalletAmount] = useState('');
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [vipRequests, setVIPRequests] = useState<VIPRequest[]>([]);

  const navigate = useNavigate();

  const pendingCourseOrders = courseOrders.filter(o => !o.status || o.status === 'Pending').length;
  const pendingToolOrders = toolOrders.filter(o => o.status === 'Ordered').length;
  const pendingVIPRequests = vipRequests.filter(r => r.status === 'pending').length;
  const pendingDeposits = depositRequests.filter(r => r.status === 'Pending').length;
  const pendingWithdrawals = withdrawalRequests.filter(r => r.status === 'Pending').length;

  const Badge = ({ count }: { count: number }) => {
    if (count <= 0) return null;
    return (
      <span className="ml-auto flex h-5 w-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-sm animate-pulse">
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);
      setIsAuthLoading(false);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    
    const loadAdminData = async () => {
      const [
        transactions,
        depRequests,
        withRequests,
        tOrders,
        cOrders,
        vRequests,
        allUsers,
        clicks,
        lUsersCount,
        lUsers
      ] = await Promise.all([
        walletService.getAllTransactions(),
        walletService.getDepositRequests(),
        walletService.getAllWithdrawals(),
        walletService.getAllToolOrders(),
        walletService.getAllCourseOrders(),
        vipService.getAllVIPRequests(),
        userService.getAllUsers(),
        analyticsService.getClicks(),
        presenceService.getLiveUsersCount(),
        presenceService.getLiveUsers()
      ]);

      setAllTransactions(transactions);
      setDepositRequests(depRequests);
      setWithdrawalRequests(withRequests);
      setToolOrders(tOrders);
      setCourseOrders(cOrders);
      setVIPRequests(vRequests);
      setUsers(allUsers);
      
      // Process clicks for chart
      const data: Record<string, number> = {};
      const now = new Date();
      for (let i = timeframe - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        data[dateStr] = 0;
      }

      clicks.forEach(click => {
        if (!click.timestamp) return;
        const clickDate = new Date(click.timestamp);
        const dateStr = clickDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        if (data[dateStr] !== undefined) {
          if (selectedCourseId === 'all' || String(click.courseId) === String(selectedCourseId)) {
            data[dateStr]++;
          }
        }
      });

      setChartData(Object.entries(data).map(([name, clicks]) => ({ name, clicks })));

      // Process top products
      const counts: Record<string, number> = {};
      clicks.forEach(click => {
        counts[click.courseId] = (counts[click.courseId] || 0) + 1;
      });

      const topWithDetails = Object.entries(counts)
        .map(([courseId, count]) => {
          const course = courses.find(c => String(c.id) === String(courseId));
          return { course, count };
        })
        .filter((item): item is { course: Course; count: number } => 
          !!item.course && !!item.course.title && !!item.course.image
        )
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setTopProducts(topWithDetails);

      // Process traffic sources
      const sourceCounts: Record<string, number> = {};
      clicks.forEach(click => {
        const source = click.trafficSource || 'Direct';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });

      setTrafficSourceStats(Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count));

      setLiveUsersCount(lUsersCount);
      setLiveUsers(lUsers);
    };

    loadAdminData();
    
    // Refresh every 5 minutes if tab is active
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadAdminData();
      }
    }, 300000);

    return () => clearInterval(interval);
  }, [currentUser, timeframe, selectedCourseId, courses]);

  useEffect(() => {
    const loadInitialData = async () => {
      const [fetchedCourses, fetchedTools, fetchedSettings] = await Promise.all([
        courseService.getAllCoursesRaw(),
        toolService.getTools(),
        settingsService.getSettings()
      ]);
      setCourses(fetchedCourses);
      setTools(fetchedTools);
      setSettings(fetchedSettings);
    };

    const handleCoursesUpdate = async () => {
      const fetchedCourses = await courseService.getAllCoursesRaw();
      setCourses(fetchedCourses);
    };

    const handleSettingsUpdate = async () => {
      const fetchedSettings = await settingsService.getSettings();
      setSettings(fetchedSettings);
    };

    window.addEventListener('courses-updated', handleCoursesUpdate);
    window.addEventListener('settings-updated', handleSettingsUpdate);
    loadInitialData();
    return () => {
      window.removeEventListener('courses-updated', handleCoursesUpdate);
      window.removeEventListener('settings-updated', handleSettingsUpdate);
    };
  }, []);

  const filteredCourses = courses.filter(course => 
    (course.title || 'Unknown').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (course.category || 'Uncategorized').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToolDelete = async () => {
    if (!toolToDelete) return;
    setIsDeleting(true);
    try {
      await toolService.deleteTool(toolToDelete.id);
      setTools(prev => prev.filter(t => t.id !== toolToDelete.id));
      setSelectedTools(prev => prev.filter(id => id !== toolToDelete.id));
      setToolToDelete(null);
      toast.success('Tool deleted successfully');
    } catch (error) {
      toast.error('Failed to delete tool');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddTool = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const gallery = (formData.get('gallery') as string)?.split('\n').filter(f => f.trim()) || [];
    
    const bundles = [
      { 
        name: formData.get('bundle1_name') as string, 
        price: Number(formData.get('bundle1_price')), 
        isPopular: formData.get('popular_bundle') === '1' 
      },
      { 
        name: formData.get('bundle2_name') as string, 
        price: Number(formData.get('bundle2_price')), 
        isPopular: formData.get('popular_bundle') === '2' 
      },
      { 
        name: formData.get('bundle3_name') as string, 
        price: Number(formData.get('bundle3_price')), 
        isPopular: formData.get('popular_bundle') === '3' 
      }
    ];

    const newTool: Omit<Tool, 'id'> = {
      title: formData.get('title') as string,
      price: Number(formData.get('price')),
      originalPrice: Number(formData.get('originalPrice')),
      image: formData.get('image') as string || previewImage || `https://picsum.photos/seed/${Date.now()}/800/600`,
      description: formData.get('description') as string,
      gallery,
      bundles,
      fakeReview: {
        userName: formData.get('fakeReview_user') as string || 'Emily R.',
        rating: 5,
        comment: formData.get('fakeReview_comment') as string || '',
        date: new Date().toISOString()
      },
      category: 'Tools',
      rating: 5,
      reviews: 1
    };

    try {
      const result = await toolService.addTool(newTool);
      if (result.id) {
        setTools(prev => [...prev, { ...newTool, id: result.id! } as Tool]);
        setIsAddToolModalOpen(false);
        setPreviewImage(null);
        toast.success('Tool added successfully');
      }
    } catch (error) {
      toast.error('Failed to add tool');
    }
  };

  const handleEditTool = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTool) return;
    const formData = new FormData(e.currentTarget);
    
    const gallery = (formData.get('gallery') as string)?.split('\n').filter(f => f.trim()) || [];
    
    const bundles = [
      { 
        name: formData.get('bundle1_name') as string, 
        price: Number(formData.get('bundle1_price')), 
        isPopular: formData.get('popular_bundle') === '1' 
      },
      { 
        name: formData.get('bundle2_name') as string, 
        price: Number(formData.get('bundle2_price')), 
        isPopular: formData.get('popular_bundle') === '2' 
      },
      { 
        name: formData.get('bundle3_name') as string, 
        price: Number(formData.get('bundle3_price')), 
        isPopular: formData.get('popular_bundle') === '3' 
      }
    ];

    const updatedTool: Tool = {
      ...editingTool,
      title: formData.get('title') as string,
      price: Number(formData.get('price')),
      originalPrice: Number(formData.get('originalPrice')),
      image: formData.get('image') as string || previewImage || editingTool.image,
      description: formData.get('description') as string,
      gallery,
      bundles,
      fakeReview: {
        userName: formData.get('fakeReview_user') as string || editingTool.fakeReview?.userName || 'Emily R.',
        rating: 5,
        comment: formData.get('fakeReview_comment') as string || editingTool.fakeReview?.comment || '',
        date: editingTool.fakeReview?.date || new Date().toISOString()
      }
    };

    try {
      await toolService.updateTool(updatedTool);
      setTools(prev => prev.map(t => t.id === updatedTool.id ? updatedTool : t));
      setEditingTool(null);
      setPreviewImage(null);
      toast.success('Tool updated successfully');
    } catch (error) {
      toast.error('Failed to update tool');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('admin_session');
    window.dispatchEvent(new Event('admin-logout'));
    toast.success('Logged out successfully');
    navigate('/admin');
  };

  const handleDelete = async () => {
    if (!courseToDelete) return;
    setIsDeleting(true);
    try {
      await courseService.deleteCourse(courseToDelete.id);
      setCourses(prev => prev.filter(c => c.id !== courseToDelete.id));
      setSelectedCourses(prev => prev.filter(id => id !== courseToDelete.id));
      setCourseToDelete(null);
      toast.success('Course deleted successfully');
    } catch (error) {
      toast.error('Failed to delete course');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(selectedCourses.map(id => courseService.deleteCourse(id)));
      setCourses(prev => prev.filter(c => !selectedCourses.includes(c.id)));
      setSelectedCourses([]);
      setIsBulkDeleteModalOpen(false);
      toast.success(`${selectedCourses.length} courses deleted successfully`);
    } catch (error) {
      toast.error('Failed to delete some courses');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedCourses.length === filteredCourses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(filteredCourses.map(c => c.id));
    }
  };

  const toggleSelectCourse = (id: string | number) => {
    setSelectedCourses(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllUsers = (filteredUsers: UserProfile[]) => {
    if (selectedUsers.length === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.uid));
    }
  };

  const toggleSelectUser = (uid: string) => {
    setSelectedUsers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletEmail || !walletAmount) return;
    setIsAddingFunds(true);
    try {
      await walletService.addFundsByEmail(walletEmail, Number(walletAmount));
      toast.success(`Successfully added $${walletAmount} to ${walletEmail}`);
      setWalletEmail('');
      setWalletAmount('');
    } catch (error) {
      toast.error('Failed to add funds: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsAddingFunds(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGalleryPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileImagesPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const additionalChoices = formData.get('additionalChoices') as string;
    
    const galleryFromText = (formData.get('gallery') as string || '').split('\n').filter(Boolean);
    const fileImagesFromText = (formData.get('fileImages') as string || '').split('\n').filter(Boolean);

    const newCourse = {
      title: formData.get('title') as string,
      category: formData.get('category') as string,
      price: `$${formData.get('price')}`,
      originalPrice: `$${formData.get('originalPrice')}`,
      rating: Number(formData.get('rating')),
      reviews: 0,
      image: previewImage || formData.get('image') as string || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop',
      additionalChoices: additionalChoices === 'None' ? '' : additionalChoices,
      sourceUrl: formData.get('sourceUrl') as string || '',
      about: formData.get('about') as string || '',
      objectives: (formData.get('objectives') as string || '').split('\n').filter(Boolean),
      gallery: [...galleryFromText, ...galleryPreviews],
      fileImages: [...fileImagesFromText, ...fileImagesPreviews],
      courseLink: formData.get('courseLink') as string || ''
    };

    // Check document size (Firestore limit is 1MB)
    const docSize = new Blob([JSON.stringify(newCourse)]).size;
    if (docSize > 1000000) {
      toast.error(`Course data is too large (${(docSize / 1024 / 1024).toFixed(2)}MB). Firestore limit is 1MB. Please use smaller images or external URLs instead of base64 uploads.`);
      return;
    }

    try {
      const result = await courseService.addCourse(newCourse);
      if (result && (result as any).error) {
        throw (result as any).error;
      }
      setIsAddModalOpen(false);
      setPreviewImage(null);
      setGalleryPreviews([]);
      setFileImagesPreviews([]);
      toast.success('Course added successfully!');
    } catch (error: any) {
      console.error('Failed to add course:', error);
      toast.error(`Failed to add course: ${error.message || 'Please check your database connection.'}`);
    }
  };

  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const additionalChoices = formData.get('additionalChoices') as string;
    
    const galleryFromText = (formData.get('gallery') as string || '').split('\n').filter(Boolean);
    const fileImagesFromText = (formData.get('fileImages') as string || '').split('\n').filter(Boolean);

    const updatedCourse = {
      ...editingCourse,
      title: formData.get('title') as string,
      category: formData.get('category') as string,
      price: `$${formData.get('price')}`,
      originalPrice: `$${formData.get('originalPrice')}`,
      rating: Number(formData.get('rating')),
      image: previewImage || formData.get('image') as string || editingCourse.image,
      additionalChoices: additionalChoices === 'None' ? '' : additionalChoices,
      sourceUrl: formData.get('sourceUrl') as string || '',
      about: formData.get('about') as string || '',
      objectives: (formData.get('objectives') as string || '').split('\n').filter(Boolean),
      gallery: [...galleryFromText, ...galleryPreviews],
      fileImages: [...fileImagesFromText, ...fileImagesPreviews],
      courseLink: formData.get('courseLink') as string || ''
    };

    // Check document size (Firestore limit is 1MB)
    const docSize = new Blob([JSON.stringify(updatedCourse)]).size;
    if (docSize > 1000000) {
      toast.error(`Course data is too large (${(docSize / 1024 / 1024).toFixed(2)}MB). Firestore limit is 1MB. Please use smaller images or external URLs instead of base64 uploads.`);
      return;
    }

    try {
      const result = await courseService.updateCourse(updatedCourse);
      if (result && (result as any).error) {
        throw (result as any).error;
      }
      setEditingCourse(null);
      setPreviewImage(null);
      setGalleryPreviews([]);
      setFileImagesPreviews([]);
      toast.success('Course updated successfully!');
    } catch (error: any) {
      console.error('Failed to update course:', error);
      toast.error(`Failed to update course: ${error.message || 'Please check your database connection.'}`);
    }
  };

  const renderLiveTraffic = () => (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-4">
          <h2 className="font-bold text-slate-900">Live Online Users</h2>
          <div className="flex items-center gap-2 text-sm text-green-600 font-bold">
            <div className="h-2 w-2 rounded-full bg-green-600 animate-pulse"></div>
            {liveUsers.length} Users Online
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">User ID / Email</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Last Active</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {liveUsers.map((user) => (
                <tr key={user.id} className="group transition-colors hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${user.isGuest ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-600'}`}>
                        {user.isGuest ? 'G' : 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{user.email || 'Guest'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      user.isGuest 
                        ? "bg-slate-100 text-slate-600" 
                        : user.vipStatus === 'active'
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
                    )}>
                      {user.isGuest ? 'Guest' : user.vipStatus === 'active' ? 'VIP Member' : 'Member'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {user.lastSeen ? new Date(user.lastSeen).toLocaleTimeString() : 'Just now'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center gap-1.5 text-green-600">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-600"></div>
                      <span className="text-xs font-bold uppercase tracking-wider">Online</span>
                    </span>
                  </td>
                </tr>
              ))}
              {liveUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No users currently online
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderWallet = () => (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
            <Wallet className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Wallet Management</h2>
            <p className="text-slate-500 text-sm">Add funds to user wallets by email address.</p>
          </div>
        </div>

        <form onSubmit={handleAddFunds} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">User Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="email"
                required
                value={walletEmail}
                onChange={(e) => setWalletEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                placeholder="user@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Amount to Add ($)</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="number"
                required
                min="1"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                placeholder="100"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isAddingFunds}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg hover:shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
          >
            {isAddingFunds ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto"></div>
            ) : (
              'Add Funds to Wallet'
            )}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
              <Activity className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Transaction History</h2>
              <p className="text-slate-500 text-sm">All wallet transactions across the platform.</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">User</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {allTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                    No transactions found
                  </td>
                </tr>
              ) : (
                allTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="text-sm font-bold text-slate-900">
                        {tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : 'Pending'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : ''}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-bold text-slate-900">{tx.userEmail}</div>
                      <div className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{tx.userId}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-medium text-slate-600">{tx.description}</div>
                      <div className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest mt-1",
                        tx.type === 'deposit' ? "bg-green-100 text-green-600" :
                        tx.type === 'withdrawal' ? "bg-red-100 text-red-600" :
                        tx.type === 'course_purchase' ? "bg-blue-100 text-blue-600" :
                        tx.type === 'tool_purchase' ? "bg-purple-100 text-purple-600" :
                        tx.type === 'affiliate_commission' ? "bg-amber-100 text-amber-600" :
                        tx.type === 'vip_join' ? "bg-yellow-100 text-yellow-600" :
                        tx.type === 'refund' ? "bg-slate-100 text-slate-600" :
                        "bg-slate-100 text-slate-500"
                      )}>
                        {tx.type.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className={cn(
                        "text-sm font-black",
                        tx.amount > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderVIPManagement = () => (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-50 rounded-2xl text-yellow-600">
              <StarIcon className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">VIP Membership Requests</h2>
              <p className="text-slate-500 text-sm">Review and manage user VIP membership applications.</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">User</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Telegram / WhatsApp</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vipRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No VIP requests found
                  </td>
                </tr>
              ) : (
                vipRequests.map((req) => (
                  <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="text-sm font-bold text-slate-900">{req.userEmail}</div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {req.createdAt ? new Date(req.createdAt).toLocaleString() : 'Just now'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-bold text-slate-900">{req.fullName}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-xs font-medium text-slate-600">TG: {req.telegramUsername}</div>
                      <div className="text-xs font-medium text-slate-600">WA: {req.whatsappNumber}</div>
                    </td>
                    <td className="py-4 px-4 font-black text-slate-900">${req.amount}</td>
                    <td className="py-4 px-4">
                      <span className={cn(
                        "rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                        req.status === 'pending' ? "bg-blue-100 text-blue-600" :
                        req.status === 'approved' ? "bg-green-100 text-green-600" :
                        "bg-red-100 text-red-600"
                      )}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {req.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={async () => {
                              try {
                                const result = await vipService.approveVIPRequest(req.id, req.userId);
                                if (result.success) {
                                  toast.success('VIP request approved successfully');
                                } else {
                                  toast.error(result.error || 'Failed to approve');
                                }
                              } catch (err) {
                                toast.error('An error occurred');
                              }
                            }}
                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={async () => {
                              try {
                                const result = await vipService.rejectVIPRequest(req.id, req.userId, req.amount);
                                if (result.success) {
                                  toast.success('VIP request rejected and funds refunded');
                                } else {
                                  toast.error(result.error || 'Failed to reject');
                                }
                              } catch (err) {
                                toast.error('An error occurred');
                              }
                            }}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title="Reject"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderWithdrawals = () => (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-2xl text-[#FF6B35]">
              <DollarSign className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Withdrawal Requests</h2>
              <p className="text-slate-500 text-sm">Manage and process affiliate withdrawal requests.</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">User</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Method</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Details</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {withdrawalRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No withdrawal requests found
                  </td>
                </tr>
              ) : (
                withdrawalRequests.map((req) => (
                  <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="text-sm font-bold text-slate-900">{req.userEmail}</div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {req.timestamp ? new Date(req.timestamp).toLocaleString() : 'Just now'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={cn(
                        "rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                        req.method === 'bKash' ? "bg-pink-100 text-pink-600" : "bg-yellow-100 text-yellow-700"
                      )}>
                        {req.method}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-black text-slate-900">${req.amount}</td>
                    <td className="py-4 px-4">
                      <div className="text-xs font-mono bg-slate-100 p-1 rounded">
                        {req.method === 'bKash' ? `bKash: ${req.details}` : `UID: ${req.details}`}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={cn(
                        "rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                        req.status === 'Pending' ? "bg-blue-100 text-blue-600" :
                        req.status === 'Processed' ? "bg-green-100 text-green-600" :
                        "bg-red-100 text-red-600"
                      )}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {req.status === 'Pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={async () => {
                              try {
                                const result = await walletService.updateWithdrawalStatus(req.id!, 'Processed');
                                if (result.success) {
                                  toast.success('Withdrawal marked as processed');
                                } else {
                                  toast.error(result.error || 'Failed to process');
                                }
                              } catch (err) {
                                toast.error('An error occurred');
                              }
                            }}
                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={async () => {
                              try {
                                const result = await walletService.updateWithdrawalStatus(req.id!, 'Rejected');
                                if (result.success) {
                                  toast.success('Withdrawal rejected and funds refunded');
                                } else {
                                  toast.error(result.error || 'Failed to reject');
                                }
                              } catch (err) {
                                toast.error('An error occurred');
                              }
                            }}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title="Reject"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPaymentProofs = () => (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Payment Proofs Review</h2>
              <p className="text-slate-500 text-sm">Review and approve user deposit requests.</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">User</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Method</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Details</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Screenshot</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {depositRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No deposit requests found
                  </td>
                </tr>
              ) : (
                depositRequests.map((req) => (
                  <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="text-sm font-bold text-slate-900">{req.userEmail}</div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {req.timestamp ? new Date(req.timestamp).toLocaleString() : 'Just now'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={cn(
                        "rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                        req.method === 'bKash' ? "bg-pink-100 text-pink-600" : "bg-yellow-100 text-yellow-700"
                      )}>
                        {req.method}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-black text-slate-900">${req.amount}</td>
                    <td className="py-4 px-4">
                      {req.method === 'bKash' ? (
                        <div className="text-xs font-mono bg-slate-100 p-1 rounded">TxID: {req.transactionId}</div>
                      ) : (
                        <div className="text-xs font-mono bg-slate-100 p-1 rounded">UID: {req.binanceUid}</div>
                      )}
                      {req.couponCode && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          <Tag className="w-2.5 h-2.5" />
                          {req.couponCode}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="relative group">
                        {req.screenshotUrl ? (
                          <img 
                            src={req.screenshotUrl} 
                            alt="Proof" 
                            className="h-16 w-16 rounded-xl object-cover border-2 border-slate-200 cursor-pointer hover:scale-110 hover:shadow-xl transition-all"
                            onClick={() => window.open(req.screenshotUrl, '_blank')}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-xl bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-200">
                            <ImageIcon className="h-6 w-6 text-slate-300" />
                          </div>
                        )}
                        <div className="absolute -top-2 -right-2 bg-white rounded-full shadow-md p-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-100">
                          <Eye className="h-3 w-3 text-blue-600" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={cn(
                        "rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                        req.status === 'Pending' ? "bg-blue-100 text-blue-600" :
                        req.status === 'Paid' ? "bg-green-100 text-green-600" :
                        "bg-red-100 text-red-600"
                      )}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {req.status === 'Pending' && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={async (e) => {
                              e.preventDefault();
                              const confirmApprove = window.confirm('Are you sure you want to approve this payment? This will add funds to the user\'s wallet.');
                              if (!confirmApprove) return;
                              
                              try {
                                const result = await walletService.updateDepositStatus(req.id!, 'Paid');
                                if (result.success) {
                                  toast.success('Payment approved and funds added to wallet');
                                } else {
                                  toast.error(result.error || 'Failed to approve');
                                }
                              } catch (err) {
                                console.error('Approval error:', err);
                                toast.error('An error occurred during approval');
                              }
                            }}
                            className="rounded-xl bg-green-500 p-2.5 text-white hover:bg-green-600 shadow-sm hover:shadow-md transition-all active:scale-95"
                            title="Approve (Paid)"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={async (e) => {
                              e.preventDefault();
                              const confirmReject = window.confirm('Are you sure you want to reject this payment?');
                              if (!confirmReject) return;

                              try {
                                const result = await walletService.updateDepositStatus(req.id!, 'Rejected');
                                if (result.success) {
                                  toast.error('Payment rejected');
                                } else {
                                  toast.error(result.error || 'Failed to reject');
                                }
                              } catch (err) {
                                console.error('Rejection error:', err);
                                toast.error('An error occurred during rejection');
                              }
                            }}
                            className="rounded-xl bg-red-500 p-2.5 text-white hover:bg-red-600 shadow-sm hover:shadow-md transition-all active:scale-95"
                            title="Reject"
                          >
                            <UserX className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={async (e) => {
                              e.preventDefault();
                              const confirmDecline = window.confirm('Are you sure you want to decline this payment?');
                              if (!confirmDecline) return;

                              try {
                                const result = await walletService.updateDepositStatus(req.id!, 'Declined');
                                if (result.success) {
                                  toast.error('Payment declined');
                                } else {
                                  toast.error(result.error || 'Failed to decline');
                                }
                              } catch (err) {
                                console.error('Decline error:', err);
                                toast.error('An error occurred during decline');
                              }
                            }}
                            className="rounded-xl bg-slate-500 p-2.5 text-white hover:bg-slate-600 shadow-sm hover:shadow-md transition-all active:scale-95"
                            title="Decline"
                          >
                            <Ban className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCourseOrders = () => {
    const filteredOrders = courseOrders.filter(order => 
      order.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.courseTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Course Purchase Orders</h2>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-slate-600">
            {filteredOrders.length} Orders
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">User</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Course</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{order.userEmail}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{order.userId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900">{order.courseTitle}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900">${order.amount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        order.status === 'Completed' ? "bg-green-100 text-green-600" :
                        order.status === 'Rejected' ? "bg-red-100 text-red-600" :
                        "bg-yellow-100 text-yellow-600"
                      )}>
                        {order.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-500">
                        {order.timestamp ? new Date(order.timestamp).toLocaleString() : 'Just now'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(order.status === 'Pending' || !order.status) && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={async () => {
                              try {
                                await walletService.updateCourseOrderStatus(order.id!, 'Completed');
                                toast.success('Course order approved');
                                // Refresh orders
                                const updated = await walletService.getAllCourseOrders();
                                setCourseOrders(updated);
                              } catch (e) {
                                toast.error('Failed to approve order');
                              }
                            }}
                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                            title="Approve Order"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={async () => {
                              try {
                                await walletService.updateCourseOrderStatus(order.id!, 'Rejected');
                                toast.success('Course order rejected');
                                // Refresh orders
                                const updated = await walletService.getAllCourseOrders();
                                setCourseOrders(updated);
                              } catch (e) {
                                toast.error('Failed to reject order');
                              }
                            }}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title="Reject Order"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderToolOrders = () => {
    const filteredOrders = toolOrders.filter(order => 
      order.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.toolTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Tool Purchase Orders</h2>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-slate-600">
            {filteredOrders.length} Orders
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">User</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Tool</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{order.userEmail}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{order.userId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900">{order.toolTitle}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-slate-900">${order.amount}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        order.status === 'Purchased' ? "bg-green-100 text-green-600" :
                        order.status === 'Rejected' ? "bg-red-100 text-red-600" :
                        "bg-yellow-100 text-yellow-600"
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-500">
                        {order.timestamp ? new Date(order.timestamp).toLocaleDateString() : 'Just now'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {order.status === 'Ordered' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setIsUpdatingOrder(order.id!);
                              setOrderAccountInfo(order.accountInfo || '');
                            }}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Process Order"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => walletService.updateToolOrderStatus(order.id!, 'Rejected')}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title="Reject Order"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setIsUpdatingOrder(order.id!);
                            setOrderAccountInfo(order.accountInfo || '');
                          }}
                          className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Update Order Modal */}
        {isUpdatingOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Process Tool Order</h3>
                  <button onClick={() => setIsUpdatingOrder(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <CloseIcon className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Account Info / Delivery Details</label>
                    <textarea 
                      value={orderAccountInfo}
                      onChange={(e) => setOrderAccountInfo(e.target.value)}
                      placeholder="Enter account credentials, download links, or license keys..."
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#FF6B35] outline-none transition-all font-medium min-h-[150px]"
                    />
                    <p className="mt-2 text-[10px] text-slate-400 font-medium">This information will be visible to the user once the order is marked as Purchased.</p>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsUpdatingOrder(null)}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={async () => {
                        const result = await walletService.updateToolOrderStatus(isUpdatingOrder, 'Purchased', orderAccountInfo);
                        if (result.success) {
                          toast.success('Order updated successfully');
                          setIsUpdatingOrder(null);
                        } else {
                          toast.error(result.error || 'Failed to update order');
                        }
                      }}
                      className="flex-1 py-4 bg-[#FF6B35] text-black rounded-2xl font-black uppercase tracking-widest hover:shadow-xl transition-all"
                    >
                      Mark as Purchased
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  };

  const renderTools = () => {
    const filteredTools = tools.filter(tool => 
      tool.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-4">
          <h2 className="font-bold text-slate-900">Tool List</h2>
          <button 
            onClick={() => toast.info('Filtering coming soon')}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Tool</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTools.map((tool) => (
                <tr key={tool.id} className="group transition-colors hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={tool.image} 
                        alt={tool.title} 
                        className="h-10 w-10 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://picsum.photos/seed/${tool.id}/100/100`;
                        }}
                      />
                      <div>
                        <p className="font-bold text-slate-900">{tool.title}</p>
                        <p className="text-xs text-slate-500">ID: #{tool.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {tool.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">${tool.price}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-900">{tool.rating}</span>
                      <span className="text-slate-400">({tool.reviews})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button 
                        onClick={() => {
                          setEditingTool(tool);
                          setPreviewImage(tool.image);
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600" 
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setToolToDelete(tool)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600" 
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {[
          { label: 'Total Clicks', value: chartData.reduce((acc, curr) => acc + curr.clicks, 0), icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Live Online Users', value: liveUsersCount, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Last 7 Days', value: chartData.slice(-7).reduce((acc, curr) => acc + curr.clicks, 0), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Last 30 Days', value: chartData.slice(-30).reduce((acc, curr) => acc + curr.clicks, 0), icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50' }
        ].map((stat, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <div className={`rounded-lg ${stat.bg} p-3`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Click Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Click Analytics</h2>
              <p className="text-sm text-slate-500">Overview of user engagement</p>
            </div>
            <div className="flex items-center gap-3">
              <select 
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                <option value="all">All Courses</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <select 
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium focus:outline-none"
                value={timeframe}
                onChange={(e) => setTimeframe(Number(e.target.value))}
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
              </select>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="clicks" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Ranking */}
        <div className="space-y-8">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-lg font-bold text-slate-900">Top Clicked Courses</h2>
            <div className="space-y-4">
              {topProducts.length > 0 ? topProducts.map((item, i) => (
                <div key={item.course.id} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                    {i + 1}
                  </div>
                  <img 
                    src={item.course.image} 
                    alt={item.course.title} 
                    className="h-10 w-10 rounded-lg object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://picsum.photos/seed/${item.course.id}/100/100`;
                    }}
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-bold text-slate-900">{item.course.title}</p>
                    <p className="text-xs text-slate-500">{item.count} clicks</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="mb-2 h-12 w-12 text-slate-200" />
                  <p className="text-sm text-slate-500">No click data available yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-lg font-bold text-slate-900">Traffic Sources</h2>
            <div className="space-y-4">
              {trafficSourceStats.length > 0 ? trafficSourceStats.map((stat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium text-slate-700">{stat.source}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{stat.count}</span>
                </div>
              )) : (
                <p className="text-center text-sm text-slate-500 py-4">No traffic source data available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => {
    const filteredUsers = users.filter(user => 
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(userSearchTerm.toLowerCase())
    );

    const handleUpdateUser = async (uid: string, data: Partial<UserProfile>) => {
      try {
        await userService.updateUserByAdmin(uid, data);
        toast.success('User updated successfully');
      } catch (error) {
        toast.error('Failed to update user');
      }
    };

    const stats = {
      total: users.length,
      admins: users.filter(u => u.role === 'admin').length,
      blocked: users.filter(u => u.status === 'blocked').length,
      activeToday: users.filter(u => {
        if (!u.lastLogin) return false;
        const lastLogin = new Date(u.lastLogin);
        const today = new Date();
        return lastLogin.toDateString() === today.toDateString();
      }).length
    };

    return (
      <div className="space-y-8">
        {/* User Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Users</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Admins</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.admins}</h3>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-green-50 p-3 text-green-600">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Active Today</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.activeToday}</h3>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-red-50 p-3 text-red-600">
                <Ban className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Blocked</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.blocked}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-4">
            <div className="flex items-center gap-4">
              <h2 className="font-bold text-slate-900">User Directory</h2>
              {selectedUsers.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    {selectedUsers.length} Selected
                  </span>
                  <button
                    onClick={() => {
                      const selectedEmails = users
                        .filter(u => selectedUsers.includes(u.uid))
                        .map(u => u.email)
                        .join(',');
                      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${selectedEmails}`, '_blank');
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    <Mail className="h-3 w-3" />
                    Bulk Email
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Are you sure you want to block ${selectedUsers.length} users?`)) {
                        try {
                          await Promise.all(selectedUsers.map(uid => userService.updateUserByAdmin(uid, { status: 'blocked' })));
                          setSelectedUsers([]);
                          toast.success('Users blocked successfully');
                        } catch (error) {
                          toast.error('Failed to block some users');
                        }
                      }
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
                  >
                    <Ban className="h-3 w-3" />
                    Bulk Block
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock className="h-4 w-4" />
              Real-time updates enabled
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length}
                      onChange={() => toggleSelectAllUsers(filteredUsers)}
                    />
                  </th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Balance</th>
                  <th className="px-6 py-4">VIP Renewals</th>
                  <th className="px-6 py-4">Lifetime Deposit</th>
                  <th className="px-6 py-4">Lifetime Clicks</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Last Login</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className={cn("group transition-colors hover:bg-slate-50/50", selectedUsers.includes(user.uid) && "bg-blue-50/30")}>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedUsers.includes(user.uid)}
                        onChange={() => toggleSelectUser(user.uid)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-100">
                          {user.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt={user.displayName} 
                              className="h-full w-full object-cover" 
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://api.dicebear.com/7.x/notionists/svg?seed=${user.email}`;
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-blue-50 text-blue-600 font-bold">
                              {user.email[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{user.displayName || 'Anonymous'}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ${(user.walletBalance || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {user.vipRenewalCount || 0}
                    </td>
                    <td className="px-6 py-4 font-bold text-green-600">
                      ${(user.lifetimeDeposit || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {user.lifetimeClicks || 0}
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.role}
                        onChange={(e) => handleUpdateUser(user.uid, { role: e.target.value as 'admin' | 'user' })}
                        className={`rounded-full px-3 py-1 text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${user.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {user.status === 'blocked' ? <Ban className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                        {user.status === 'blocked' ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.status === 'blocked' ? (
                          <button 
                            onClick={() => handleUpdateUser(user.uid, { status: 'active' })}
                            className="rounded-lg p-2 text-green-600 hover:bg-green-50"
                            title="Unblock User"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleUpdateUser(user.uid, { status: 'blocked' })}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                            title="Block User"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${user.email}`, '_blank')}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                          title="Contact User"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Users className="mb-2 h-12 w-12 opacity-20" />
                {userSearchTerm ? (
                  <p>No users found matching "{userSearchTerm}"</p>
                ) : (
                  <p>No users registered yet</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="max-w-4xl space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-green-50 p-2">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Currency Rate Management</h2>
        </div>

        <div className="space-y-6">
          <p className="text-sm font-medium text-slate-500">Set the exchange rate for every 1 USD.</p>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">1 USD to INR</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                <input 
                  type="number"
                  step="0.01"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-bold focus:border-green-500 focus:bg-white focus:outline-none"
                  value={settings.currencyRates?.INR || 0}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    currencyRates: { ...settings.currencyRates!, INR: parseFloat(e.target.value) || 0 } 
                  })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">1 USD to PKR</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rs</span>
                <input 
                  type="number"
                  step="0.01"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-bold focus:border-green-500 focus:bg-white focus:outline-none"
                  value={settings.currencyRates?.PKR || 0}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    currencyRates: { ...settings.currencyRates!, PKR: parseFloat(e.target.value) || 0 } 
                  })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">1 USD to BDT</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                <input 
                  type="number"
                  step="0.01"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-bold focus:border-green-500 focus:bg-white focus:outline-none"
                  value={settings.currencyRates?.BDT || 0}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    currencyRates: { ...settings.currencyRates!, BDT: parseFloat(e.target.value) || 0 } 
                  })}
                />
              </div>
            </div>
          </div>

          <button 
            onClick={async () => {
              await settingsService.updateSettings(settings);
              toast.success('Currency rates updated successfully');
            }}
            className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-green-700 active:scale-95"
          >
            <Save className="h-4 w-4" />
            Save Rates
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2">
            <Megaphone className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Announcements & Offers</h2>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Global Announcement</label>
            <textarea 
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
              rows={3}
              value={settings.announcement}
              onChange={(e) => setSettings({ ...settings, announcement: e.target.value })}
              placeholder="Enter announcement text..."
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Announcement Link (Optional)
              </label>
              <input 
                type="url"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                value={settings.announcementLink || ''}
                onChange={(e) => setSettings({ ...settings, announcementLink: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Countdown Timer (Optional)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  { label: '1 Day', ms: 1 * 24 * 60 * 60 * 1000 },
                  { label: '3 Days', ms: 3 * 24 * 60 * 60 * 1000 },
                  { label: '7 Days', ms: 7 * 24 * 60 * 60 * 1000 },
                  { label: '1 Month', ms: 30 * 24 * 60 * 60 * 1000 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const targetDate = new Date(Date.now() + preset.ms);
                      const year = targetDate.getFullYear();
                      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
                      const day = String(targetDate.getDate()).padStart(2, '0');
                      const hours = String(targetDate.getHours()).padStart(2, '0');
                      const minutes = String(targetDate.getMinutes()).padStart(2, '0');
                      const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
                      setSettings({ ...settings, announcementCountdown: formatted });
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-600 rounded-lg text-xs font-medium transition-colors border border-slate-200"
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, announcementCountdown: null })}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors border border-red-100"
                >
                  Clear
                </button>
              </div>
              <input 
                type="datetime-local"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                value={settings.announcementCountdown || ''}
                onChange={(e) => setSettings({ ...settings, announcementCountdown: e.target.value })}
              />
            </div>
          </div>
          
          <button 
            onClick={async () => {
              await settingsService.updateSettings(settings);
              toast.success('Announcements updated successfully');
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95"
          >
            <Save className="h-4 w-4" />
            Update Content
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-purple-50 p-2">
            <Tag className="h-5 w-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Manage Categories</h2>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {settings.categories.map((cat, i) => (
              <div key={i} className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
                {cat}
                <button 
                  onClick={() => setSettings({ ...settings, categories: settings.categories.filter(c => c !== cat) })}
                  className="text-slate-400 hover:text-red-500"
                >
                  <CloseIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text"
              id="new-category"
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
              placeholder="Add new category..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value;
                  if (val && !settings.categories.includes(val)) {
                    setSettings({ ...settings, categories: [...settings.categories, val] });
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
            <button 
              onClick={() => {
                const input = document.getElementById('new-category') as HTMLInputElement;
                if (input.value && !settings.categories.includes(input.value)) {
                  setSettings({ ...settings, categories: [...settings.categories, input.value] });
                  input.value = '';
                }
              }}
              className="rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800"
            >
              Add
            </button>
          </div>
          <div className="pt-4">
            <button 
              onClick={async () => {
                await settingsService.updateSettings(settings);
                toast.success('Categories updated successfully');
              }}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-purple-700 active:scale-95"
            >
              <Save className="h-4 w-4" />
              Save Categories
            </button>
          </div>
        </div>
      </div>

      {/* Manage Coupons Section */}
      <div id="manage-coupons" className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-amber-50 p-2">
            <Tag className="h-5 w-5 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Manage Coupons</h2>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Coupon Code</label>
              <input 
                type="text"
                value={couponForm.code}
                onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                placeholder="e.g. SAVE50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Discount (%)</label>
              <input 
                type="number"
                value={couponForm.discount}
                onChange={(e) => setCouponForm({ ...couponForm, discount: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                placeholder="e.g. 50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Course</label>
              <select 
                value={couponForm.courseId}
                onChange={(e) => setCouponForm({ ...couponForm, courseId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
              >
                <option value="all">All Courses</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Expiry Date</label>
              <input 
                type="datetime-local"
                value={couponForm.expiryDate}
                onChange={(e) => setCouponForm({ ...couponForm, expiryDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div className="flex items-end gap-2">
              <button 
                type="button"
                onClick={async () => {
                  const { code, discount, courseId, expiryDate } = couponForm;
                  const trimmedCode = code.trim();
                  const numDiscount = Number(discount);
                  const finalCourseId = courseId === 'all' ? undefined : courseId;
                  
                  if (trimmedCode && numDiscount > 0) {
                    const isDuplicate = (settings.coupons || []).some((c, idx) => 
                      idx !== editingCouponIndex && c.code === trimmedCode
                    );
                    
                    if (isDuplicate) {
                      toast.error('Coupon code already exists');
                      return;
                    }

                    let newCoupons;
                    if (editingCouponIndex !== null) {
                      newCoupons = (settings.coupons || []).map((c, idx) => 
                        idx === editingCouponIndex ? { ...c, code: trimmedCode, discount: numDiscount, courseId: finalCourseId, expiryDate: expiryDate || undefined } : c
                      );
                    } else {
                      newCoupons = [...(settings.coupons || []), { code: trimmedCode, discount: numDiscount, isActive: true, courseId: finalCourseId, expiryDate: expiryDate || undefined }];
                    }

                    const newSettings = { ...settings, coupons: newCoupons };
                    
                    // Update local state first for immediate feedback
                    setSettings(newSettings);
                    
                    // Auto-save to Firestore
                    const result = await settingsService.updateSettings(newSettings);
                    if (!result.error) {
                      toast.success(editingCouponIndex !== null ? 'Coupon updated and saved' : 'Coupon added and saved');
                      setCouponForm({ code: '', discount: '', courseId: 'all', expiryDate: '' });
                      setEditingCouponIndex(null);
                    } else {
                      toast.error('Failed to save to database. Please try again.');
                      // Revert local state if save failed
                      const revertedSettings = await settingsService.getSettings();
                      setSettings(revertedSettings);
                    }
                  } else {
                    toast.error('Please enter a valid code and discount');
                  }
                }}
                className={cn(
                  "w-full rounded-xl py-3 text-sm font-bold text-white transition-all",
                  editingCouponIndex !== null ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-900 hover:bg-slate-800"
                )}
              >
                {editingCouponIndex !== null ? 'Update Coupon' : 'Add Coupon'}
              </button>
              {editingCouponIndex !== null && (
                <button 
                  type="button"
                  onClick={() => {
                    setCouponForm({ code: '', discount: '', courseId: 'all', expiryDate: '' });
                    setEditingCouponIndex(null);
                  }}
                  className="rounded-xl bg-slate-100 p-3 text-slate-600 hover:bg-slate-200"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[800px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Discount</th>
                  <th className="px-6 py-3">Course</th>
                  <th className="px-6 py-3">Expiry</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(settings.coupons || []).map((coupon, i) => {
                  const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
                  return (
                    <tr key={i}>
                      <td className="px-6 py-4 font-bold text-slate-900">{coupon.code}</td>
                      <td className="px-6 py-4 text-slate-600">{coupon.discount}%</td>
                      <td className="px-6 py-4 text-slate-600">
                        {coupon.courseId ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                            {courses.find(c => c.id === coupon.courseId)?.title || 'Unknown Course'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                            All Courses
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {coupon.expiryDate ? (
                          <span className={`inline-flex items-center gap-1 text-xs ${isExpired ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                            <Clock className="h-3 w-3" />
                            {new Date(coupon.expiryDate).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No Expiry</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <button 
                            type="button"
                            onClick={async () => {
                              const newCoupons = (settings.coupons || []).map((c, idx) => 
                                idx === i ? { ...c, isActive: !c.isActive } : c
                              );
                              const newSettings = { ...settings, coupons: newCoupons };
                              setSettings(newSettings);
                              await settingsService.updateSettings(newSettings);
                              toast.success(`Coupon ${newCoupons[i].isActive ? 'activated' : 'deactivated'}`);
                            }}
                            className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}
                          >
                            {coupon.isActive ? 'Active' : 'Inactive'}
                          </button>
                          {isExpired && (
                            <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-700 uppercase">
                              Expired
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            type="button"
                            onClick={() => {
                              setCouponForm({
                                code: coupon.code,
                                discount: String(coupon.discount),
                                courseId: coupon.courseId || 'all',
                                expiryDate: coupon.expiryDate || ''
                              });
                              setEditingCouponIndex(i);
                              document.getElementById('manage-coupons')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit Coupon"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={async () => {
                              const newCoupons = (settings.coupons || []).filter((_, idx) => idx !== i);
                              const newSettings = { ...settings, coupons: newCoupons };
                              setSettings(newSettings);
                              
                              if (editingCouponIndex === i) {
                                setEditingCouponIndex(null);
                                setCouponForm({ code: '', discount: '', courseId: 'all', expiryDate: '' });
                              }

                              await settingsService.updateSettings(newSettings);
                              toast.success('Coupon deleted');
                            }}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete Coupon"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!settings.coupons || settings.coupons.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No coupons created yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              onClick={async () => {
                const result = await settingsService.updateSettings(settings);
                if (!result.error) {
                  toast.success('All coupons saved successfully');
                } else {
                  toast.error('Failed to save coupons');
                }
              }}
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-amber-700 active:scale-95 shadow-lg shadow-amber-600/20"
            >
              <Save className="h-4 w-4" />
              Save All Coupons
            </button>
          </div>


        </div>
      </div>

      {/* Manage Deposit Coupons Section */}
      <div id="manage-deposit-coupons" className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-green-50 p-2">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Manage Deposit Coupons</h2>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Coupon Code</label>
              <input 
                type="text"
                value={depositCouponForm.code}
                onChange={(e) => setDepositCouponForm({ ...depositCouponForm, code: e.target.value.toUpperCase() })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                placeholder="e.g. BONUS10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Bonus (%)</label>
              <input 
                type="number"
                value={depositCouponForm.bonus}
                onChange={(e) => setDepositCouponForm({ ...depositCouponForm, bonus: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                placeholder="e.g. 10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Expiry Date</label>
              <input 
                type="datetime-local"
                value={depositCouponForm.expiryDate}
                onChange={(e) => setDepositCouponForm({ ...depositCouponForm, expiryDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div className="flex items-end gap-2">
              <button 
                type="button"
                onClick={async () => {
                  const { code, bonus, expiryDate } = depositCouponForm;
                  const trimmedCode = code.trim();
                  const numBonus = Number(bonus);
                  
                  if (trimmedCode && numBonus > 0) {
                    const isDuplicate = (settings.depositCoupons || []).some((c, idx) => 
                      idx !== editingDepositCouponIndex && c.code === trimmedCode
                    );
                    
                    if (isDuplicate) {
                      toast.error('Coupon code already exists');
                      return;
                    }

                    let newCoupons;
                    if (editingDepositCouponIndex !== null) {
                      newCoupons = (settings.depositCoupons || []).map((c, idx) => 
                        idx === editingDepositCouponIndex ? { ...c, code: trimmedCode, bonusPercentage: numBonus, expiryDate: expiryDate || undefined } : c
                      );
                    } else {
                      newCoupons = [...(settings.depositCoupons || []), { code: trimmedCode, bonusPercentage: numBonus, isActive: true, expiryDate: expiryDate || undefined }];
                    }

                    const newSettings = { ...settings, depositCoupons: newCoupons };
                    setSettings(newSettings);
                    
                    const result = await settingsService.updateSettings(newSettings);
                    if (!result.error) {
                      toast.success(editingDepositCouponIndex !== null ? 'Deposit coupon updated' : 'Deposit coupon added');
                      setDepositCouponForm({ code: '', bonus: '', expiryDate: '' });
                      setEditingDepositCouponIndex(null);
                    } else {
                      toast.error('Failed to save to database');
                    }
                  } else {
                    toast.error('Please enter a valid code and bonus');
                  }
                }}
                className={cn(
                  "w-full rounded-xl py-3 text-sm font-bold text-white transition-all",
                  editingDepositCouponIndex !== null ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-900 hover:bg-slate-800"
                )}
              >
                {editingDepositCouponIndex !== null ? 'Update' : 'Add'}
              </button>
              {editingDepositCouponIndex !== null && (
                <button 
                  type="button"
                  onClick={() => {
                    setDepositCouponForm({ code: '', bonus: '', expiryDate: '' });
                    setEditingDepositCouponIndex(null);
                  }}
                  className="rounded-xl bg-slate-100 p-3 text-slate-600 hover:bg-slate-200"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[800px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Bonus</th>
                  <th className="px-6 py-3">Expiry</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(settings.depositCoupons || []).map((coupon, i) => {
                  const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
                  return (
                    <tr key={i}>
                      <td className="px-6 py-4 font-bold text-slate-900">{coupon.code}</td>
                      <td className="px-6 py-4 text-slate-600">{coupon.bonusPercentage}%</td>
                      <td className="px-6 py-4 text-slate-600">
                        {coupon.expiryDate ? (
                          <span className={`inline-flex items-center gap-1 text-xs ${isExpired ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                            <Clock className="h-3 w-3" />
                            {new Date(coupon.expiryDate).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No Expiry</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          type="button"
                          onClick={async () => {
                            const newCoupons = (settings.depositCoupons || []).map((c, idx) => 
                              idx === i ? { ...c, isActive: !c.isActive } : c
                            );
                            const newSettings = { ...settings, depositCoupons: newCoupons };
                            setSettings(newSettings);
                            await settingsService.updateSettings(newSettings);
                            toast.success(`Coupon ${newCoupons[i].isActive ? 'activated' : 'deactivated'}`);
                          }}
                          className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}
                        >
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            type="button"
                            onClick={() => {
                              setDepositCouponForm({
                                code: coupon.code,
                                bonus: String(coupon.bonusPercentage),
                                expiryDate: coupon.expiryDate || ''
                              });
                              setEditingDepositCouponIndex(i);
                              document.getElementById('manage-deposit-coupons')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            type="button"
                            onClick={async () => {
                              const newCoupons = (settings.depositCoupons || []).filter((_, idx) => idx !== i);
                              const newSettings = { ...settings, depositCoupons: newCoupons };
                              setSettings(newSettings);
                              await settingsService.updateSettings(newSettings);
                              toast.success('Coupon deleted');
                            }}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!settings.depositCoupons || settings.depositCoupons.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No deposit coupons created yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manage Tool Coupons Section */}
        <div id="manage-tool-coupons" className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2">
              <Tag className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Manage Tool Coupons</h2>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Coupon Code</label>
                <input 
                  type="text"
                  value={toolCouponForm.code}
                  onChange={(e) => setToolCouponForm({ ...toolCouponForm, code: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                  placeholder="e.g. TOOL20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Discount (%)</label>
                <input 
                  type="number"
                  value={toolCouponForm.discount}
                  onChange={(e) => setToolCouponForm({ ...toolCouponForm, discount: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                  placeholder="e.g. 20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Tool</label>
                <select 
                  value={toolCouponForm.toolId}
                  onChange={(e) => setToolCouponForm({ ...toolCouponForm, toolId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                >
                  <option value="all">All Tools</option>
                  {tools.map(tool => (
                    <option key={tool.id} value={tool.id}>{tool.title}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Expiry Date</label>
                <input 
                  type="datetime-local"
                  value={toolCouponForm.expiryDate}
                  onChange={(e) => setToolCouponForm({ ...toolCouponForm, expiryDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="flex items-end gap-2">
                <button 
                  type="button"
                  onClick={async () => {
                    const { code, discount, toolId, expiryDate } = toolCouponForm;
                    const trimmedCode = code.trim();
                    const numDiscount = Number(discount);
                    const finalToolId = toolId === 'all' ? undefined : toolId;
                    
                    if (trimmedCode && numDiscount > 0) {
                      const isDuplicate = (settings.toolCoupons || []).some((c, idx) => 
                        idx !== editingToolCouponIndex && c.code === trimmedCode
                      );
                      
                      if (isDuplicate) {
                        toast.error('Coupon code already exists');
                        return;
                      }

                      let newCoupons;
                      if (editingToolCouponIndex !== null) {
                        newCoupons = (settings.toolCoupons || []).map((c, idx) => 
                          idx === editingToolCouponIndex ? { ...c, code: trimmedCode, discount: numDiscount, toolId: finalToolId, expiryDate: expiryDate || undefined } : c
                        );
                      } else {
                        newCoupons = [...(settings.toolCoupons || []), { code: trimmedCode, discount: numDiscount, isActive: true, toolId: finalToolId, expiryDate: expiryDate || undefined }];
                      }

                      const newSettings = { ...settings, toolCoupons: newCoupons };
                      setSettings(newSettings);
                      
                      const result = await settingsService.updateSettings(newSettings);
                      if (!result.error) {
                        toast.success(editingToolCouponIndex !== null ? 'Tool coupon updated' : 'Tool coupon added');
                        setToolCouponForm({ code: '', discount: '', toolId: 'all', expiryDate: '' });
                        setEditingToolCouponIndex(null);
                      } else {
                        toast.error('Failed to save to database');
                      }
                    } else {
                      toast.error('Please enter a valid code and discount');
                    }
                  }}
                  className={cn(
                    "w-full rounded-xl py-3 text-sm font-bold text-white transition-all",
                    editingToolCouponIndex !== null ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-900 hover:bg-slate-800"
                  )}
                >
                  {editingToolCouponIndex !== null ? 'Update' : 'Add'}
                </button>
                {editingToolCouponIndex !== null && (
                  <button 
                    type="button"
                    onClick={() => {
                      setToolCouponForm({ code: '', discount: '', toolId: 'all', expiryDate: '' });
                      setEditingToolCouponIndex(null);
                    }}
                    className="rounded-xl bg-slate-100 p-3 text-slate-600 hover:bg-slate-200"
                  >
                    <CloseIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[800px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Discount</th>
                    <th className="px-6 py-3">Tool</th>
                    <th className="px-6 py-3">Expiry</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(settings.toolCoupons || []).map((coupon, i) => {
                    const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
                    return (
                      <tr key={i}>
                        <td className="px-6 py-4 font-bold text-slate-900">{coupon.code}</td>
                        <td className="px-6 py-4 text-slate-600">{coupon.discount}%</td>
                        <td className="px-6 py-4 text-slate-600">
                          {coupon.toolId ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold">
                              {tools.find(t => t.id === coupon.toolId)?.title || 'Unknown Tool'}
                            </span>
                          ) : (
                            <span className="text-slate-400">All Tools</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {coupon.expiryDate ? (
                            <span className={`inline-flex items-center gap-1 text-xs ${isExpired ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                              <Clock className="h-3 w-3" />
                              {new Date(coupon.expiryDate).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No Expiry</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            type="button"
                            onClick={async () => {
                              const newCoupons = (settings.toolCoupons || []).map((c, idx) => 
                                idx === i ? { ...c, isActive: !c.isActive } : c
                              );
                              const newSettings = { ...settings, toolCoupons: newCoupons };
                              setSettings(newSettings);
                              await settingsService.updateSettings(newSettings);
                              toast.success(`Coupon ${newCoupons[i].isActive ? 'activated' : 'deactivated'}`);
                            }}
                            className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}
                          >
                            {coupon.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              type="button"
                              onClick={() => {
                                setToolCouponForm({
                                  code: coupon.code,
                                  discount: String(coupon.discount),
                                  toolId: coupon.toolId || 'all',
                                  expiryDate: coupon.expiryDate || ''
                                });
                                setEditingToolCouponIndex(i);
                                document.getElementById('manage-tool-coupons')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              type="button"
                              onClick={async () => {
                                const newCoupons = (settings.toolCoupons || []).filter((_, idx) => idx !== i);
                                const newSettings = { ...settings, toolCoupons: newCoupons };
                                setSettings(newSettings);
                                await settingsService.updateSettings(newSettings);
                                toast.success('Coupon deleted');
                              }}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {(!settings.toolCoupons || settings.toolCoupons.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No tool coupons created yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Manage VIP Coupons Section */}
        <div id="manage-vip-coupons" className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2">
              <Tag className="h-5 w-5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Manage VIP Coupons</h2>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Coupon Code</label>
                <input 
                  type="text"
                  value={vipCouponForm.code}
                  onChange={(e) => setVipCouponForm({ ...vipCouponForm, code: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                  placeholder="e.g. VIP50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Discount (%)</label>
                <input 
                  type="number"
                  value={vipCouponForm.discount}
                  onChange={(e) => setVipCouponForm({ ...vipCouponForm, discount: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                  placeholder="e.g. 50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Expiry Date</label>
                <input 
                  type="datetime-local"
                  value={vipCouponForm.expiryDate}
                  onChange={(e) => setVipCouponForm({ ...vipCouponForm, expiryDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="flex items-end gap-2">
                <button 
                  type="button"
                  onClick={async () => {
                    const { code, discount, expiryDate } = vipCouponForm;
                    const trimmedCode = code.trim();
                    const numDiscount = Number(discount);
                    
                    if (trimmedCode && numDiscount > 0) {
                      const isDuplicate = (settings.vipCoupons || []).some((c, idx) => 
                        idx !== editingVipCouponIndex && c.code === trimmedCode
                      );
                      
                      if (isDuplicate) {
                        toast.error('Coupon code already exists');
                        return;
                      }

                      let newCoupons;
                      if (editingVipCouponIndex !== null) {
                        newCoupons = (settings.vipCoupons || []).map((c, idx) => 
                          idx === editingVipCouponIndex ? { ...c, code: trimmedCode, discount: numDiscount, expiryDate: expiryDate || undefined } : c
                        );
                      } else {
                        newCoupons = [...(settings.vipCoupons || []), { code: trimmedCode, discount: numDiscount, isActive: true, expiryDate: expiryDate || undefined }];
                      }

                      const newSettings = { ...settings, vipCoupons: newCoupons };
                      setSettings(newSettings);
                      
                      const result = await settingsService.updateSettings(newSettings);
                      if (!result.error) {
                        toast.success(editingVipCouponIndex !== null ? 'VIP coupon updated' : 'VIP coupon added');
                        setVipCouponForm({ code: '', discount: '', expiryDate: '' });
                        setEditingVipCouponIndex(null);
                      } else {
                        toast.error('Failed to save to database');
                      }
                    } else {
                      toast.error('Please enter a valid code and discount');
                    }
                  }}
                  className={cn(
                    "w-full rounded-xl py-3 text-sm font-bold text-white transition-all",
                    editingVipCouponIndex !== null ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-900 hover:bg-slate-800"
                  )}
                >
                  {editingVipCouponIndex !== null ? 'Update' : 'Add'}
                </button>
                {editingVipCouponIndex !== null && (
                  <button 
                    type="button"
                    onClick={() => {
                      setVipCouponForm({ code: '', discount: '', expiryDate: '' });
                      setEditingVipCouponIndex(null);
                    }}
                    className="rounded-xl bg-slate-100 p-3 text-slate-600 hover:bg-slate-200"
                  >
                    <CloseIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[600px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Discount</th>
                    <th className="px-6 py-3">Expiry</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(settings.vipCoupons || []).map((coupon, i) => {
                    const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
                    return (
                      <tr key={i}>
                        <td className="px-6 py-4 font-bold text-slate-900">{coupon.code}</td>
                        <td className="px-6 py-4 text-slate-600">{coupon.discount}%</td>
                        <td className="px-6 py-4 text-slate-600">
                          {coupon.expiryDate ? (
                            <span className={`inline-flex items-center gap-1 text-xs ${isExpired ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                              <Clock className="h-3 w-3" />
                              {new Date(coupon.expiryDate).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No Expiry</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              type="button"
                              onClick={() => {
                                setVipCouponForm({
                                  code: coupon.code,
                                  discount: String(coupon.discount),
                                  expiryDate: coupon.expiryDate || ''
                                });
                                setEditingVipCouponIndex(i);
                                document.getElementById('manage-vip-coupons')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              type="button"
                              onClick={async () => {
                                const newCoupons = (settings.vipCoupons || []).filter((_, idx) => idx !== i);
                                const newSettings = { ...settings, vipCoupons: newCoupons };
                                setSettings(newSettings);
                                await settingsService.updateSettings(newSettings);
                                toast.success('Coupon deleted');
                              }}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {(!settings.vipCoupons || settings.vipCoupons.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No VIP coupons created yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Featured Tools Section */}
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2">
              <Wrench className="h-5 w-5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Featured Tools Settings</h2>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Select Featured Tools</label>
                <p className="text-xs text-slate-500 mb-4">Choose tools to highlight on the home page or specific sections.</p>
                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  {tools.map(tool => (
                    <label key={tool.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={settings.featuredToolIds?.includes(String(tool.id))}
                        onChange={async (e) => {
                          const currentIds = settings.featuredToolIds || [];
                          const newIds = e.target.checked 
                            ? [...currentIds, String(tool.id)]
                            : currentIds.filter(id => id !== String(tool.id));
                          
                          const newSettings = { ...settings, featuredToolIds: newIds };
                          setSettings(newSettings);
                          await settingsService.updateSettings(newSettings);
                          toast.success(e.target.checked ? 'Tool featured' : 'Tool removed from featured');
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex items-center gap-3">
                        <img src={tool.image} alt="" className="h-8 w-8 rounded object-cover" referrerPolicy="no-referrer" />
                        <span className="text-sm font-medium text-slate-700">{tool.title}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50 p-6">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Featured Tools Summary</h3>
                  <p className="text-xs text-slate-500 mb-4">You have {settings.featuredToolIds?.length || 0} tools featured.</p>
                  <div className="flex flex-wrap gap-2">
                    {settings.featuredToolIds?.map(id => {
                      const tool = tools.find(t => String(t.id) === id);
                      return tool ? (
                        <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-700">
                          {tool.title}
                          <button 
                            onClick={async () => {
                              const newIds = (settings.featuredToolIds || []).filter(fid => fid !== id);
                              const newSettings = { ...settings, featuredToolIds: newIds };
                              setSettings(newSettings);
                              await settingsService.updateSettings(newSettings);
                            }}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <CloseIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Toaster position="top-right" richColors />
      
      {/* Firebase Auth Warning Banner */}
      {!isAuthLoading && !currentUser && (
        <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between bg-amber-500 px-6 py-3 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-medium">
              You are logged in with a secret key, but not authenticated with Firebase. 
              <span className="ml-1 hidden md:inline">Saving changes will fail until you sign in with an admin Google account.</span>
            </p>
          </div>
          <button 
            onClick={handleFirebaseSignIn}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-1.5 text-xs font-bold text-amber-600 transition-all hover:bg-amber-50 active:scale-95"
          >
            <ShieldCheck className="h-4 w-4" />
            Sign in with Google
          </button>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white">
        <div className="p-6">
          <Link to="/" className="no-underline">
            <Logo size="sm" />
          </Link>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Admin Panel</p>
        </div>

        <nav className="mt-8 px-4 space-y-8">
          {/* Group 1: Overview & System */}
          <div className="space-y-1">
            <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">System Control</p>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>

          {/* Group 2: Resources & Users */}
          <div className="space-y-1">
            <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-blue-500">Inventory & Users</p>
            <button 
              onClick={() => setActiveTab('courses')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-all ${activeTab === 'courses' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-600'}`}
            >
              <List className="h-4 w-4" />
              Courses
            </button>
            <button 
              onClick={() => setActiveTab('tools')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-all ${activeTab === 'tools' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-600'}`}
            >
              <Wrench className="h-4 w-4" />
              Tools
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-600'}`}
            >
              <Users className="h-4 w-4" />
              Users
            </button>
            <button 
              onClick={() => setActiveTab('traffic')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-all ${activeTab === 'traffic' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-600'}`}
            >
              <Activity className="h-4 w-4" />
              Live Traffic
            </button>
          </div>

          {/* Group 3: Operations */}
          <div className="space-y-1">
            <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-purple-500">Order Management</p>
            <button 
              onClick={() => setActiveTab('course-orders')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-all ${activeTab === 'course-orders' ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'text-slate-600 hover:bg-purple-50/50 hover:text-purple-600'}`}
            >
              <BookOpen className="h-4 w-4" />
              Course Orders
              <Badge count={pendingCourseOrders} />
            </button>
            <button 
              onClick={() => setActiveTab('tool-orders')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-all ${activeTab === 'tool-orders' ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'text-slate-600 hover:bg-purple-50/50 hover:text-purple-600'}`}
            >
              <ShoppingCart className="h-4 w-4" />
              Tool Orders
              <Badge count={pendingToolOrders} />
            </button>
            <button 
              onClick={() => setActiveTab('vip')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-all ${activeTab === 'vip' ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'text-slate-600 hover:bg-purple-50/50 hover:text-purple-600'}`}
            >
              <StarIcon className="h-4 w-4" />
              VIP Management
              <Badge count={pendingVIPRequests} />
            </button>
          </div>

          {/* Group 4: Finance */}
          <div className="space-y-1">
            <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">Financial Records</p>
            <button 
              onClick={() => setActiveTab('payments')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-all ${activeTab === 'payments' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-600 hover:bg-emerald-50/50 hover:text-emerald-600'}`}
            >
              <ShieldCheck className="h-4 w-4" />
              Payment Proofs
              <Badge count={pendingDeposits} />
            </button>
            <button 
              onClick={() => setActiveTab('withdrawals')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-all ${activeTab === 'withdrawals' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-600 hover:bg-emerald-50/50 hover:text-emerald-600'}`}
            >
              <DollarSign className="h-4 w-4" />
              Withdrawals
              <Badge count={pendingWithdrawals} />
            </button>
            <button 
              onClick={() => setActiveTab('wallet')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-all ${activeTab === 'wallet' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-600 hover:bg-emerald-50/50 hover:text-emerald-600'}`}
            >
              <Wallet className="h-4 w-4" />
              Wallet
              <Badge count={pendingDeposits + pendingWithdrawals} />
            </button>
          </div>
        </nav>

        <div className="absolute bottom-0 w-64 border-t border-slate-200 p-4">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-8 py-4">
            <h1 className="text-xl font-bold text-slate-900">
              {activeTab === 'dashboard' ? 'Admin Overview' : activeTab === 'courses' ? 'Manage Courses' : activeTab === 'tools' ? 'Manage Tools' : activeTab === 'course-orders' ? 'Course Orders' : activeTab === 'tool-orders' ? 'Tool Orders' : activeTab === 'users' ? 'User Management' : activeTab === 'wallet' ? 'Wallet Management' : activeTab === 'payments' ? 'Payment Proofs' : activeTab === 'withdrawals' ? 'Withdrawal Requests' : activeTab === 'traffic' ? 'Live Traffic' : 'Panel Settings'}
            </h1>
            <div className="flex items-center gap-4">
              {activeTab === 'users' && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search users..." 
                    className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                  />
                </div>
              )}
              {activeTab === 'courses' && selectedCourses.length > 0 && (
                <button 
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-100 active:scale-95"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedCourses.length})
                </button>
              )}
              {activeTab === 'courses' && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search courses..." 
                      className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    Add New Course
                  </button>
                </>
              )}
              {activeTab === 'tools' && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search tools..." 
                      className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => setIsAddToolModalOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    Add New Tool
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'settings' && renderSettings()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'wallet' && renderWallet()}
          {activeTab === 'payments' && renderPaymentProofs()}
          {activeTab === 'withdrawals' && renderWithdrawals()}
          {activeTab === 'vip' && renderVIPManagement()}
          {activeTab === 'traffic' && renderLiveTraffic()}
          
          {activeTab === 'tools' && renderTools()}
          {activeTab === 'tool-orders' && renderToolOrders()}
          {activeTab === 'course-orders' && renderCourseOrders()}

          {activeTab === 'courses' && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-4">
                <h2 className="font-bold text-slate-900">Course List</h2>
                <button 
                  onClick={() => toast.info('Filtering coming soon')}
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
                >
                  <Filter className="h-4 w-4" />
                  Filter
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-6 py-4 w-10">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedCourses.length === filteredCourses.length && filteredCourses.length > 0}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-6 py-4">Course</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4">Rating</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCourses.map((course) => (
                      <tr key={course.id} className={`group transition-colors hover:bg-slate-50/50 ${selectedCourses.includes(course.id) ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedCourses.includes(course.id)}
                            onChange={() => toggleSelectCourse(course.id)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={course.image} 
                              alt={course.title} 
                              className="h-10 w-10 rounded-lg object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://picsum.photos/seed/${course.id}/100/100`;
                              }}
                            />
                            <div>
                              <p className="font-bold text-slate-900">{course.title}</p>
                              <p className="text-xs text-slate-500">ID: #{course.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                              {course.category}
                            </span>
                            {course.additionalChoices && (
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm",
                                course.additionalChoices === 'Popular' ? "bg-orange-500 text-white" :
                                course.additionalChoices === 'New' ? "bg-green-500 text-white" :
                                "bg-amber-500 text-white"
                              )}>
                                {course.additionalChoices}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">{course.price}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-900">{course.rating}</span>
                            <span className="text-slate-400">({course.reviews})</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-green-600">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-600"></div>
                            <span className="text-xs font-bold uppercase tracking-wider">Published</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <Link to={`/course/${course.id}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="View">
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button 
                              onClick={() => {
                                setEditingCourse(course);
                                setPreviewImage(course.image);
                                setGalleryPreviews([]);
                                setFileImagesPreviews([]);
                              }}
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600" 
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => setCourseToDelete(course)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600" 
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Tool Delete Confirmation Modal */}
      {toolToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Delete Tool?</h3>
              <p className="mt-2 text-slate-500">Are you sure you want to delete "{toolToDelete.title}"? This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setToolToDelete(null)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleToolDelete}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Tool'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Tool Modal */}
      {(isAddToolModalOpen || editingTool) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between sticky top-0 bg-white z-10 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {editingTool ? 'Edit Tool' : 'Add New Tool'}
              </h2>
              <button 
                onClick={() => {
                  setIsAddToolModalOpen(false);
                  setEditingTool(null);
                  setPreviewImage(null);
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={editingTool ? handleEditTool : handleAddTool} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Tool Title</label>
                    <input 
                      name="title" 
                      required 
                      defaultValue={editingTool?.title}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                      placeholder="e.g. Premium SEO Script"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700">Sale Price</label>
                      <input 
                        name="price" 
                        type="number" 
                        step="0.01"
                        required 
                        defaultValue={editingTool?.price}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                        placeholder="19.99"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700">Original Price</label>
                      <input 
                        name="originalPrice" 
                        type="number" 
                        step="0.01"
                        defaultValue={editingTool?.originalPrice}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                        placeholder="89.99"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Thumbnail Image URL</label>
                    <input 
                      name="image" 
                      defaultValue={editingTool?.image}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Gallery Photos (One URL per line)</label>
                    <textarea 
                      name="gallery" 
                      rows={4}
                      defaultValue={editingTool?.gallery?.join('\n')}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none font-mono"
                      placeholder="https://image1.jpg&#10;https://image2.jpg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Fake Review Comment</label>
                    <textarea 
                      name="fakeReview_comment" 
                      rows={3}
                      defaultValue={editingTool?.fakeReview?.comment}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                      placeholder="e.g. This tool is amazing! Highly recommend."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Fake Review User Name</label>
                    <input 
                      name="fakeReview_user" 
                      defaultValue={editingTool?.fakeReview?.userName || 'Emily R.'}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Description</label>
                    <textarea 
                      name="description" 
                      rows={4}
                      required
                      defaultValue={editingTool?.description}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                      placeholder="Describe what this tool is for..."
                    />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Bundle & Save</h3>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          name="bundle1_name" 
                          placeholder="Bundle 1 Name"
                          defaultValue={editingTool?.bundles?.[0]?.name || 'BUY 1 GET 40% OFF'}
                          className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none"
                        />
                        <input 
                          name="bundle1_price" 
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          defaultValue={editingTool?.bundles?.[0]?.price}
                          className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          name="bundle2_name" 
                          placeholder="Bundle 2 Name"
                          defaultValue={editingTool?.bundles?.[1]?.name || 'BUY 2 GET 50% OFF'}
                          className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none"
                        />
                        <input 
                          name="bundle2_price" 
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          defaultValue={editingTool?.bundles?.[1]?.price}
                          className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          name="bundle3_name" 
                          placeholder="Bundle 3 Name"
                          defaultValue={editingTool?.bundles?.[2]?.name || 'BUY 3 GET 60% OFF'}
                          className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none"
                        />
                        <input 
                          name="bundle3_price" 
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          defaultValue={editingTool?.bundles?.[2]?.price}
                          className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Most Popular Bundle</label>
                      <select 
                        name="popular_bundle"
                        defaultValue={editingTool?.bundles?.findIndex(b => b.isPopular) + 1 || 2}
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-none"
                      >
                        <option value="1">Bundle 1</option>
                        <option value="2">Bundle 2</option>
                        <option value="3">Bundle 3</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => {
                    setIsAddToolModalOpen(false);
                    setEditingTool(null);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-blue-600/40 active:scale-95"
                >
                  {editingTool ? 'Update Tool' : 'Add Tool'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {(isAddModalOpen || editingCourse) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between sticky top-0 bg-white z-10 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </h2>
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCourse(null);
                  setPreviewImage(null);
                  setGalleryPreviews([]);
                  setFileImagesPreviews([]);
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={editingCourse ? handleEditCourse : handleAddCourse} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Course Title</label>
                    <input 
                      name="title" 
                      required 
                      defaultValue={editingCourse?.title}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                      placeholder="e.g. Master React in 30 Days"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700">Category</label>
                      <select 
                        name="category" 
                        defaultValue={editingCourse?.category}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                      >
                        {settings.categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700">Rating (1-5)</label>
                      <div className="relative">
                        <StarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input 
                          name="rating" 
                          type="number" 
                          min="1" 
                          max="5" 
                          defaultValue={editingCourse?.rating || 5}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700">Price</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input 
                          name="price" 
                          type="number" 
                          required 
                          defaultValue={editingCourse?.price.replace('$', '')}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                          placeholder="19.99"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-slate-700">Original Price</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input 
                          name="originalPrice" 
                          type="number" 
                          defaultValue={editingCourse?.originalPrice.replace('$', '')}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                          placeholder="89.99"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Thumbnail</label>
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20 overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                        {previewImage ? (
                          <img 
                            src={previewImage} 
                            alt="Preview" 
                            className="h-full w-full object-cover" 
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://picsum.photos/seed/preview/800/600';
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageChange}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs text-slate-500">Upload a thumbnail or provide a URL below</p>
                        <div className="relative">
                          <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input 
                            name="image" 
                            defaultValue={editingCourse?.image}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                            placeholder="https://images.unsplash.com/..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Source Link (Optional)</label>
                    <div className="relative">
                      <Plus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input 
                        name="sourceUrl" 
                        defaultValue={editingCourse?.sourceUrl}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                        placeholder="e.g. https://mega.nz/..."
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Display Tag</label>
                    <select 
                      name="additionalChoices" 
                      defaultValue={editingCourse?.additionalChoices || 'None'}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                    >
                      <option value="None">None</option>
                      <option value="Popular">Popular</option>
                      <option value="New">New</option>
                      <option value="Premium">Premium</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Course Link (Unlocked after purchase)</label>
                    <div className="relative">
                      <Plus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input 
                        name="courseLink" 
                        defaultValue={editingCourse?.courseLink}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                        placeholder="e.g. https://example.com/course-access"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">About This Course</label>
                    <textarea 
                      name="about" 
                      rows={4}
                      defaultValue={editingCourse?.about}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                      placeholder="Describe what this course is about..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Course Objectives (One per line)</label>
                    <textarea 
                      name="objectives" 
                      rows={3}
                      defaultValue={editingCourse?.objectives?.join('\n')}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none font-mono"
                      placeholder="Master React fundamentals&#10;Build real-world projects&#10;..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Gallery Images</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {galleryPreviews.map((p, i) => (
                        <div key={i} className="relative h-12 w-12 rounded-lg overflow-hidden border border-slate-200">
                          <img 
                            src={p} 
                            alt="Preview" 
                            className="h-full w-full object-cover" 
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://picsum.photos/seed/gallery-${i}/400/300`;
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => setGalleryPreviews(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg"
                          >
                            <CloseIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="file" 
                          multiple
                          accept="image/*" 
                          onChange={handleGalleryImagesChange}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                        <button type="button" className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs font-medium text-slate-600 hover:bg-slate-100">
                          <Plus className="h-3 w-3" /> Upload Images
                        </button>
                      </div>
                    </div>
                    <textarea 
                      name="gallery" 
                      rows={2}
                      defaultValue={editingCourse?.gallery?.join('\n')}
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none font-mono"
                      placeholder="Or paste URLs (one per line)"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700">Course File Images</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {fileImagesPreviews.map((p, i) => (
                        <div key={i} className="relative h-12 w-12 rounded-lg overflow-hidden border border-slate-200">
                          <img 
                            src={p} 
                            alt="Preview" 
                            className="h-full w-full object-cover" 
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://picsum.photos/seed/file-${i}/400/300`;
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => setFileImagesPreviews(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg"
                          >
                            <CloseIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="file" 
                          multiple
                          accept="image/*" 
                          onChange={handleFileImagesChange}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        />
                        <button type="button" className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs font-medium text-slate-600 hover:bg-slate-100">
                          <Plus className="h-3 w-3" /> Upload Images
                        </button>
                      </div>
                    </div>
                    <textarea 
                      name="fileImages" 
                      rows={2}
                      defaultValue={editingCourse?.fileImages?.join('\n')}
                      className="w-full mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none font-mono"
                      placeholder="Or paste URLs (one per line)"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 sticky bottom-0 bg-white pb-2">
                <button 
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
                >
                  <Save className="h-4 w-4" />
                  {editingCourse ? 'Update Course' : 'Save Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Delete Course?</h3>
            <p className="mb-6 text-sm text-slate-500">
              Are you sure you want to delete <span className="font-semibold text-slate-700">"{courseToDelete.title}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setCourseToDelete(null)}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">Delete Multiple Courses?</h3>
            <p className="mb-6 text-sm text-slate-500">
              Are you sure you want to delete <span className="font-bold text-red-600">{selectedCourses.length}</span> selected courses? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


