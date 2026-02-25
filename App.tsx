import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import AdminDashboard from './components/AdminDashboard';
import { Category, FinanceTransaction, ManagedUser, Order, OrderItem, AppPreferences, Product, TransactionStatus, UserType } from './types';
import { Leaf, ChevronRight, ShoppingCart, User, Home, Package, Shield, Settings as SettingsIcon } from 'lucide-react';
import {
  checkUserExists,
  createCategory,
  createOrder,
  createOrderStatusNotification,
  createFinanceNotification,
  createTransaction,
  createProduct,
  getUserData,
  onAuthChange,
  onCategoriesChange,
  onOrdersChange,
  onProductsChange,
  onTransactionsChange,
  onUserDataChange,
  onUsersChange,
  saveUserData,
  uploadProductMedia,
  updateCategory,
  updateOrder,
  updateProduct,
  updateTransaction
} from './services/firebaseService';
import { requestNativeNotificationPermission, sendNativeNotification } from './services/notificationService';
import { registerBackgroundPush } from './services/backgroundPushService';
import { registerNativePush } from './services/nativePushService';

type ViewState = 'splash' | 'onboarding' | 'auth' | 'split' | 'main' | 'cart' | 'tracking' | 'profile' | 'settings' | 'orders' | 'order-detail' | 'payment' | 'user-onboarding' | 'admin';

type SeoConfig = {
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  keywordsFr: string;
  keywordsEn: string;
  pathHint?: string;
};

const normalizeUserType = (raw: any): UserType | null => {
  if (!raw || typeof raw !== 'string') return null;
  const value = raw.trim().toUpperCase();
  if (value === 'B2B' || value === 'B2C' || value === 'ADMIN') return value as UserType;
  return null;
};

