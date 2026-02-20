
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DeviceWrapper from './components/DeviceWrapper';
import LandingSplit from './components/LandingSplit';
import B2BDashboard from './components/B2B/B2BDashboard';
import B2CMarketplace from './components/B2C/B2CMarketplace';
import CartView from './components/CartView';
import TrackingView from './components/TrackingView';
import ProfileView from './components/ProfileView';
import OrdersView from './components/OrdersView';
import OrderDetailView from './components/OrderDetailView';
import PaymentView from './components/PaymentView';
import UserOnboardingView from './components/UserOnboardingView';
import SettingsView from './components/SettingsView';
import { UserType, OrderItem, AppPreferences } from './types';
import { Leaf, ChevronRight, ShoppingCart, User, Home, Package } from 'lucide-react';
import { onAuthChange, checkUserExists, saveUserData, getUserData } from './services/firebaseService';

type ViewState = 'splash' | 'onboarding' | 'auth' | 'split' | 'main' | 'cart' | 'tracking' | 'profile' | 'settings' | 'orders' | 'order-detail' | 'payment' | 'user-onboarding';

const App: React.FC = () => {
  const defaultPreferences: AppPreferences = { language: 'fr', reducedMotion: false, dataSaver: false };
  const [view, setView] = useState<ViewState>('splash');
  const [userMode, setUserMode] = useState<UserType | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [appPreferences, setAppPreferences] = useState<AppPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('juingobio-settings');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const saved = parsed?.appPreferences;
      if (saved) {
        setAppPreferences({
          language: saved.language || 'fr',
          reducedMotion: !!saved.reducedMotion,
          dataSaver: !!saved.dataSaver
        });
      }
    } catch (error) {
      console.error('Error loading app preferences:', error);
    }
  }, []);

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      console.log('Auth state changed:', user?.email);
      setAuthUser(user);
      if (user) {
        const cachedUserMode = localStorage.getItem('juingobio-user-mode') as UserType | null;
        if (cachedUserMode) {
          setUserMode(cachedUserMode);
        }

        // Optimistic UI: show main view immediately while backend sync runs.
        setView('main');
        void (async () => {
          const userExists = await checkUserExists(user.uid);
          console.log('User exists in Firestore:', userExists);
          if (!userExists) {
            console.log('Redirecting to user-onboarding');
            setView('user-onboarding');
            return;
          }

          const userData = await getUserData(user.uid);
          if (userData?.userType) {
            setUserMode(userData.userType);
            localStorage.setItem('juingobio-user-mode', userData.userType);
          }
          if (userData?.preferences?.app) {
            const prefs: AppPreferences = {
              language: userData.preferences.app.language || 'fr',
              reducedMotion: !!userData.preferences.app.reducedMotion,
              dataSaver: !!userData.preferences.app.dataSaver
            };
            setAppPreferences(prefs);
            try {
              const raw = localStorage.getItem('juingobio-settings');
              const existing = raw ? JSON.parse(raw) : {};
              localStorage.setItem('juingobio-settings', JSON.stringify({ ...existing, appPreferences: prefs }));
            } catch (error) {
              console.error('Error storing app preferences locally:', error);
            }
          }
          console.log('User sync completed');
        })();
      } else {
        // No user logged in, go to splash
        console.log('No user, redirecting to splash');
        setView('splash');
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  // Auto-transition from splash
  useEffect(() => {
    if (view === 'splash') {
      const timer = setTimeout(() => setView('onboarding'), 2500);
      return () => clearTimeout(timer);
    }
  }, [view]);

  // Check for product URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');
    if (productId && view === 'main' && userMode === 'B2C') {
      // Product detail will be handled by B2CMarketplace component
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [view, userMode]);

  useEffect(() => {
    document.documentElement.lang = appPreferences.language;
    document.body.classList.toggle('reduced-motion', appPreferences.reducedMotion);
    document.title = appPreferences.language === 'en'
      ? 'JuingoBIO - Premium Short Supply Chain'
      : 'JuingoBIO - Circuit Court Premium';
  }, [appPreferences]);

  const handleAddToCart = useCallback((item: OrderItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === item.product_id);
      if (existing) {
        return prev.map(i => i.product_id === item.product_id ? { ...i, qty: i.qty + item.qty } : i);
      }
      return [...prev, item];
    });
    setNotification(`${item.name} ajouté !`);
    setTimeout(() => setNotification(null), 2000);
  }, []);

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, curr) => acc + (curr.qty * curr.price_at_purchase), 0);
  }, [cart]);

  const showBottomNav = useMemo(() => {
    return ['main', 'cart', 'payment', 'orders', 'order-detail', 'tracking', 'profile', 'settings'].includes(view);
  }, [view]);

  const tabKey = useMemo(() => {
    if (view === 'cart' || view === 'payment') return 'cart';
    if (view === 'orders' || view === 'order-detail' || view === 'tracking') return 'orders';
    if (view === 'profile' || view === 'settings') return 'account';
    return 'market';
  }, [view]);

  const renderContent = () => {
    switch (view) {
      case 'splash':
        return (
          <div className="h-full bg-deepGreen flex flex-col items-center justify-center text-white p-8">
            <div className="animate-bounce mb-6">
              <Leaf size={80} color="#CDDC39" fill="#CDDC39" />
            </div>
            <h1 className="font-serif text-5xl font-bold tracking-tighter">juingo<span className="text-limeGreen">BIO</span></h1>
            <p className="mt-4 opacity-60 text-[10px] tracking-[0.4em] font-light uppercase">L'excellence du terroir</p>
          </div>
        );
      case 'onboarding':
        return (
          <div className="h-full bg-deepGreen flex flex-col">
            <div className="h-[60%] relative overflow-hidden rounded-b-[40px]">
              <video 
                src="/onbordingvideo.mp4" 
                className="w-full h-full object-cover animate-subtle-zoom" 
                autoPlay={!appPreferences.dataSaver}
                muted
                loop={!appPreferences.dataSaver}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-deepGreen/80 to-transparent"></div>
              <div className="absolute bottom-10 left-8 right-8 animate-in slide-in-from-bottom-8 duration-1000">
                <h2 className="font-serif text-4xl text-white leading-tight">{appPreferences.language === 'en' ? 'From farm to your kitchen' : 'Du champs à votre cuisine'}</h2>
              </div>
            </div>
            <div className="flex-1 p-8 flex flex-col justify-between">
              <p className="text-white leading-relaxed text-sm animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
                {appPreferences.language === 'en'
                  ? 'Direct connection between exceptional producers and your business or home. Speed, transparency and quality.'
                  : "Une connexion directe entre les producteurs d'exception et vos établissements ou votre foyer. Vitesse, transparence et qualité absolue."}
              </p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                  <div className="w-12 h-12 bg-limeGreen/20 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-300 hover:bg-limeGreen/40">
                    <Leaf size={24} className="text-limeGreen animate-pulse" />
                  </div>
                  <p className="text-xs text-center text-white font-semibold">100% Bio</p>
                </div>
                <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-400">
                  <div className="w-12 h-12 bg-earthOrange/20 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-300 hover:bg-earthOrange/40">
                    <ShoppingCart size={24} className="text-earthOrange animate-bounce" style={{animationDelay: '0.1s'}} />
                  </div>
                  <p className="text-xs text-center text-white font-semibold">{appPreferences.language === 'en' ? 'Fast delivery' : 'Livraison Rapide'}</p>
                </div>
                <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                  <div className="w-12 h-12 bg-bioGreen/20 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-300 hover:bg-bioGreen/40">
                    <ChevronRight size={24} className="text-bioGreen animate-pulse" style={{animationDelay: '0.2s'}} />
                  </div>
                  <p className="text-xs text-center text-white font-semibold">{appPreferences.language === 'en' ? 'Traceability' : 'Traçabilité'}</p>
                </div>
              </div>
              <button 
                onClick={() => setView('auth')}
                className="w-full bg-earthOrange text-white py-5 rounded-30 font-bold text-lg shadow-xl shadow-earthOrange/20 active:scale-95 transition-transform hover:shadow-2xl hover:shadow-earthOrange/40 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-600"
              >
                {appPreferences.language === 'en' ? 'Start' : 'Commencer'}
              </button>
            </div>
          </div>
        );
      case 'auth':
        return (
          <div className="h-full p-8 flex flex-col justify-center bg-[#F9FBF9]">
            <div className="mb-12">
              <h1 className="font-serif text-4xl text-deepGreen font-bold mb-4">Rejoindre la communauté</h1>
              <p className="text-slate-500 text-sm">Une expérience de circuit court sans précédent.</p>
            </div>
            <div className="space-y-4">
              <button 
                onClick={async () => {
                  try {
                    const { signInWithGoogle } = await import('./services/firebaseService');
                    const user = await signInWithGoogle();
                    setAuthUser(user);
                    setView('main');
                  } catch (error) {
                    console.error('Error:', error);
                    setNotification('Erreur de connexion');
                    setTimeout(() => setNotification(null), 2000);
                  }
                }}
                className="w-full py-5 rounded-20 border border-slate-200 flex items-center justify-center gap-4 bg-white shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                <span className="font-bold text-slate-700">Connexion Google</span>
              </button>
              <button 
                onClick={() => setView('split')}
                className="w-full py-5 rounded-20 bg-deepGreen text-white font-bold active:scale-95 transition-transform"
              >
                Continuer en tant qu'invité
              </button>
            </div>
          </div>
        );
      case 'split':
        return <LandingSplit onSelect={(mode) => { setUserMode(mode); localStorage.setItem('juingobio-user-mode', mode); setView('main'); }} />;
      case 'main':
        return (
          <div className="h-full bg-gradient-to-b from-[#eff8f0] via-[#f9fbf9] to-[#fff8ef] flex flex-col overflow-hidden">
             <div className="p-6">
                <div className="rounded-30 p-5 bg-gradient-to-r from-deepGreen via-[#235a4e] to-bioGreen text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setView('split')} className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                      <ChevronRight className="rotate-180" size={20} />
                    </button>
                    <button onClick={() => setView('profile')} className="w-10 h-10 rounded-full bg-white/15 overflow-hidden border border-white/30">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userMode}`} alt="Avatar" />
                    </button>
                  </div>
                  <h1 className="font-serif text-2xl">JuingoBIO</h1>
                  <p className="text-xs uppercase tracking-[0.2em] text-limeGreen font-bold mt-1">
                    {userMode === 'B2B' ? (appPreferences.language === 'en' ? 'Business Home' : "Accueil Établissements") : (appPreferences.language === 'en' ? 'Household Home' : 'Accueil Ménages')}
                  </p>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto scrollbar-hide px-2 pb-3">
                {userMode === 'B2B' ? (
                  <B2BDashboard onAdd={handleAddToCart} language={appPreferences.language} />
                ) : (
                  <B2CMarketplace
                    onAdd={handleAddToCart}
                    productIdToOpen={new URLSearchParams(window.location.search).get('product') || undefined}
                    language={appPreferences.language}
                    dataSaverMode={appPreferences.dataSaver}
                  />
                )}
             </div>
          </div>
        );
      case 'cart':
        return <CartView cart={cart} total={cartTotal} onRemove={handleRemoveFromCart} onNav={setView} />;
      case 'payment':
        return (
          <PaymentView 
            cart={cart} 
            total={cartTotal} 
            onPaymentSuccess={(orderId) => {
              // Create order with processing status
              const newOrder = {
                id: orderId,
                user_id: 'user1',
                user_type: userMode,
                items: cart,
                status: 'processing',
                total_ht: cartTotal * 0.9,
                total_ttc: cartTotal,
                created_at: Date.now(),
                delivery_address: 'Rue de la Paix, Kinshasa',
                delivery_lat: -4.3276,
                delivery_lng: 15.3136,
                driver_lat: -4.3250,
                driver_lng: 15.3100,
                driver_name: 'Jean Moto',
                estimated_delivery: Date.now() + 3600000
              };
              setCurrentOrder(newOrder);
              setCart([]);
              setNotification('Commande confirmée !');
              setTimeout(() => setNotification(null), 2000);
              setView('order-detail');
              setSelectedOrder(newOrder);
            }}
            onNav={setView}
          />
        );
      case 'tracking':
        return <TrackingView onNav={setView} />;
      case 'orders':
        return <OrdersView onNav={setView} onSelectOrder={(order) => { setSelectedOrder(order); setView('order-detail'); }} />;
      case 'order-detail':
        return selectedOrder ? <OrderDetailView order={selectedOrder} onNav={setView} /> : <div>Error</div>;
      case 'user-onboarding':
        return (
          <UserOnboardingView
            authUser={authUser}
            onComplete={(userData) => {
              setUserMode(userData.userType);
              localStorage.setItem('juingobio-user-mode', userData.userType);
              setView('main');
              void saveUserData(userData).catch(() => {
                setNotification('Profil synchronisé en retard (réseau lent)');
                setTimeout(() => setNotification(null), 2500);
              });
            }}
          />
        );
      case 'profile':
        return <ProfileView onNav={setView} userMode={userMode} authUser={authUser} />;
      case 'settings':
        return (
          <SettingsView
            onNav={setView}
            authUser={authUser}
            userMode={userMode}
            onUserModeChange={(mode) => {
              setUserMode(mode);
              localStorage.setItem('juingobio-user-mode', mode);
            }}
            onAppPreferencesChange={(preferences) => {
              setAppPreferences(preferences);
              try {
                const raw = localStorage.getItem('juingobio-settings');
                const existing = raw ? JSON.parse(raw) : {};
                localStorage.setItem('juingobio-settings', JSON.stringify({ ...existing, appPreferences: preferences }));
              } catch (error) {
                console.error('Error storing app preferences:', error);
              }
            }}
            onNotify={(message) => {
              setNotification(message);
              setTimeout(() => setNotification(null), 2200);
            }}
          />
        );
      default:
        return <div>View error</div>;
    }
  };

  return (
    <DeviceWrapper>
      <div className="h-full flex flex-col">
        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] bg-deepGreen text-white px-6 py-3 rounded-full shadow-2xl font-bold text-xs flex items-center space-x-2 animate-in slide-in-from-top-full duration-300 border border-white/20">
            <div className="w-1.5 h-1.5 bg-limeGreen rounded-full animate-pulse"></div>
            <span>{notification}</span>
          </div>
        )}
        <div className="flex-1 min-h-0">{renderContent()}</div>

        {showBottomNav && (
          <div className="px-3 pb-3 pt-1 bg-gradient-to-t from-[#f3f4f6] to-transparent">
            <nav className="h-[72px] rounded-[26px] bg-white/85 border border-white shadow-[0_10px_30px_rgba(26,60,52,0.15)] backdrop-blur-xl px-2 flex items-center justify-between">
              <button onClick={() => setView('main')} className={`flex-1 h-14 rounded-20 flex items-center justify-center gap-2 transition-all ${tabKey === 'market' ? 'bg-deepGreen text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Home size={18} />
                <span className="text-[11px] font-bold">{appPreferences.language === 'en' ? 'Market' : 'Marché'}</span>
              </button>
              <button onClick={() => setView('cart')} className={`flex-1 h-14 rounded-20 flex items-center justify-center gap-2 transition-all relative ${tabKey === 'cart' ? 'bg-earthOrange text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                <ShoppingCart size={18} />
                <span className="text-[11px] font-bold">{appPreferences.language === 'en' ? 'Cart' : 'Panier'}</span>
                {cart.length > 0 && (
                  <span className={`absolute -top-1 right-4 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white font-bold ${tabKey === 'cart' ? 'bg-deepGreen' : 'bg-earthOrange'}`}>
                    {cart.length}
                  </span>
                )}
              </button>
              <button onClick={() => setView('orders')} className={`flex-1 h-14 rounded-20 flex items-center justify-center gap-2 transition-all ${tabKey === 'orders' ? 'bg-bioGreen text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Package size={18} />
                <span className="text-[11px] font-bold">{appPreferences.language === 'en' ? 'Orders' : 'Commandes'}</span>
              </button>
              <button onClick={() => setView('profile')} className={`flex-1 h-14 rounded-20 flex items-center justify-center gap-2 transition-all ${tabKey === 'account' ? 'bg-[#235a4e] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                <User size={18} />
                <span className="text-[11px] font-bold">{appPreferences.language === 'en' ? 'Account' : 'Compte'}</span>
              </button>
            </nav>
          </div>
        )}
      </div>
    </DeviceWrapper>
  );
};

export default App;
