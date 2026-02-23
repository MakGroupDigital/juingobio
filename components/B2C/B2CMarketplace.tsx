import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Product, OrderItem, Category } from '../../types';
import { PRODUCERS } from '../../constants';
import { getGeminiStory } from '../../services/geminiService';
import { ChevronLeft, ChevronRight, Share2, X } from 'lucide-react';

interface B2CMarketplaceProps {
  onAdd: (item: OrderItem) => void;
  productIdToOpen?: string;
  language?: 'fr' | 'en';
  dataSaverMode?: boolean;
  readOnly?: boolean;
  products: Product[];
  categories: Category[];
}

const B2CMarketplace: React.FC<B2CMarketplaceProps> = ({
  onAdd,
  productIdToOpen,
  language = 'fr',
  dataSaverMode = false,
  readOnly = false,
  products,
  categories
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [story, setStory] = useState<string | null>(null);
  const [loadingStory, setLoadingStory] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const storyCacheRef = useRef<Record<string, string>>({});
  const activeProductIdRef = useRef<string | null>(null);
  const storyRequestIdRef = useRef(0);
  const handledDeepLinkRef = useRef<string | null>(null);
  const mediaCarouselRef = useRef<HTMLDivElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const wheelLockRef = useRef(false);

  const availableProducts = useMemo(
    () => products.filter((p) => p.is_active && (p.available_for || ['B2B', 'B2C']).includes('B2C')),
    [products]
  );

  const availableCategories = useMemo(() => {
    const base = categories
      .filter((cat) => cat.is_active && (cat.target === 'ALL' || cat.target === 'B2C'))
      .map((cat) => cat.name);

    const fromProducts = Array.from(new Set(availableProducts.map((p) => p.category)));
    return ['Tous', ...Array.from(new Set([...base, ...fromProducts]))];
  }, [categories, availableProducts]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Tous') return availableProducts;
    return availableProducts.filter((product) => product.category === selectedCategory);
  }, [availableProducts, selectedCategory]);

  useEffect(() => {
    if (!productIdToOpen) {
      handledDeepLinkRef.current = null;
      return;
    }
    if (handledDeepLinkRef.current === productIdToOpen) return;

    const product = availableProducts.find((p) => p.id === productIdToOpen);
    if (!product) return;

    handleOpenProduct(product);
    handledDeepLinkRef.current = productIdToOpen;

    const params = new URLSearchParams(window.location.search);
    if (params.get('product') === productIdToOpen) {
      params.delete('product');
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
      window.history.replaceState({}, document.title, nextUrl);
    }
  }, [productIdToOpen, availableProducts]);

  const handleOpenProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentImageIndex(0);
    setShowShareModal(false);
    activeProductIdRef.current = product.id;

    const cachedStory = storyCacheRef.current[product.id];
    if (cachedStory) {
      setStory(cachedStory);
      setLoadingStory(false);
    } else {
      setStory(null);
      setLoadingStory(true);
    }

    const requestId = ++storyRequestIdRef.current;
    if (dataSaverMode) {
      const liteStory = language === 'en'
        ? 'Fresh organic product from responsible farming. Data saver mode is enabled.'
        : "Produit bio frais issu d'une agriculture responsable. Mode économie de données activé.";
      storyCacheRef.current[product.id] = liteStory;
      setStory(liteStory);
      setLoadingStory(false);
      return;
    }

    void (async () => {
      try {
        const producer = PRODUCERS.find((p) => p.id === product.producer_id);
        const text = await getGeminiStory(product.name, producer?.farm_name || 'Nos Terres');
        storyCacheRef.current[product.id] = text;

        if (storyRequestIdRef.current === requestId && activeProductIdRef.current === product.id) {
          setStory(text);
          setLoadingStory(false);
        }
      } catch {
        if (storyRequestIdRef.current === requestId && activeProductIdRef.current === product.id) {
          setLoadingStory(false);
        }
      }
    })();
  };

  const closeProductModal = () => {
    activeProductIdRef.current = null;
    setSelectedProduct(null);
    setShowShareModal(false);
    setLoadingStory(false);
    if (scrollRafRef.current != null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  };

  const handleNextImage = () => {
    if (selectedProduct) {
      const mediaCount = selectedProduct.images.length + (selectedProduct.videos?.length || 0);
      if (!mediaCount) return;
      setCurrentImageIndex((prev) => (prev + 1) % mediaCount);
    }
  };

  const handlePrevImage = () => {
    if (selectedProduct) {
      const mediaCount = selectedProduct.images.length + (selectedProduct.videos?.length || 0);
      if (!mediaCount) return;
      setCurrentImageIndex((prev) => (prev - 1 + mediaCount) % mediaCount);
    }
  };

  const scrollToMediaIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    if (!mediaCarouselRef.current) return;
    const width = mediaCarouselRef.current.clientWidth;
    if (!width) return;
    mediaCarouselRef.current.scrollTo({
      left: index * width,
      behavior
    });
  };

  const generateShareLink = () => {
    if (selectedProduct) {
      const baseUrl = window.location.origin;
      return `${baseUrl}?product=${selectedProduct.id}`;
    }
    return '';
  };

  const copyToClipboard = () => {
    const link = generateShareLink();
    navigator.clipboard.writeText(link);
    setShowShareModal(false);
    alert('Lien copié !');
  };

  const selectedMedia = selectedProduct
    ? [
        ...selectedProduct.images.map((src) => ({ type: 'image' as const, src })),
        ...(selectedProduct.videos || []).map((src) => ({ type: 'video' as const, src }))
      ]
    : [];

  useEffect(() => {
    if (!selectedProduct || !mediaCarouselRef.current || selectedMedia.length <= 1) return;
    scrollToMediaIndex(currentImageIndex);
  }, [currentImageIndex, selectedProduct, selectedMedia.length]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="px-4">
        <div className="rounded-30 p-5 bg-gradient-to-br from-deepGreen via-[#1f4f44] to-bioGreen text-white shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 -right-8 w-28 h-28 bg-limeGreen/25 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-8 w-24 h-24 bg-earthOrange/20 rounded-full blur-2xl"></div>
          <h1 className="font-serif text-3xl relative z-10">{language === 'en' ? 'Home - Households' : 'Accueil Ménages'}</h1>
          <p className="text-limeGreen text-sm mt-2 relative z-10">{language === 'en' ? 'Fresh products for your home.' : 'Produits frais pour votre foyer.'}</p>
          <div className="mt-4 flex gap-2 relative z-10">
            <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-white/20 border border-white/20">100% BIO</span>
            <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-white/20 border border-white/20">{language === 'en' ? 'Same Day' : 'Livraison rapide'}</span>
          </div>
        </div>
      </div>

      <div className="flex space-x-3 px-4 pt-5 pb-4 overflow-x-auto scrollbar-hide">
        {availableCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap border ${selectedCategory === cat ? 'bg-deepGreen text-white border-deepGreen' : 'bg-white text-deepGreen border-slate-200 shadow-sm'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 px-4 pb-6">
        {filteredProducts.map((product, index) => (
          <div
            key={product.id}
            className="bg-white rounded-30 p-3 shadow-md border border-slate-100 cursor-pointer active:scale-95 transition-transform animate-in fade-in slide-in-from-bottom-4 duration-500 hover:shadow-xl"
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => handleOpenProduct(product)}
          >
            <div className="relative mb-3">
              <img src={product.images[0]} alt={product.name} className="w-full h-32 object-cover rounded-20" />
              <div className="absolute top-2 right-2 bg-limeGreen text-deepGreen text-[10px] font-bold px-2 py-1 rounded-full">BIO</div>
            </div>
            <h3 className="font-bold text-sm text-deepGreen truncate">{product.name}</h3>
            <p className="text-[10px] text-gray-500 mb-2">{product.category}</p>
            <div className="flex justify-between items-center">
              <span className="text-earthOrange font-bold text-sm">{product.price_b2c} CDF</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (readOnly) return;
                  onAdd({
                    product_id: product.id,
                    name: product.name,
                    image: product.images[0],
                    qty: 1,
                    price_at_purchase: product.price_b2c
                  });
                }}
                disabled={readOnly}
                className="w-8 h-8 bg-bioGreen text-white rounded-full flex items-center justify-center shadow-lg"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeProductModal}></div>
          <div className="relative w-full max-w-[393px] bg-white rounded-t-[40px] p-8 animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>

            <div className="relative mb-6 group">
              <div
                ref={mediaCarouselRef}
                className="w-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide rounded-30"
                style={{ touchAction: 'pan-y' }}
                onWheel={(e) => {
                  if (selectedMedia.length <= 1) return;
                  const absY = Math.abs(e.deltaY);
                  const absX = Math.abs(e.deltaX);
                  if (absY < 8 && absX < 8) return;
                  if (wheelLockRef.current) return;
                  wheelLockRef.current = true;
                  if (absY >= absX) {
                    e.preventDefault();
                    if (e.deltaY > 0) handleNextImage();
                    else handlePrevImage();
                  } else {
                    if (e.deltaX > 0) handleNextImage();
                    else handlePrevImage();
                  }
                  window.setTimeout(() => {
                    wheelLockRef.current = false;
                  }, 180);
                }}
                onScroll={(e) => {
                  if (scrollRafRef.current != null) return;
                  const target = e.currentTarget;
                  scrollRafRef.current = requestAnimationFrame(() => {
                    const width = target.clientWidth;
                    if (width > 0) {
                      const nextIndex = Math.round(target.scrollLeft / width);
                      if (nextIndex !== currentImageIndex && nextIndex >= 0 && nextIndex < selectedMedia.length) {
                        setCurrentImageIndex(nextIndex);
                      }
                    }
                    scrollRafRef.current = null;
                  });
                }}
              >
                {selectedMedia.map((media, i) => (
                  <div key={`${media.type}-${media.src}-${i}`} className="w-full shrink-0 snap-center">
                    {media.type === 'video' ? (
                      <video
                        src={media.src}
                        className="w-full h-48 object-cover transition-all duration-150 bg-black"
                        controls
                        playsInline
                      />
                    ) : (
                      <img
                        src={media.src || selectedProduct.images[0]}
                        alt={`${selectedProduct.name}-${i + 1}`}
                        className="w-full h-48 object-cover transition-all duration-150"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="absolute top-3 right-3 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold">
                {Math.min(currentImageIndex + 1, Math.max(1, selectedMedia.length))}/{Math.max(1, selectedMedia.length)}
              </div>

              {selectedMedia.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/85 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all opacity-100"
                  >
                    <ChevronLeft size={20} className="text-deepGreen" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/85 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all opacity-100"
                  >
                    <ChevronRight size={20} className="text-deepGreen" />
                  </button>
                </>
              )}

              {selectedMedia.length > 1 && (
                <div className="flex justify-center gap-2 mt-3">
                  {selectedMedia.map((media, i) => (
                    <button
                      key={`media-dot-${i}-${media.type}`}
                      onClick={() => {
                        setCurrentImageIndex(i);
                        scrollToMediaIndex(i);
                      }}
                      className={`w-10 h-10 rounded-xl overflow-hidden border transition-all ${
                        i === currentImageIndex ? 'border-earthOrange ring-2 ring-earthOrange/40' : 'border-slate-200'
                      }`}
                      aria-label={`media-${i + 1}`}
                    >
                      {media.type === 'video' ? (
                        <div className="w-full h-full bg-black text-white text-[10px] font-bold flex items-center justify-center">
                          VID
                        </div>
                      ) : (
                        <img src={media.src} alt={`thumb-${i + 1}`} className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {selectedMedia.length > 1 && (
                <div className="flex justify-center gap-2 mt-2">
                  {selectedMedia.map((_, i) => (
                    <button
                      key={`media-indicator-${i}`}
                      onClick={() => {
                        setCurrentImageIndex(i);
                        scrollToMediaIndex(i);
                      }}
                      className={`h-2 rounded-full transition-all ${i === currentImageIndex ? 'w-6 bg-earthOrange' : 'w-2 bg-slate-300'}`}
                      aria-label={`indicator-${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-serif text-3xl text-deepGreen mb-2">{selectedProduct.name}</h2>
                <p className="text-xs text-slate-500">{selectedProduct.category}</p>
              </div>
              <button
                onClick={() => setShowShareModal(true)}
                className="w-10 h-10 rounded-full bg-bioGreen/10 flex items-center justify-center hover:bg-bioGreen/20 transition-all"
              >
                <Share2 size={18} className="text-bioGreen" />
              </button>
            </div>

            <div className="bg-deepGreen/5 p-4 rounded-20 mb-6 border border-deepGreen/10">
              <h4 className="text-[10px] uppercase tracking-wider font-bold text-bioGreen mb-2">Ma Terre & Histoire</h4>
              <p className="text-sm text-slate-700 leading-relaxed mb-3">
                {selectedProduct.description || 'Description indisponible.'}
              </p>
              {loadingStory ? (
                <div className="animate-pulse flex space-y-2 flex-col">
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                  <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                </div>
              ) : (
                <p className="text-xs text-gray-700 leading-relaxed italic">"{story}"</p>
              )}
            </div>

            {readOnly ? (
              <div className="w-full bg-slate-100 text-slate-600 py-4 rounded-20 font-bold text-center text-sm border border-slate-200">
                Mode aperçu admin - commande désactivée
              </div>
            ) : (
              <button
                onClick={() => {
                  onAdd({
                    product_id: selectedProduct.id,
                    name: selectedProduct.name,
                    image: selectedProduct.images[0],
                    qty: 1,
                    price_at_purchase: selectedProduct.price_b2c
                  });
                  closeProductModal();
                }}
                className="w-full bg-earthOrange text-white py-4 rounded-20 font-bold text-lg shadow-xl shadow-earthOrange/20 active:scale-95 transition-transform"
              >
                Ajouter au panier - {selectedProduct.price_b2c} CDF
              </button>
            )}
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowShareModal(false)}></div>
          <div className="relative bg-white rounded-30 p-6 max-w-sm w-full animate-in zoom-in duration-300">
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <h3 className="font-serif text-2xl text-deepGreen mb-4">Partager ce produit</h3>

            <div className="bg-slate-100 p-4 rounded-20 mb-4 break-all">
              <p className="text-xs text-slate-600 font-mono">{generateShareLink()}</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={copyToClipboard}
                className="w-full bg-earthOrange text-white py-3 rounded-20 font-bold transition-transform active:scale-95"
              >
                Copier le lien
              </button>

              <button
                onClick={() => {
                  const link = generateShareLink();
                  if (navigator.share) {
                    navigator.share({
                      title: selectedProduct?.name,
                      text: `Découvrez ${selectedProduct?.name} sur JuingoBIO`,
                      url: link
                    });
                  }
                  setShowShareModal(false);
                }}
                className="w-full bg-bioGreen text-white py-3 rounded-20 font-bold transition-transform active:scale-95"
              >
                Partager via...
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default B2CMarketplace;
