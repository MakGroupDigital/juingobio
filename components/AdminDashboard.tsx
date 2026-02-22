import React, { useEffect, useMemo, useState } from 'react';
import { Category, ManagedUser, Order, Product, UserType } from '../types';
import { ArrowLeft, Boxes, PackageSearch, Pencil, Plus, ShoppingBag, Users, X } from 'lucide-react';
import { geocodeAddress } from '../services/geocodingService';

interface AdminDashboardProps {
  onNav: (view: string) => void;
  products: Product[];
  categories: Category[];
  orders: Order[];
  users: ManagedUser[];
  onCreateProduct: (payload: Omit<Product, 'id'>, mediaFiles: File[]) => Promise<{ success: boolean; error?: string }>;
  onUpdateProduct: (productId: string, payload: Partial<Omit<Product, 'id'>>, mediaFiles: File[]) => Promise<{ success: boolean; error?: string }>;
  onToggleProductActive: (productId: string) => void;
  onUpdateOrderStatus: (
    orderId: string,
    status: Order['status'],
    options?: { driverName?: string; driverPhone?: string; driverLat?: number; driverLng?: number }
  ) => void;
  onUpdateDriverPosition: (orderId: string, payload: { driverLat: number; driverLng: number; driverPhone?: string }) => void;
  onCreateCategory: (name: string, target: Category['target']) => void;
  onToggleCategoryActive: (categoryId: string) => void;
  onUpdateUserType: (uid: string, userType: UserType) => void;
}

type Tab = 'orders' | 'products' | 'categories' | 'users';

const ORDER_STATUS: Order['status'][] = ['pending', 'processing', 'delivering', 'completed'];
const STATUS_LABEL: Record<Order['status'], string> = {
  pending: 'En attente',
  processing: 'En traitement',
  delivering: 'En livraison',
  completed: 'Livrée'
};

const TARGET_LABEL: Record<Category['target'], string> = {
  ALL: 'Ménage + Établissement',
  B2C: 'Ménage',
  B2B: 'Établissement'
};