const toRad = (value: number) => (value * Math.PI) / 180;
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const upsertMeta = (
  selector: { name?: string; property?: string },
  content: string
) => {
  const { name, property } = selector;
  const query = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
  let element = document.head.querySelector(query) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    if (name) element.setAttribute('name', name);
    if (property) element.setAttribute('property', property);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const upsertLink = (rel: string, href: string) => {
  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
};

const upsertJsonLd = (id: string, payload: Record<string, any>) => {
  let element = document.head.querySelector(`script[data-seo-id="${id}"]`) as HTMLScriptElement | null;
  if (!element) {
    element = document.createElement('script');
    element.type = 'application/ld+json';
    element.setAttribute('data-seo-id', id);
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(payload);
};

const App: React.FC = () => {
  const defaultPreferences: AppPreferences = { language: 'fr', reducedMotion: false, dataSaver: false };
  const [view, setView] = useState<ViewState>('splash');
  const [userMode, setUserMode] = useState<UserType | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [appPreferences, setAppPreferences] = useState<AppPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const lastKnownOrderStatuses = useRef<Record<string, Order['status']>>({});

  const canAccessAdmin = userMode === 'ADMIN';

  useEffect(() => {
    try {
      const rawSettings = localStorage.getItem('juingobio-settings');

      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        const saved = parsed?.appPreferences;
        if (saved) {
          setAppPreferences({
            language: saved.language || 'fr',
            reducedMotion: !!saved.reducedMotion,
            dataSaver: !!saved.dataSaver
          });
        }
      }
    } catch (error) {
      console.error('Error loading local state:', error);
    }
  }, []);

  useEffect(() => {
    const unsubscribeProducts = onProductsChange((items) => setProducts(items));
    const unsubscribeCategories = onCategoriesChange((items) => setCategories(items));
    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setAuthUser(user);
      if (user) {
        const cachedUserMode = normalizeUserType(localStorage.getItem('juingobio-user-mode'));
        if (cachedUserMode) {
          setUserMode(cachedUserMode);
          localStorage.setItem('juingobio-user-mode', cachedUserMode);
        }
        setView('splash');
      } else {
        setView('splash');
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (view !== 'splash') return;

    let cancelled = false;
    if (authUser?.uid) {
      void (async () => {
        const userExists = await checkUserExists(authUser.uid);
        if (cancelled) return;
        if (!userExists) {
          setView('user-onboarding');
          return;
        }

        const userData = await getUserData(authUser.uid);
        if (cancelled) return;

        const normalizedRemoteType = normalizeUserType(userData?.userType);
        if (normalizedRemoteType) {
          setUserMode(normalizedRemoteType);
          localStorage.setItem('juingobio-user-mode', normalizedRemoteType);
          setView(normalizedRemoteType === 'ADMIN' ? 'admin' : 'main');
        } else {
          setView('main');
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

      })();

      return () => {
        cancelled = true;
      };
    }

    const timer = setTimeout(() => setView('onboarding'), 2500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [view, authUser]);

  useEffect(() => {
    if (!authUser?.uid) return;

    const unsubscribe = onUserDataChange(authUser.uid, (userData) => {
      const normalizedRemoteType = normalizeUserType(userData?.userType);
      if (!normalizedRemoteType) return;

      setUserMode(normalizedRemoteType);
      localStorage.setItem('juingobio-user-mode', normalizedRemoteType);
      setView(normalizedRemoteType === 'ADMIN' ? 'admin' : 'main');
    });

    return unsubscribe;
  }, [authUser]);

  useEffect(() => {
    if (!authUser?.uid) {
      setOrders([]);
      return;
    }
    const unsubscribe = onOrdersChange(
      (items) => setOrders(items),
      authUser.uid,
      userMode === 'ADMIN'
    );
    return unsubscribe;
  }, [authUser, userMode]);

  useEffect(() => {
    if (userMode !== 'ADMIN') {
      setManagedUsers([]);
      return;
    }
    const unsubscribe = onUsersChange((users) => setManagedUsers(users as ManagedUser[]));
    return unsubscribe;
  }, [userMode]);

  useEffect(() => {
    if (userMode !== 'ADMIN') {
      setTransactions([]);
      return;
    }
    const unsubscribe = onTransactionsChange((items) => setTransactions(items));
    return unsubscribe;
  }, [userMode]);

  useEffect(() => {
    if (!authUser?.uid || userMode === 'ADMIN') return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void requestNativeNotificationPermission();
    }
  }, [authUser, userMode]);

  useEffect(() => {
    if (!authUser?.uid || userMode === 'ADMIN') return;
    let cleanup: (() => void) | null = null;
    void registerBackgroundPush(authUser.uid, ({ title, body }) => {
      setNotification(`${title}: ${body}`);
      setTimeout(() => setNotification(null), 2800);
    }).then((unsubscribe) => {
      if (typeof unsubscribe === 'function') cleanup = unsubscribe;
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, [authUser?.uid, userMode]);

  useEffect(() => {
    if (!authUser?.uid || userMode === 'ADMIN') return;
    let cleanup: (() => void) | null = null;
    void registerNativePush(authUser.uid, ({ title, body }) => {
      setNotification(`${title}: ${body}`);
      setTimeout(() => setNotification(null), 2800);
    })
      .then((unsubscribe) => {
        if (typeof unsubscribe === 'function') cleanup = unsubscribe;
      })
      .catch((error) => {
        console.warn('Native push setup skipped:', error?.message || error);
      });
    return () => {
      if (cleanup) cleanup();
    };
  }, [authUser?.uid, userMode]);

  useEffect(() => {
    if (!authUser?.uid || userMode === 'ADMIN') return;

    const nextStatuses: Record<string, Order['status']> = {};
    orders.forEach((order) => {
      nextStatuses[order.id] = order.status;
      const previous = lastKnownOrderStatuses.current[order.id];
      if (previous && previous !== order.status) {
        const message = `Commande #${order.id}: ${order.status}`;
        sendNativeNotification('Mise à jour commande', message);
        setNotification(message);
        setTimeout(() => setNotification(null), 2500);
      }

      if (
        order.status === 'delivering' &&
        typeof order.delivery_lat === 'number' &&
        typeof order.delivery_lng === 'number' &&
        typeof order.driver_lat === 'number' &&
        typeof order.driver_lng === 'number' &&
        !order.arrival_notified_at
      ) {
        const distance = haversineKm(order.driver_lat, order.driver_lng, order.delivery_lat, order.delivery_lng);
        if (distance <= 0.12) {
          const arrivalMessage = `Le livreur est arrive pour la commande #${order.id}.`;
          sendNativeNotification('Livreur arrive', arrivalMessage);
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate([300, 120, 300, 120, 500]);
          }
          setNotification(arrivalMessage);
          setTimeout(() => setNotification(null), 3500);
          void updateOrder(order.id, { arrival_notified_at: Date.now() });
        }
      }
    });
    lastKnownOrderStatuses.current = nextStatuses;
  }, [orders, authUser, userMode]);

  useEffect(() => {
    if (!selectedOrder?.id) return;
    const refreshed = orders.find((entry) => entry.id === selectedOrder.id);
    if (refreshed) setSelectedOrder(refreshed);
  }, [orders, selectedOrder?.id]);

  useEffect(() => {
    if (userMode === 'ADMIN' && view === 'main') {
      setView('admin');
    }
  }, [userMode, view]);

  useEffect(() => {
    document.documentElement.lang = appPreferences.language;
    document.body.classList.toggle('reduced-motion', appPreferences.reducedMotion);
  }, [appPreferences]);

  useEffect(() => {
    const seoByView: Record<ViewState, SeoConfig> = {
      splash: {
        titleFr: 'JuingoBIO | Produits bio en circuit court',
        titleEn: 'JuingoBIO | Organic products in short supply chains',
        descriptionFr: 'Marketplace premium pour acheter des produits bio en direct producteurs, en B2B et B2C.',
        descriptionEn: 'Premium marketplace to buy organic products directly from producers for both B2B and B2C.',
        keywordsFr: 'produits bio, circuit court, producteurs bio, fournisseurs directs bio, alimentation saine',
        keywordsEn: 'organic products, short supply chain, organic producers, direct organic suppliers, healthy food'
      },
      onboarding: {
        titleFr: 'Bienvenue sur JuingoBIO | Plateforme bio premium',
        titleEn: 'Welcome to JuingoBIO | Premium organic platform',
        descriptionFr: 'Découvrez une plateforme bio qui connecte ménages et professionnels aux producteurs et fournisseurs directs.',
        descriptionEn: 'Discover an organic platform connecting households and professionals to direct producers and suppliers.',
        keywordsFr: 'plateforme bio, fournisseur bio direct, marketplace bio, terroir bio',
        keywordsEn: 'organic platform, direct organic supplier, organic marketplace, farm to table'
      },
      auth: {
        titleFr: 'Connexion JuingoBIO | Accès client et pro',
        titleEn: 'JuingoBIO Login | Consumer and business access',
        descriptionFr: 'Connectez-vous pour commander des produits bio premium et suivre vos commandes en temps réel.',
        descriptionEn: 'Sign in to order premium organic products and track deliveries in real time.',
        keywordsFr: 'connexion bio, compte client bio, compte pro bio, commande bio en ligne',
        keywordsEn: 'organic login, organic customer account, organic business account, online organic orders'
      },
      split: {
        titleFr: 'Choisir votre profil | B2B ou B2C bio',
        titleEn: 'Choose your profile | B2B or B2C organic',
        descriptionFr: 'Accédez à une offre bio adaptée aux restaurants, commerces, hôtels et ménages.',
        descriptionEn: 'Access tailored organic offers for restaurants, stores, hotels and households.',
        keywordsFr: 'bio B2B, bio B2C, fournisseurs bio pour restaurants, produits bio pour ménages',
        keywordsEn: 'organic B2B, organic B2C, organic suppliers for restaurants, organic products for households'
      },
      main: {
        titleFr: 'Marché JuingoBIO | Produits bio et fournisseurs directs',
        titleEn: 'JuingoBIO Marketplace | Organic products and direct suppliers',
        descriptionFr: 'Commandez des produits bio premium en direct de fournisseurs certifiés, avec traçabilité et livraison rapide.',
        descriptionEn: 'Order premium organic products directly from certified suppliers with traceability and fast delivery.',
        keywordsFr: 'marché bio, produits bio premium, grossiste bio, fournisseur bio direct, fruits bio, légumes bio',
        keywordsEn: 'organic marketplace, premium organic products, organic wholesaler, direct organic supplier, organic fruits, organic vegetables'
      },
      cart: {
        titleFr: 'Panier JuingoBIO | Finaliser votre commande bio',
        titleEn: 'JuingoBIO Cart | Complete your organic order',
        descriptionFr: 'Vérifiez vos produits bio et préparez votre commande en circuit court.',
        descriptionEn: 'Review your organic products and prepare your short supply chain order.',
        keywordsFr: 'panier bio, commande bio, achat bio en ligne, produits frais bio',
        keywordsEn: 'organic cart, organic order, buy organic online, fresh organic products',
        pathHint: '?view=cart'
      },
      tracking: {
        titleFr: 'Suivi livraison bio | JuingoBIO',
        titleEn: 'Organic delivery tracking | JuingoBIO',
        descriptionFr: 'Suivez vos livraisons de produits bio en temps réel.',
        descriptionEn: 'Track your organic product deliveries in real time.',
        keywordsFr: 'suivi commande bio, livraison bio, tracking livraison',
        keywordsEn: 'organic order tracking, organic delivery, delivery tracking',
        pathHint: '?view=tracking'
      },
      profile: {
        titleFr: 'Profil JuingoBIO | Compte et préférences',
        titleEn: 'JuingoBIO Profile | Account and preferences',
        descriptionFr: 'Gérez votre compte JuingoBIO pour commander des produits bio selon vos besoins.',
        descriptionEn: 'Manage your JuingoBIO account to order organic products tailored to your needs.',
        keywordsFr: 'profil client bio, compte bio, préférences commande bio',
        keywordsEn: 'organic customer profile, organic account, organic order preferences',
        pathHint: '?view=profile'
      },
      settings: {
        titleFr: 'Paramètres JuingoBIO | Expérience bio personnalisée',
        titleEn: 'JuingoBIO Settings | Personalized organic experience',
        descriptionFr: 'Personnalisez vos préférences linguistiques et d’usage pour votre marketplace bio.',
        descriptionEn: 'Customize language and usage preferences for your organic marketplace.',
        keywordsFr: 'paramètres application bio, configuration compte bio',
        keywordsEn: 'organic app settings, organic account configuration',
        pathHint: '?view=settings'
      },
      orders: {
        titleFr: 'Commandes JuingoBIO | Historique produits bio',
        titleEn: 'JuingoBIO Orders | Organic order history',
        descriptionFr: 'Consultez vos commandes de produits bio et leur statut.',
        descriptionEn: 'Review your organic product orders and delivery status.',
        keywordsFr: 'historique commandes bio, commandes produits bio, suivi statut commande',
        keywordsEn: 'organic order history, organic product orders, order status tracking',
        pathHint: '?view=orders'
      },
      'order-detail': {
        titleFr: `Commande bio ${selectedOrder?.id ?? ''} | JuingoBIO`,
        titleEn: `Organic order ${selectedOrder?.id ?? ''} | JuingoBIO`,
        descriptionFr: 'Détails de commande bio: statut, paiement et livraison.',
        descriptionEn: 'Organic order details: status, payment and delivery.',
        keywordsFr: 'détail commande bio, facture bio, suivi livraison bio',
        keywordsEn: 'organic order detail, organic invoice, organic delivery tracking',
        pathHint: '?view=order-detail'
      },
      payment: {
        titleFr: 'Paiement sécurisé bio | JuingoBIO',
        titleEn: 'Secure organic checkout | JuingoBIO',
        descriptionFr: 'Finalisez votre achat de produits bio avec un paiement sécurisé.',
        descriptionEn: 'Complete your organic product purchase with secure checkout.',
        keywordsFr: 'paiement bio, commande sécurisée bio, achat produits bio',
        keywordsEn: 'organic payment, secure organic checkout, buy organic products',
        pathHint: '?view=payment'
      },
      'user-onboarding': {
        titleFr: 'Profil utilisateur bio | JuingoBIO',
        titleEn: 'Organic user profile | JuingoBIO',
        descriptionFr: 'Créez votre profil pour accéder à des fournisseurs bio directs et des produits certifiés.',
        descriptionEn: 'Create your profile to access direct organic suppliers and certified products.',
        keywordsFr: 'inscription bio, profil consommateur bio, profil professionnel bio',
        keywordsEn: 'organic signup, organic consumer profile, organic business profile'
      },
      admin: {
        titleFr: 'Admin JuingoBIO | Gestion produits bio et fournisseurs',
        titleEn: 'JuingoBIO Admin | Organic products and suppliers management',
        descriptionFr: 'Administrez le catalogue bio, les fournisseurs directs et les commandes.',
        descriptionEn: 'Manage organic catalog, direct suppliers and orders.',
        keywordsFr: 'admin bio, gestion fournisseurs bio, backoffice produits bio',
        keywordsEn: 'organic admin, organic supplier management, organic product backoffice',
        pathHint: '?view=admin'
      }
    };

    const selected = seoByView[view] || seoByView.main;
    const isEn = appPreferences.language === 'en';
    const title = isEn ? selected.titleEn : selected.titleFr;
    const description = isEn ? selected.descriptionEn : selected.descriptionFr;
    const keywords = isEn ? selected.keywordsEn : selected.keywordsFr;
    const baseUrl = window.location.origin;
    const imageUrl = `${baseUrl}/icons/icon-512.png`;

    const canonical = new URL(window.location.pathname, baseUrl);
    if (selected.pathHint?.startsWith('?')) {
      canonical.search = selected.pathHint;
    } else if (selected.pathHint) {
      canonical.pathname = selected.pathHint;
    }

    document.title = title;
    upsertMeta({ name: 'description' }, description);
    upsertMeta({ name: 'keywords' }, keywords);
    upsertMeta({ name: 'robots' }, 'index, follow, max-image-preview:large');
    upsertMeta({ name: 'author' }, 'JuingoBIO');
    upsertMeta({ name: 'application-name' }, 'JuingoBIO');
    upsertMeta({ property: 'og:title' }, title);
    upsertMeta({ property: 'og:description' }, description);
    upsertMeta({ property: 'og:type' }, view === 'main' ? 'product.group' : 'website');
    upsertMeta({ property: 'og:url' }, canonical.toString());
    upsertMeta({ property: 'og:image' }, imageUrl);
    upsertMeta({ property: 'og:site_name' }, 'JuingoBIO');
    upsertMeta({ property: 'og:locale' }, isEn ? 'en_US' : 'fr_FR');
    upsertMeta({ name: 'twitter:card' }, 'summary_large_image');
    upsertMeta({ name: 'twitter:title' }, title);
    upsertMeta({ name: 'twitter:description' }, description);
    upsertMeta({ name: 'twitter:image' }, imageUrl);
    upsertLink('canonical', canonical.toString());

    upsertJsonLd('juingobio-website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'JuingoBIO',
      url: baseUrl,
      inLanguage: isEn ? 'en' : 'fr',
      description,
      publisher: {
        '@type': 'Organization',
        name: 'JuingoBIO'
      },
      keywords
    });

    upsertJsonLd('juingobio-organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'JuingoBIO',
      url: baseUrl,
      logo: `${baseUrl}/icons/icon-192.png`,
      sameAs: []
    });
  }, [view, userMode, selectedOrder?.id, appPreferences.language]);

  const handleAddToCart = useCallback((item: OrderItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === item.product_id);
      if (existing) {
        return prev.map((i) => (i.product_id === item.product_id ? { ...i, qty: i.qty + item.qty } : i));
      }
      return [...prev, item];
    });
    setNotification(`${item.name} ajouté !`);
    setTimeout(() => setNotification(null), 2000);
  }, []);

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const handleCreateProduct = async (payload: Omit<Product, 'id'>, mediaFiles: File[]) => {
    try {
      let uploaded = { images: [], videos: [] } as { images: string[]; videos: string[] };
      let mediaUploadFailed = false;
      if (mediaFiles.length > 0) {
        try {
          uploaded = await uploadProductMedia(mediaFiles);
        } catch (error) {
          mediaUploadFailed = true;
          console.error('Unable to upload media, creating product without uploaded media:', error);
        }
      }

      const nextPayload: Omit<Product, 'id'> = {
        ...payload,
        images: uploaded.images.length > 0 ? uploaded.images : (payload.images.length > 0 ? payload.images : ['https://picsum.photos/seed/newproduct/800/800']),
        videos: uploaded.videos.length > 0 ? uploaded.videos : (payload.videos || [])
      };
      await createProduct(nextPayload);
      setNotification(mediaUploadFailed ? 'Produit créé (média ignoré)' : 'Produit créé (Firestore)');
      setTimeout(() => setNotification(null), 1800);
      return { success: true as const };
    } catch (error: any) {
      console.error('Unable to create product:', error);
      const errorMessage = error?.message || 'Erreur création produit';
      setNotification(errorMessage);
      setTimeout(() => setNotification(null), 2200);
      return { success: false as const, error: errorMessage };
    }
  };

  const handleUpdateProduct = async (productId: string, payload: Partial<Omit<Product, 'id'>>, mediaFiles: File[]) => {
    try {
      let uploaded = { images: [], videos: [] } as { images: string[]; videos: string[] };
      let mediaUploadFailed = false;
      if (mediaFiles.length > 0) {
        try {
          uploaded = await uploadProductMedia(mediaFiles);
        } catch (error) {
          mediaUploadFailed = true;
          console.error('Unable to upload media, updating product without uploaded media:', error);
        }
      }

      const nextPayload: Partial<Product> = {
        ...(payload as Partial<Product>),
        ...(uploaded.images.length > 0 ? { images: uploaded.images } : {}),
        ...(uploaded.videos.length > 0 ? { videos: uploaded.videos } : {})
      };
      await updateProduct(productId, nextPayload);
      setNotification(mediaUploadFailed ? 'Produit modifié (média ignoré)' : 'Produit modifié');
      setTimeout(() => setNotification(null), 1800);
      return { success: true as const };
    } catch (error: any) {
      console.error('Unable to update product:', error);
      const errorMessage = error?.message || 'Erreur modification produit';
      setNotification(errorMessage);
      setTimeout(() => setNotification(null), 2200);
      return { success: false as const, error: errorMessage };
    }
  };

  const handleToggleProductActive = (productId: string) => {
    const target = products.find((product) => product.id === productId);
    if (!target) return;
    void updateProduct(productId, { is_active: !target.is_active }).catch((error) => {
      console.error('Unable to update product:', error);
    });
  };

  const handleCreateCategory = (name: string, target: Category['target']) => {
    void createCategory({ name, target, is_active: true })
      .then(() => {
        setNotification('Catégorie créée (Firestore)');
        setTimeout(() => setNotification(null), 1800);
      })
      .catch((error) => {
        console.error('Unable to create category:', error);
      });
  };

  const handleToggleCategoryActive = (categoryId: string) => {
    const target = categories.find((category) => category.id === categoryId);
    if (!target) return;
    void updateCategory(categoryId, { is_active: !target.is_active }).catch((error) => {
      console.error('Unable to update category:', error);
    });
  };

  const handleUpdateOrderStatus = (
    orderId: string,
    status: Order['status'],
    options?: { driverName?: string; driverPhone?: string; driverLat?: number; driverLng?: number }
  ) => {
    const order = orders.find((entry) => entry.id === orderId);
    if (!order) return;

    const payload: Partial<Order> = { status };
    if (status === 'delivering') {
      payload.driver_name = options?.driverName?.trim() || order.driver_name || 'Livreur JuingoBIO';
      payload.driver_phone = options?.driverPhone?.trim() || order.driver_phone || '';
      if (typeof options?.driverLat === 'number') payload.driver_lat = options.driverLat;
      if (typeof options?.driverLng === 'number') payload.driver_lng = options.driverLng;
      if (typeof payload.driver_lat !== 'number') payload.driver_lat = order.driver_lat || order.delivery_lat || -4.325;
      if (typeof payload.driver_lng !== 'number') payload.driver_lng = order.driver_lng || order.delivery_lng || 15.31;
      payload.estimated_delivery = Date.now() + 45 * 60 * 1000;
      payload.arrival_notified_at = 0;
    }

    void updateOrder(orderId, payload)
      .then(() => {
        const message = `Votre commande #${orderId} est maintenant: ${status}`;
        return createOrderStatusNotification({
          user_id: order.user_id,
          order_id: orderId,
          status,
          message
        });
      })
      .then(() => {
        setNotification('Statut commande mis à jour');
        setTimeout(() => setNotification(null), 1800);
      })
      .catch((error) => {
        console.error('Unable to update order status:', error);
      });
  };

  const handleUpdateUserType = (uid: string, userType: UserType) => {
    setManagedUsers((prev) => prev.map((user) => (user.uid === uid ? { ...user, userType } : user)));
    void saveUserData({
      uid,
      userType,
      updatedAt: new Date().toISOString()
    }).catch((error) => {
      console.error('Unable to update user type:', error);
    });
    setNotification('Type utilisateur mis à jour');
    setTimeout(() => setNotification(null), 1800);
  };

  const handleCreateTransaction = async (payload: Omit<FinanceTransaction, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const transactionId = await createTransaction(payload);
      if (payload.user_id) {
        const message = `Transaction ${payload.amount.toFixed(2)} ${payload.currency} (${payload.status})`;
        await createFinanceNotification({
          user_id: payload.user_id,
          transaction_id: transactionId,
          amount: payload.amount,
          status: payload.status,
          message
        });
      }
      sendNativeNotification('Nouvelle transaction', `${payload.amount.toFixed(2)} ${payload.currency}`);
      setNotification('Transaction créée');
      setTimeout(() => setNotification(null), 1800);
      return { success: true as const };
    } catch (error: any) {
      console.error('Unable to create transaction:', error);
      const errorMessage = error?.message || 'Erreur création transaction';
      setNotification(errorMessage);
      setTimeout(() => setNotification(null), 2200);
      return { success: false as const, error: errorMessage };
    }
  };

  const handleUpdateTransactionStatus = async (
    transactionId: string,
    status: TransactionStatus,
    options?: { notes?: string }
  ) => {
    const existing = transactions.find((entry) => entry.id === transactionId);
    if (!existing) return;
    try {
      await updateTransaction(transactionId, {
        status,
        ...(options?.notes ? { notes: options.notes } : {})
      });
      if (existing.user_id) {
        await createFinanceNotification({
          user_id: existing.user_id,
          transaction_id: transactionId,
          amount: existing.amount,
          status,
          message: `Statut transaction mis à jour: ${status}`
        });
      }
      sendNativeNotification('Finance', `Transaction ${transactionId}: ${status}`);
      setNotification('Statut transaction mis à jour');
      setTimeout(() => setNotification(null), 1800);
    } catch (error) {
      console.error('Unable to update transaction:', error);
      setNotification('Erreur mise à jour transaction');
      setTimeout(() => setNotification(null), 2000);
    }
  };

  const handleUpdateDriverPosition = (orderId: string, payload: { driverLat: number; driverLng: number; driverPhone?: string }) => {
    void updateOrder(orderId, {
      driver_lat: payload.driverLat,
      driver_lng: payload.driverLng,
      ...(payload.driverPhone ? { driver_phone: payload.driverPhone } : {}),
      estimated_delivery: Date.now() + 25 * 60 * 1000
    })
      .then(() => {
        setNotification('Position livreur mise a jour');
        setTimeout(() => setNotification(null), 1700);
      })
      .catch((error) => {
        console.error('Unable to update driver position:', error);
        setNotification('Erreur mise a jour position');
        setTimeout(() => setNotification(null), 1700);
      });
  };

  const cartTotal = useMemo(() => cart.reduce((acc, curr) => acc + (curr.qty * curr.price_at_purchase), 0), [cart]);

  const showBottomNav = useMemo(() => {
    return ['main', 'cart', 'payment', 'orders', 'order-detail', 'tracking', 'profile', 'settings', 'admin'].includes(view);
  }, [view]);

  const tabKey = useMemo(() => {
    if (view === 'admin') return 'admin';
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
                src="https://res.cloudinary.com/dy73hzkpm/video/upload/v1772053087/onbordingvideo_flbjap.mp4"
                className="w-full h-full object-cover animate-subtle-zoom"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                style={{ pointerEvents: 'none' }}
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
                    <ShoppingCart size={24} className="text-earthOrange animate-bounce" style={{ animationDelay: '0.1s' }} />
                  </div>
                  <p className="text-xs text-center text-white font-semibold">{appPreferences.language === 'en' ? 'Fast delivery' : 'Livraison Rapide'}</p>
                </div>
                <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                  <div className="w-12 h-12 bg-bioGreen/20 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-300 hover:bg-bioGreen/40">
                    <ChevronRight size={24} className="text-bioGreen animate-pulse" style={{ animationDelay: '0.2s' }} />
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
                    setView('splash');
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
        return <LandingSplit onSelect={(mode) => { setUserMode(mode); localStorage.setItem('juingobio-user-mode', mode); setView(mode === 'ADMIN' ? 'admin' : 'main'); }} />;
      case 'main':
        if (userMode === 'ADMIN') {
          return (
            <AdminDashboard
              onNav={setView}
              orders={orders}
              transactions={transactions}
              products={products}
              categories={categories}
              users={managedUsers}
              onCreateProduct={handleCreateProduct}
              onUpdateProduct={handleUpdateProduct}
              onToggleProductActive={handleToggleProductActive}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onUpdateDriverPosition={handleUpdateDriverPosition}
              onCreateCategory={handleCreateCategory}
              onToggleCategoryActive={handleToggleCategoryActive}
              onUpdateUserType={handleUpdateUserType}
              onCreateTransaction={handleCreateTransaction}
              onUpdateTransactionStatus={handleUpdateTransactionStatus}
            />
          );
        }
        return (
          <div className="h-full bg-gradient-to-b from-[#eff8f0] via-[#f9fbf9] to-[#fff8ef] flex flex-col overflow-hidden">
            <div className="p-6">
              <div className="rounded-30 p-5 bg-gradient-to-r from-deepGreen via-[#235a4e] to-bioGreen text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setView('split')} className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                    <ChevronRight className="rotate-180" size={20} />
                  </button>
                  <button onClick={() => setView('profile')} className="w-10 h-10 rounded-full bg-white/15 overflow-hidden border border-white/30">
                    {authUser?.photoURL ? (
                      <img src={authUser.photoURL} alt="Photo profil" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={16} className="text-white/90" />
                      </div>
                    )}
                  </button>
                </div>
                <h1 className="font-serif text-2xl">JuingoBIO</h1>
                <p className="text-xs uppercase tracking-[0.2em] text-limeGreen font-bold mt-1">
                  {userMode === 'B2B' ? (appPreferences.language === 'en' ? 'Business Home' : 'Accueil Établissements') : (appPreferences.language === 'en' ? 'Household Home' : 'Accueil Ménages')}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide px-2 pb-3">
              {userMode === 'B2B' ? (
                <B2BDashboard onAdd={handleAddToCart} language={appPreferences.language} products={products} />
              ) : (
                <B2CMarketplace
                  onAdd={handleAddToCart}
                  productIdToOpen={new URLSearchParams(window.location.search).get('product') || undefined}
                  language={appPreferences.language}
                  dataSaverMode={appPreferences.dataSaver}
                  products={products}
                  categories={categories}
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
            onPaymentSuccess={({ method, paymentStatus, deliveryAddress, deliveryLat, deliveryLng }) => {
              const payload: Omit<Order, 'id'> = {
                user_id: authUser?.uid || 'guest-user',
                user_type: userMode || 'B2C',
                items: cart,
                payment_method: method,
                payment_status: paymentStatus,
                status: 'pending',
                total_ht: cartTotal * 0.9,
                total_ttc: cartTotal,
                created_at: Date.now(),
                delivery_address: deliveryAddress,
                delivery_lat: deliveryLat,
                delivery_lng: deliveryLng
              };

              setCart([]);
              void createOrder(payload)
                .then((newOrderId) => {
                  const txStatus: TransactionStatus = paymentStatus === 'paid' ? 'paid' : 'pending';
                  void handleCreateTransaction({
                    order_id: newOrderId,
                    user_id: payload.user_id,
                    user_type: payload.user_type,
                    kind: 'order_payment',
                    status: txStatus,
                    method,
                    amount: payload.total_ttc,
                    currency: 'CDF',
                    reference: `${method}-${newOrderId}`,
                    notes: method === 'cash_on_delivery' ? 'Paiement attendu à la livraison' : 'Paiement confirmé',
                    created_by: authUser?.uid || 'system'
                  });
                  setNotification(`Commande ${newOrderId} confirmée. En attente validation admin.`);
                  setTimeout(() => setNotification(null), 2200);
                  setView('orders');
                })
                .catch((error) => {
                  console.error('Unable to create order:', error);
                  setNotification('Erreur création commande');
                  setTimeout(() => setNotification(null), 2200);
                });
            }}
            onNav={setView}
          />
        );
      case 'tracking':
        return <TrackingView onNav={setView} />;
      case 'orders':
        return <OrdersView orders={orders} onNav={setView} onSelectOrder={(order) => { setSelectedOrder(order); setView('order-detail'); }} />;
      case 'order-detail':
        return selectedOrder ? <OrderDetailView order={selectedOrder} onNav={setView} /> : <div>Error</div>;
      case 'user-onboarding':
        return (
          <UserOnboardingView
            authUser={authUser}
            onComplete={(userData) => {
              const normalized = normalizeUserType(userData.userType) || 'B2C';
              setUserMode(normalized);
              localStorage.setItem('juingobio-user-mode', normalized);
              setView(normalized === 'ADMIN' ? 'admin' : 'main');
              void saveUserData(userData).catch(() => {
                setNotification('Profil synchronisé en retard (réseau lent)');
                setTimeout(() => setNotification(null), 2500);
              });
            }}
          />
        );
      case 'profile':
        return (
          <ProfileView
            onNav={setView}
            userMode={userMode}
            authUser={authUser}
            canAccessAdmin={canAccessAdmin}
          />
        );
      case 'settings':
        return (
          <SettingsView
            onNav={setView}
            authUser={authUser}
            userMode={userMode}
            onUserModeChange={(mode) => {
              const normalized = normalizeUserType(mode) || 'B2C';
              setUserMode(normalized);
              localStorage.setItem('juingobio-user-mode', normalized);
              if (normalized === 'ADMIN') {
                setView('admin');
              }
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
      case 'admin':
        return (
          <AdminDashboard
            onNav={setView}
            orders={orders}
            transactions={transactions}
            products={products}
            categories={categories}
            users={managedUsers}
            onCreateProduct={handleCreateProduct}
            onUpdateProduct={handleUpdateProduct}
            onToggleProductActive={handleToggleProductActive}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateDriverPosition={handleUpdateDriverPosition}
            onCreateCategory={handleCreateCategory}
            onToggleCategoryActive={handleToggleCategoryActive}
            onUpdateUserType={handleUpdateUserType}
            onCreateTransaction={handleCreateTransaction}
            onUpdateTransactionStatus={handleUpdateTransactionStatus}
          />
        );
      default:
        return <div>View error</div>;
    }
  };

  if (isLoading) {
    const loadingTags = ['BIO', 'FRAIS', 'LOCAL', 'CIRCUIT COURT', 'PRODUCTEURS', 'LIVRAISON RAPIDE'];
    const marqueeItems = [...loadingTags, ...loadingTags];
    return (
      <DeviceWrapper>
        <div className="h-full relative overflow-hidden bg-gradient-to-b from-deepGreen via-[#1f4f44] to-bioGreen text-white">
          <div className="absolute -top-16 -left-16 w-44 h-44 rounded-full bg-limeGreen/25 blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-20 -right-16 w-52 h-52 rounded-full bg-earthOrange/25 blur-3xl animate-pulse"></div>

          <div className="h-full relative z-10 flex flex-col justify-between py-12">
            <div className="text-center px-8">
              <div className="w-24 h-24 mx-auto rounded-full bg-white/10 border border-white/25 backdrop-blur-md flex items-center justify-center mb-5 animate-bounce">
                <img src="/logo.svg" alt="JuingoBIO" className="w-14 h-14 object-contain" />
              </div>
              <h1 className="font-serif text-4xl font-bold tracking-tight">
                juingo<span className="text-limeGreen">BIO</span>
              </h1>
              <p className="mt-3 text-xs uppercase tracking-[0.35em] text-limeGreen/95 font-semibold">
                Produits Frais & Bio
              </p>
            </div>

            <div className="px-4">
              <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm py-3">
                <div className="jb-marquee-track flex items-center gap-3 px-3">
                  {marqueeItems.map((label, index) => (
                    <div
                      key={`loading-${label}-${index}`}
                      className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-4 py-2 whitespace-nowrap"
                    >
                      <Leaf
                        size={14}
                        className="text-limeGreen animate-bounce"
                        style={{ animationDelay: `${(index % 6) * 0.12}s` }}
                      />
                      <span className="text-[10px] font-bold tracking-wide">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-5 text-center text-xs text-white/85">
                Préparation de votre marché premium...
              </p>
            </div>
          </div>
        </div>
      </DeviceWrapper>
    );
  }

  return (
    <DeviceWrapper>
      <div className="h-full flex flex-col">
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
              {userMode === 'ADMIN' ? (
                <>
                  <button onClick={() => setView('admin')} className={`flex-1 h-14 rounded-20 flex items-center justify-center gap-2 transition-all ${tabKey === 'admin' ? 'bg-deepGreen text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <Shield size={18} />
                    <span className="text-[11px] font-bold">Admin</span>
                  </button>
                  <button onClick={() => setView('profile')} className={`flex-1 h-14 rounded-20 flex items-center justify-center gap-2 transition-all ${tabKey === 'account' ? 'bg-[#235a4e] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <User size={18} />
                    <span className="text-[11px] font-bold">{appPreferences.language === 'en' ? 'Account' : 'Compte'}</span>
                  </button>
                  <button onClick={() => setView('settings')} className={`flex-1 h-14 rounded-20 flex items-center justify-center gap-2 transition-all ${view === 'settings' ? 'bg-earthOrange text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <SettingsIcon size={18} />
                    <span className="text-[11px] font-bold">Paramètres</span>
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </DeviceWrapper>
  );
};

export default App;
