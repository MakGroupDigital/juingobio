import React, { useMemo, useState } from 'react';
import { Product, OrderItem } from '../../types';
import { PRODUCTS } from '../../constants';
import { ArrowLeft, ChevronLeft, ChevronRight, Package, ShoppingCart } from 'lucide-react';

interface B2BDashboardProps {
  onAdd: (item: OrderItem) => void;
  language?: 'fr' | 'en';
}

type B2BTier = '10kg' | '50kg';

const B2BDashboard: React.FC<B2BDashboardProps> = ({ onAdd, language = 'fr' }) => {
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedTier, setSelectedTier] = useState<B2BTier>('50kg');
  const [quantity, setQuantity] = useState(50);

  const filtered = useMemo(
    () => PRODUCTS.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentImageIndex(0);
    setSelectedTier('50kg');
    setQuantity(50);
  };

  const handleTierChange = (tier: B2BTier) => {
    setSelectedTier(tier);
    setQuantity(tier === '50kg' ? Math.max(50, quantity) : Math.max(10, quantity));
  };

  const addToCart = (product: Product, qty: number, tier: B2BTier) => {
    onAdd({
      product_id: product.id,
      name: product.name,
      image: product.images[0],
      qty,
      price_at_purchase: product.price_b2b_tier[tier]
    });
  };

  if (selectedProduct) {
    const unitPrice = selectedProduct.price_b2b_tier[selectedTier];
    const minQty = selectedTier === '50kg' ? 50 : 10;
    const safeQty = Math.max(minQty, quantity);
    const total = unitPrice * safeQty;

    return (
      <div className="h-full bg-[#F9FBF9] flex flex-col animate-in slide-in-from-right-10 duration-300">
        <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <button onClick={() => setSelectedProduct(null)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-deepGreen">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-serif text-lg text-deepGreen">{language === 'en' ? 'Product Details' : 'Détails du produit'}</h2>
          <div className="w-10 h-10"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="relative rounded-30 overflow-hidden h-56 bg-slate-100">
            <img
              src={selectedProduct.images[currentImageIndex]}
              alt={selectedProduct.name}
              className="w-full h-full object-cover"
            />
            {selectedProduct.images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev - 1 + selectedProduct.images.length) % selectedProduct.images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center"
                >
                  <ChevronLeft size={18} className="text-deepGreen" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev + 1) % selectedProduct.images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center"
                >
                  <ChevronRight size={18} className="text-deepGreen" />
                </button>
              </>
            )}
            <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded-full text-[10px] font-bold">
              {currentImageIndex + 1}/{selectedProduct.images.length}
            </div>
          </div>

          <div className="bg-white rounded-20 p-4 border border-slate-100">
            <h3 className="font-serif text-2xl text-deepGreen mb-1">{selectedProduct.name}</h3>
            <p className="text-xs text-slate-500 mb-3">{selectedProduct.category}</p>
            <p className="text-sm text-slate-600 leading-relaxed">{selectedProduct.description}</p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-deepGreen/10 text-deepGreen text-xs font-bold">
              <Package size={14} />
              {selectedProduct.stock > 0 ? (language === 'en' ? 'In stock' : 'En stock') : (language === 'en' ? 'Out of stock' : 'Rupture')}
            </div>
          </div>

          <div className="bg-white rounded-20 p-4 border border-slate-100">
            <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-3">
              {language === 'en' ? 'Bulk Tier' : 'Palier pro'}
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(['10kg', '50kg'] as B2BTier[]).map((tier) => (
                <button
                  key={tier}
                  onClick={() => handleTierChange(tier)}
                  className={`p-3 rounded-15 border text-left ${selectedTier === tier ? 'border-deepGreen bg-deepGreen text-white' : 'border-slate-200 bg-white text-deepGreen'}`}
                >
                  <p className="text-[11px] font-bold">{tier}</p>
                  <p className="text-sm font-bold">{selectedProduct.price_b2b_tier[tier]} CDF/kg</p>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between bg-slate-50 rounded-15 px-3 py-2">
              <span className="text-sm text-slate-600">{language === 'en' ? 'Quantity (kg)' : 'Quantité (kg)'}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity((q) => Math.max(minQty, q - minQty))}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-deepGreen"
                >
                  -
                </button>
                <span className="w-12 text-center font-bold text-deepGreen">{safeQty}</span>
                <button
                  onClick={() => setQuantity((q) => q + minQty)}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-deepGreen"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">{language === 'en' ? 'Estimated Total' : 'Total estimé'}</span>
            <span className="text-xl font-bold text-earthOrange">{total.toLocaleString()} CDF</span>
          </div>
          <button
            onClick={() => {
              addToCart(selectedProduct, safeQty, selectedTier);
              setSelectedProduct(null);
            }}
            disabled={selectedProduct.stock === 0}
            className="w-full py-3 rounded-20 bg-gradient-to-r from-deepGreen via-bioGreen to-earthOrange text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShoppingCart size={16} />
            {language === 'en' ? 'Add to Cart' : 'Ajouter au panier'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#F9FBF9] flex flex-col">
      <div className="p-4">
        <div className="rounded-30 p-5 bg-gradient-to-br from-deepGreen via-[#25584d] to-bioGreen text-white shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 right-0 w-24 h-24 bg-limeGreen/25 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-8 left-0 w-20 h-20 bg-earthOrange/20 rounded-full blur-2xl"></div>
          <div className="relative">
            <input
              type="text"
              placeholder={language === 'en' ? 'Search products...' : 'Rechercher un produit...'}
              className="w-full bg-white/95 border-none rounded-20 px-4 py-3 text-sm text-deepGreen focus:ring-2 focus:ring-limeGreen outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          {filtered.map((product, index) => (
            <div
              key={product.id}
              className="bg-white rounded-20 overflow-hidden border border-slate-100 hover:shadow-xl transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => openProduct(product)}
            >
              <div className="relative h-40 bg-slate-100 overflow-hidden">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 bg-deepGreen text-white px-2 py-1 rounded-full text-xs font-bold">
                  {product.stock > 0 ? (language === 'en' ? 'In stock' : 'En stock') : (language === 'en' ? 'Out' : 'Rupture')}
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-bold text-sm text-deepGreen mb-1 truncate">{product.name}</h3>
                <p className="text-xs text-slate-500 mb-3">{product.category}</p>
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-1">Tier 50kg</p>
                  <p className="text-lg font-bold text-earthOrange">{product.price_b2b_tier['50kg']} CDF/kg</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(product, 50, '50kg');
                  }}
                  disabled={product.stock === 0}
                  className="w-full bg-gradient-to-r from-deepGreen to-bioGreen text-white py-2 rounded-15 text-xs font-bold active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +50kg
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-slate-500 font-semibold mb-2">{language === 'en' ? 'No products found' : 'Aucun produit trouvé'}</p>
              <p className="text-xs text-slate-400">{language === 'en' ? 'Try another search' : 'Essayez une autre recherche'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default B2BDashboard;