const DEFAULT_CATEGORY_OPTIONS = ['Fruits', 'Légumes', 'Épicerie'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNav,
  products,
  categories,
  orders,
  users,
  onCreateProduct,
  onUpdateProduct,
  onToggleProductActive,
  onUpdateOrderStatus,
  onCreateCategory,
  onToggleCategoryActive,
  onUpdateUserType,
  onUpdateDriverPosition
}) => {
  const [tab, setTab] = useState<Tab>('orders');
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', target: 'ALL' as Category['target'] });
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);
  const [deliveryOrderId, setDeliveryOrderId] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [deliveryForm, setDeliveryForm] = useState({
    driverName: '',
    driverPhone: '',
    driverAddress: '',
    driverLat: '',
    driverLng: ''
  });
  const [isGeocodingDelivery, setIsGeocodingDelivery] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackingForm, setTrackingForm] = useState({
    driverPhone: '',
    driverAddress: '',
    driverLat: '',
    driverLng: ''
  });
  const [isFetchingGps, setIsFetchingGps] = useState(false);
  const [isGeocodingTracking, setIsGeocodingTracking] = useState(false);

  const categoryOptions = useMemo(() => {
    const activeFromCategories = categories.filter((cat) => cat.is_active).map((cat) => cat.name);
    const fromProducts = products.map((product) => product.category).filter(Boolean);
    return Array.from(new Set([...DEFAULT_CATEGORY_OPTIONS, ...activeFromCategories, ...fromProducts]));
  }, [categories, products]);

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    category: DEFAULT_CATEGORY_OPTIONS[0],
    imageUrl: '',
    price_b2c_per_kg: 0,
    price_10kg_per_kg: 0,
    price_50kg_per_kg: 0,
    stock_kg: 0,
    available_for: ['B2B', 'B2C'] as UserType[]
  });

  useEffect(() => {
    if (!categoryOptions.length) return;
    if (!categoryOptions.includes(newProduct.category)) {
      setNewProduct((prev) => ({ ...prev, category: categoryOptions[0] }));
    }
  }, [categoryOptions, newProduct.category]);

  const stats = useMemo(() => {
    const pending = orders.filter((order) => order.status !== 'completed').length;
    const b2bProducts = products.filter((product) => (product.available_for || ['B2B', 'B2C']).includes('B2B')).length;
    const b2cProducts = products.filter((product) => (product.available_for || ['B2B', 'B2C']).includes('B2C')).length;
    return { pending, b2bProducts, b2cProducts };
  }, [orders, products]);

  const selectedUser = useMemo(
    () => users.find((entry) => entry.uid === selectedUserUid) || null,
    [users, selectedUserUid]
  );

  const handleCreateProduct = async () => {
    setProductFormError(null);
    if (!newProduct.name.trim() || !newProduct.description.trim() || !newProduct.category.trim()) {
      setProductFormError('Veuillez remplir nom, description et catégorie.');
      return;
    }

    const basePayload = {
      name: newProduct.name.trim(),
      description: newProduct.description.trim(),
      category: newProduct.category,
      available_for: newProduct.available_for,
      price_b2c: Number.isFinite(newProduct.price_b2c_per_kg) ? Number(newProduct.price_b2c_per_kg) : 0,
      price_b2b_tier: {
        '10kg': Number.isFinite(newProduct.price_10kg_per_kg) ? Number(newProduct.price_10kg_per_kg) : 0,
        '50kg': Number.isFinite(newProduct.price_50kg_per_kg) ? Number(newProduct.price_50kg_per_kg) : 0
      },
      unit: 'kg' as const,
      images: newProduct.imageUrl.trim() ? [newProduct.imageUrl.trim()] : [],
      videos: [],
      producer_id: 'prod1',
      stock: Number.isFinite(newProduct.stock_kg) ? Number(newProduct.stock_kg) : 0,
      is_active: true
    };

    setIsSubmittingProduct(true);
    try {
      const result = editingProductId
        ? await onUpdateProduct(editingProductId, basePayload, mediaFiles)
        : await onCreateProduct(basePayload, mediaFiles);

      if (!result.success) {
        setProductFormError(result.error || 'Échec lors de la sauvegarde du produit.');
        return;
      }

      setNewProduct((prev) => ({
        ...prev,
        name: '',
        description: '',
        imageUrl: '',
        price_b2c_per_kg: 0,
        price_10kg_per_kg: 0,
        price_50kg_per_kg: 0,
        stock_kg: 0
      }));
      setMediaFiles([]);
      setShowProductForm(false);
      setEditingProductId(null);
      setProductFormError(null);
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const openCreateProductForm = () => {
    setEditingProductId(null);
    setNewProduct({
      name: '',
      description: '',
      category: categoryOptions[0] || DEFAULT_CATEGORY_OPTIONS[0],
      imageUrl: '',
      price_b2c_per_kg: 0,
      price_10kg_per_kg: 0,
      price_50kg_per_kg: 0,
      stock_kg: 0,
      available_for: ['B2B', 'B2C']
    });
    setMediaFiles([]);
    setProductFormError(null);
    setShowProductForm(true);
  };

  const openEditProductForm = (product: Product) => {
    setEditingProductId(product.id);
    setNewProduct({
      name: product.name || '',
      description: product.description || '',
      category: product.category || (categoryOptions[0] || DEFAULT_CATEGORY_OPTIONS[0]),
      imageUrl: product.images?.[0] || '',
      price_b2c_per_kg: Number(product.price_b2c) || 0,
      price_10kg_per_kg: Number(product.price_b2b_tier?.['10kg']) || 0,
      price_50kg_per_kg: Number(product.price_b2b_tier?.['50kg']) || 0,
      stock_kg: Number(product.stock) || 0,
      available_for: product.available_for?.length ? product.available_for : ['B2B', 'B2C']
    });
    setMediaFiles([]);
    setProductFormError(null);
    setShowProductForm(true);
  };

  return (
    <div className="h-full bg-[#F9FBF9] flex flex-col">
      <div className="p-5 bg-white border-b border-slate-100 flex items-center justify-between">
        <button onClick={() => onNav('main')} className="w-10 h-10 rounded-full bg-slate-100 text-deepGreen flex items-center justify-center">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-serif text-xl text-deepGreen">Dashboard Admin</h1>
        <div className="w-10"></div>
      </div>

      <div className="px-4 pt-4 grid grid-cols-3 gap-2">
        <div className="bg-white rounded-15 p-3 border border-slate-100">
          <p className="text-[11px] text-slate-500">Commandes actives</p>
          <p className="text-lg font-bold text-earthOrange">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-15 p-3 border border-slate-100">
          <p className="text-[11px] text-slate-500">Produits B2B</p>
          <p className="text-lg font-bold text-deepGreen">{stats.b2bProducts}</p>
        </div>
        <div className="bg-white rounded-15 p-3 border border-slate-100">
          <p className="text-[11px] text-slate-500">Produits B2C</p>
          <p className="text-lg font-bold text-bioGreen">{stats.b2cProducts}</p>
        </div>
      </div>

      <div className="px-4 pt-3 grid grid-cols-4 gap-2">
        <button onClick={() => setTab('orders')} className={`h-10 rounded-12 text-xs font-bold flex items-center justify-center gap-1 ${tab === 'orders' ? 'bg-deepGreen text-white' : 'bg-white text-deepGreen border border-slate-200'}`}><PackageSearch size={14} />Commandes</button>
        <button onClick={() => setTab('products')} className={`h-10 rounded-12 text-xs font-bold flex items-center justify-center gap-1 ${tab === 'products' ? 'bg-deepGreen text-white' : 'bg-white text-deepGreen border border-slate-200'}`}><ShoppingBag size={14} />Produits</button>
        <button onClick={() => setTab('categories')} className={`h-10 rounded-12 text-xs font-bold flex items-center justify-center gap-1 ${tab === 'categories' ? 'bg-deepGreen text-white' : 'bg-white text-deepGreen border border-slate-200'}`}><Boxes size={14} />Catégories</button>
        <button onClick={() => setTab('users')} className={`h-10 rounded-12 text-xs font-bold flex items-center justify-center gap-1 ${tab === 'users' ? 'bg-deepGreen text-white' : 'bg-white text-deepGreen border border-slate-200'}`}><Users size={14} />Utilisateurs</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {tab === 'orders' && (
          <div className="space-y-3">
            {[...orders].sort((a, b) => b.created_at - a.created_at).map((order) => (
              <div key={order.id} className="bg-white rounded-20 p-4 border border-slate-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-deepGreen">#{order.id}</p>
                    <p className="text-xs text-slate-500">{order.user_type === 'B2B' ? 'Établissement' : 'Ménage'} • {order.items.length} article(s)</p>
                  </div>
                  <span className="text-sm font-bold text-earthOrange">{order.total_ttc.toFixed(2)} CDF</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {ORDER_STATUS.map((status) => (
                    <button
                      key={`${order.id}-${status}`}
                      onClick={() => {
                        if (status !== 'delivering') {
                          onUpdateOrderStatus(order.id, status);
                          return;
                        }
                        setDeliveryOrderId(order.id);
                        setDeliveryError(null);
                        setDeliveryForm({
                          driverName: order.driver_name || '',
                          driverPhone: order.driver_phone || '',
                          driverAddress: '',
                          driverLat: order.driver_lat != null ? String(order.driver_lat) : '',
                          driverLng: order.driver_lng != null ? String(order.driver_lng) : ''
                        });
                      }}
                      className={`py-2 px-3 rounded-12 text-xs font-semibold border ${order.status === status ? 'bg-deepGreen text-white border-deepGreen' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                      {STATUS_LABEL[status]}
                    </button>
                  ))}
                </div>

                {order.status === 'delivering' && (
                  <button
                    onClick={() => {
                      setTrackingOrderId(order.id);
                      setTrackingError(null);
                      setTrackingForm({
                        driverPhone: order.driver_phone || '',
                        driverAddress: '',
                        driverLat: order.driver_lat != null ? String(order.driver_lat) : '',
                        driverLng: order.driver_lng != null ? String(order.driver_lng) : ''
                      });
                    }}
                    className="mt-2 w-full h-10 rounded-12 bg-earthOrange/10 text-earthOrange text-xs font-bold"
                  >
                    Mettre à jour position livreur
                  </button>
                )}
              </div>
            ))}

            {deliveryOrderId && (
              <div className="fixed inset-0 z-40 bg-black/35 p-4 flex items-end sm:items-center justify-center">
                <div className="absolute inset-0" onClick={() => setDeliveryOrderId(null)}></div>
                <div className="relative w-full max-w-md bg-white rounded-20 p-4 border border-slate-100 space-y-3">
                  <p className="text-sm font-bold text-deepGreen">Infos livraison (Commande #{deliveryOrderId})</p>
                  <input
                    className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                    placeholder="Nom livreur (optionnel)"
                    value={deliveryForm.driverName}
                    onChange={(e) => setDeliveryForm((prev) => ({ ...prev, driverName: e.target.value }))}
                  />
                  <input
                    className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                    placeholder="Telephone livreur (optionnel)"
                    value={deliveryForm.driverPhone}
                    onChange={(e) => setDeliveryForm((prev) => ({ ...prev, driverPhone: e.target.value }))}
                  />
                  <div className="space-y-2">
                    <input
                      className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                      placeholder="Adresse actuelle du livreur (optionnel)"
                      value={deliveryForm.driverAddress}
                      onChange={(e) => setDeliveryForm((prev) => ({ ...prev, driverAddress: e.target.value }))}
                    />
                    <button
                      onClick={() => {
                        if (!deliveryForm.driverAddress.trim()) {
                          setDeliveryError("Entrez l'adresse du livreur avant conversion.");
                          return;
                        }
                        setIsGeocodingDelivery(true);
                        setDeliveryError(null);
                        void geocodeAddress(deliveryForm.driverAddress).then((coords) => {
                          if (!coords) {
                            setDeliveryError("Adresse introuvable. Entrez les coordonnees manuellement.");
                            setIsGeocodingDelivery(false);
                            return;
                          }
                          setDeliveryForm((prev) => ({
                            ...prev,
                            driverLat: String(coords.lat),
                            driverLng: String(coords.lng)
                          }));
                          setIsGeocodingDelivery(false);
                        });
                      }}
                      className="w-full h-10 rounded-12 bg-slate-100 text-deepGreen text-xs font-semibold"
                    >
                      {isGeocodingDelivery ? 'Conversion adresse...' : 'Convertir adresse en GPS'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                      placeholder="Latitude GPS"
                      value={deliveryForm.driverLat}
                      onChange={(e) => setDeliveryForm((prev) => ({ ...prev, driverLat: e.target.value }))}
                    />
                    <input
                      className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                      placeholder="Longitude GPS"
                      value={deliveryForm.driverLng}
                      onChange={(e) => setDeliveryForm((prev) => ({ ...prev, driverLng: e.target.value }))}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Telephone pour contact. Pour un suivi GPS precis, renseignez latitude et longitude du livreur.
                  </p>
                  {deliveryError && <p className="text-xs font-semibold text-red-500">{deliveryError}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDeliveryOrderId(null)}
                      className="h-10 rounded-12 bg-slate-100 text-slate-700 text-xs font-semibold"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        const lat = deliveryForm.driverLat.trim() ? Number(deliveryForm.driverLat) : undefined;
                        const lng = deliveryForm.driverLng.trim() ? Number(deliveryForm.driverLng) : undefined;
                        if ((lat != null && Number.isNaN(lat)) || (lng != null && Number.isNaN(lng))) {
                          setDeliveryError('Coordonnees GPS invalides.');
                          return;
                        }
                        if ((lat == null) !== (lng == null)) {
                          setDeliveryError('Renseignez latitude ET longitude ensemble.');
                          return;
                        }
                        onUpdateOrderStatus(deliveryOrderId, 'delivering', {
                          driverName: deliveryForm.driverName,
                          driverPhone: deliveryForm.driverPhone,
                          driverLat: lat,
                          driverLng: lng
                        });
                        setDeliveryOrderId(null);
                      }}
                      className="h-10 rounded-12 bg-deepGreen text-white text-xs font-bold"
                    >
                      Passer en livraison
                    </button>
                  </div>
                </div>
              </div>
            )}

            {trackingOrderId && (
              <div className="fixed inset-0 z-40 bg-black/35 p-4 flex items-end sm:items-center justify-center">
                <div className="absolute inset-0" onClick={() => setTrackingOrderId(null)}></div>
                <div className="relative w-full max-w-md bg-white rounded-20 p-4 border border-slate-100 space-y-3">
                  <p className="text-sm font-bold text-deepGreen">Position en temps réel (#{trackingOrderId})</p>
                  <input
                    className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                    placeholder="Telephone livreur (optionnel)"
                    value={trackingForm.driverPhone}
                    onChange={(e) => setTrackingForm((prev) => ({ ...prev, driverPhone: e.target.value }))}
                  />
                  <div className="space-y-2">
                    <input
                      className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                      placeholder="Adresse actuelle du livreur (optionnel)"
                      value={trackingForm.driverAddress}
                      onChange={(e) => setTrackingForm((prev) => ({ ...prev, driverAddress: e.target.value }))}
                    />
                    <button
                      onClick={() => {
                        if (!trackingForm.driverAddress.trim()) {
                          setTrackingError("Entrez l'adresse du livreur avant conversion.");
                          return;
                        }
                        setIsGeocodingTracking(true);
                        setTrackingError(null);
                        void geocodeAddress(trackingForm.driverAddress).then((coords) => {
                          if (!coords) {
                            setTrackingError("Adresse introuvable. Entrez les coordonnees manuellement.");
                            setIsGeocodingTracking(false);
                            return;
                          }
                          setTrackingForm((prev) => ({
                            ...prev,
                            driverLat: String(coords.lat),
                            driverLng: String(coords.lng)
                          }));
                          setIsGeocodingTracking(false);
                        });
                      }}
                      className="w-full h-10 rounded-12 bg-slate-100 text-deepGreen text-xs font-semibold"
                    >
                      {isGeocodingTracking ? 'Conversion adresse...' : 'Convertir adresse en GPS'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                      placeholder="Latitude GPS"
                      value={trackingForm.driverLat}
                      onChange={(e) => setTrackingForm((prev) => ({ ...prev, driverLat: e.target.value }))}
                    />
                    <input
                      className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                      placeholder="Longitude GPS"
                      value={trackingForm.driverLng}
                      onChange={(e) => setTrackingForm((prev) => ({ ...prev, driverLng: e.target.value }))}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!navigator.geolocation) {
                        setTrackingError("La geolocalisation n'est pas supportee.");
                        return;
                      }
                      setIsFetchingGps(true);
                      setTrackingError(null);
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setTrackingForm((prev) => ({
                            ...prev,
                            driverLat: String(position.coords.latitude),
                            driverLng: String(position.coords.longitude)
                          }));
                          setIsFetchingGps(false);
                        },
                        () => {
                          setTrackingError('Impossible de recuperer le GPS appareil.');
                          setIsFetchingGps(false);
                        },
                        { enableHighAccuracy: true, timeout: 9000, maximumAge: 5000 }
                      );
                    }}
                    className="w-full h-10 rounded-12 bg-slate-100 text-deepGreen text-xs font-semibold"
                  >
                    {isFetchingGps ? 'Recuperation GPS...' : 'Utiliser GPS de cet appareil'}
                  </button>
                  {trackingError && <p className="text-xs font-semibold text-red-500">{trackingError}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTrackingOrderId(null)}
                      className="h-10 rounded-12 bg-slate-100 text-slate-700 text-xs font-semibold"
                    >
                      Fermer
                    </button>
                    <button
                      onClick={() => {
                        const lat = Number(trackingForm.driverLat);
                        const lng = Number(trackingForm.driverLng);
                        if (Number.isNaN(lat) || Number.isNaN(lng)) {
                          setTrackingError('Coordonnees GPS invalides.');
                          return;
                        }
                        onUpdateDriverPosition(trackingOrderId, {
                          driverLat: lat,
                          driverLng: lng,
                          driverPhone: trackingForm.driverPhone
                        });
                        setTrackingOrderId(null);
                      }}
                      className="h-10 rounded-12 bg-deepGreen text-white text-xs font-bold"
                    >
                      Mettre a jour
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'products' && (
          <div className="relative space-y-3 pb-24">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-deepGreen">Liste des produits</p>
              <button
                onClick={openCreateProductForm}
                className="px-3 h-9 rounded-12 bg-deepGreen text-white text-xs font-bold flex items-center gap-1"
              >
                <Plus size={14} />
                Ajouter
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-20 p-3 border border-slate-100 shadow-sm">
                  <div className="flex gap-3">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-20 h-20 rounded-12 object-cover" />
                    ) : product.videos?.[0] ? (
                      <video src={product.videos[0]} className="w-20 h-20 rounded-12 object-cover" muted />
                    ) : (
                      <img src="https://picsum.photos/seed/noimage/800/800" alt={product.name} className="w-20 h-20 rounded-12 object-cover" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-deepGreen text-sm">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.category} • Stock {product.stock} kg</p>
                        </div>
                        <button onClick={() => onToggleProductActive(product.id)} className={`px-2 py-1 rounded-10 text-[10px] font-bold ${product.is_active ? 'bg-bioGreen/10 text-bioGreen' : 'bg-red-50 text-red-500'}`}>
                          {product.is_active ? 'Actif' : 'Inactif'}
                        </button>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div className="bg-slate-50 rounded-10 p-2">
                          <p className="text-[10px] text-slate-500">Ménage</p>
                          <p className="text-xs font-bold text-earthOrange">{product.price_b2c} CDF/kg</p>
                        </div>
                        <div className="bg-slate-50 rounded-10 p-2">
                          <p className="text-[10px] text-slate-500">Pro 10kg</p>
                          <p className="text-xs font-bold text-deepGreen">{product.price_b2b_tier?.['10kg']} CDF/kg</p>
                        </div>
                        <div className="bg-slate-50 rounded-10 p-2">
                          <p className="text-[10px] text-slate-500">Pro 50kg</p>
                          <p className="text-xs font-bold text-deepGreen">{product.price_b2b_tier?.['50kg']} CDF/kg</p>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => openEditProductForm(product)}
                          className="flex-1 h-9 rounded-12 bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1"
                        >
                          <Pencil size={13} />
                          Modifier
                        </button>
                        <button
                          onClick={() => onToggleProductActive(product.id)}
                          className={`flex-1 h-9 rounded-12 text-xs font-semibold ${product.is_active ? 'bg-red-50 text-red-500' : 'bg-bioGreen/10 text-bioGreen'}`}
                        >
                          {product.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={openCreateProductForm}
              className="fixed right-8 bottom-8 w-14 h-14 rounded-full bg-deepGreen text-white shadow-xl flex items-center justify-center z-30"
              aria-label="Ajouter un produit"
            >
              <Plus size={22} />
            </button>

            {showProductForm && (
              <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] p-4 flex items-end sm:items-center justify-center">
                <div className="w-full max-w-xl bg-white rounded-20 p-4 border border-slate-100 space-y-3 max-h-[92vh] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-deepGreen">{editingProductId ? 'Modifier le produit' : 'Ajouter un produit'}</p>
                    <button
                      onClick={() => {
                        setShowProductForm(false);
                        setEditingProductId(null);
                        setProductFormError(null);
                      }}
                      className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <input
                      className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                      placeholder="Nom du produit"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <textarea
                      className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                      placeholder="Description"
                      value={newProduct.description}
                      onChange={(e) => setNewProduct((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-slate-500 font-semibold">Catégorie</label>
                    <select
                      className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct((prev) => ({ ...prev, category: e.target.value }))}
                    >
                      {categoryOptions.map((categoryName) => (
                        <option key={categoryName} value={categoryName}>{categoryName}</option>
                      ))}
                    </select>
                  </div>

                  <input
                    className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                    placeholder="URL image (optionnel)"
                    value={newProduct.imageUrl}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  />

                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-semibold">Importer images/vidéos</label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={(e) => setMediaFiles(Array.from(e.target.files || []))}
                      className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                    />
                    {mediaFiles.length > 0 && (
                      <p className="text-[11px] text-slate-500">{mediaFiles.length} média(s) sélectionné(s)</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 font-semibold">Prix ménage (CDF/kg)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                        placeholder="Ex: 4.5"
                        value={newProduct.price_b2c_per_kg}
                        onChange={(e) => setNewProduct((prev) => ({ ...prev, price_b2c_per_kg: Number(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-semibold">Stock (kg)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                        placeholder="Ex: 250"
                        value={newProduct.stock_kg}
                        onChange={(e) => setNewProduct((prev) => ({ ...prev, stock_kg: Number(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 font-semibold">Prix pro 10kg (CDF/kg)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                        placeholder="Ex: 3.2"
                        value={newProduct.price_10kg_per_kg}
                        onChange={(e) => setNewProduct((prev) => ({ ...prev, price_10kg_per_kg: Number(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-semibold">Prix pro 50kg (CDF/kg)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                        placeholder="Ex: 2.8"
                        value={newProduct.price_50kg_per_kg}
                        onChange={(e) => setNewProduct((prev) => ({ ...prev, price_50kg_per_kg: Number(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setNewProduct((prev) => ({ ...prev, available_for: ['B2C'] }))} className={`flex-1 py-2 rounded-12 text-xs font-semibold ${newProduct.available_for.length === 1 && newProduct.available_for[0] === 'B2C' ? 'bg-bioGreen text-white' : 'bg-slate-100 text-slate-600'}`}>Ménage</button>
                    <button onClick={() => setNewProduct((prev) => ({ ...prev, available_for: ['B2B'] }))} className={`flex-1 py-2 rounded-12 text-xs font-semibold ${newProduct.available_for.length === 1 && newProduct.available_for[0] === 'B2B' ? 'bg-earthOrange text-white' : 'bg-slate-100 text-slate-600'}`}>Établissement</button>
                    <button onClick={() => setNewProduct((prev) => ({ ...prev, available_for: ['B2B', 'B2C'] }))} className={`flex-1 py-2 rounded-12 text-xs font-semibold ${newProduct.available_for.length === 2 ? 'bg-deepGreen text-white' : 'bg-slate-100 text-slate-600'}`}>Les deux</button>
                  </div>

                  {productFormError && (
                    <p className="text-xs font-semibold text-red-500">{productFormError}</p>
                  )}

                  <button
                    onClick={handleCreateProduct}
                    disabled={isSubmittingProduct}
                    className={`w-full py-2 rounded-12 text-sm font-bold ${isSubmittingProduct ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-deepGreen text-white'}`}
                  >
                    {isSubmittingProduct ? 'Enregistrement...' : (editingProductId ? 'Enregistrer les modifications' : 'Créer le produit')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'categories' && (
          <div className="space-y-3">
            <div className="bg-white rounded-20 p-4 border border-slate-100 space-y-2">
              <p className="text-sm font-bold text-deepGreen">Nouvelle catégorie</p>
              <input className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none" placeholder="Nom catégorie" value={newCategory.name} onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))} />
              <div className="grid grid-cols-3 gap-2">
                {(['B2C', 'B2B', 'ALL'] as Category['target'][]).map((target) => (
                  <button key={target} onClick={() => setNewCategory((prev) => ({ ...prev, target }))} className={`py-2 rounded-12 text-xs font-semibold ${newCategory.target === target ? 'bg-deepGreen text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {TARGET_LABEL[target]}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  if (!newCategory.name.trim()) return;
                  onCreateCategory(newCategory.name.trim(), newCategory.target);
                  setNewCategory({ name: '', target: 'ALL' });
                }}
                className="w-full bg-deepGreen text-white py-2 rounded-12 text-sm font-bold"
              >
                Ajouter catégorie
              </button>
            </div>

            {categories.map((category) => (
              <div key={category.id} className="bg-white rounded-20 p-4 border border-slate-100 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-deepGreen text-sm">{category.name}</p>
                  <p className="text-xs text-slate-500">{TARGET_LABEL[category.target]}</p>
                </div>
                <button onClick={() => onToggleCategoryActive(category.id)} className={`px-3 py-2 rounded-12 text-xs font-bold ${category.is_active ? 'bg-bioGreen/10 text-bioGreen' : 'bg-red-50 text-red-500'}`}>
                  {category.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-3">
            {selectedUser && (
              <div className="bg-white rounded-20 p-4 border border-slate-100">
                <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Profil sélectionné</p>
                <p className="font-semibold text-deepGreen text-sm">{selectedUser.displayName || 'Utilisateur sans nom'}</p>
                <p className="text-xs text-slate-500">{selectedUser.email || 'Email non défini'}</p>
              </div>
            )}
            {users.length === 0 ? (
              <div className="bg-white rounded-20 p-6 border border-slate-100 text-center text-sm text-slate-500">Aucun utilisateur trouvé.</div>
            ) : (
              users.map((user) => (
                <div key={user.uid} className="bg-white rounded-20 p-4 border border-slate-100">
                  <button
                    onClick={() => setSelectedUserUid(user.uid)}
                    className={`font-semibold text-sm underline-offset-2 ${selectedUserUid === user.uid ? 'text-earthOrange underline' : 'text-deepGreen hover:underline'}`}
                  >
                    {user.displayName || 'Utilisateur'}
                  </button>
                  <p className="text-xs text-slate-500">{user.email || 'Email non défini'}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {user.userType === 'B2B' ? `Établissement (${user.establishmentType || 'non défini'})` : user.userType === 'B2C' ? 'Ménage' : 'Type non défini'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      onClick={() => onUpdateUserType(user.uid, 'B2C')}
                      className={`py-2 rounded-12 text-xs font-semibold ${user.userType === 'B2C' ? 'bg-bioGreen text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      Ménage
                    </button>
                    <button
                      onClick={() => onUpdateUserType(user.uid, 'B2B')}
                      className={`py-2 rounded-12 text-xs font-semibold ${user.userType === 'B2B' ? 'bg-earthOrange text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                      Établissement
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
