
import React from 'react';
import { ArrowLeft, Trash2, ShoppingBag } from 'lucide-react';
import { OrderItem } from '../types';

interface CartViewProps {
  cart: OrderItem[];
  total: number;
  onRemove: (id: string) => void;
  onNav: (view: any) => void;
}

const CartView: React.FC<CartViewProps> = ({ cart, total, onRemove, onNav }) => {
  return (
    <div className="h-full bg-white flex flex-col animate-in fade-in duration-300">
      <div className="p-6 flex items-center justify-between">
        <button onClick={() => onNav('main')} className="w-10 h-10 glass rounded-full flex items-center justify-center text-deepGreen">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-serif text-2xl text-deepGreen">Votre Panier</h2>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-4 scrollbar-hide">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60 italic">
            <ShoppingBag size={48} className="mb-4" />
            <p>Le panier est vide</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.product_id} className="glass p-4 rounded-30 flex items-center gap-4 shadow-sm border border-slate-50">
              <img src={item.image} alt={item.name} className="w-16 h-16 rounded-20 object-cover" />
              <div className="flex-1">
                <h4 className="font-bold text-sm text-deepGreen">{item.name}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{item.qty} unités</p>
                <p className="text-bioGreen font-bold text-sm mt-1">{(item.qty * item.price_at_purchase).toFixed(2)} CDF</p>
              </div>
              <button onClick={() => onRemove(item.product_id)} className="text-red-400 p-2">
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      {cart.length > 0 && (
        <div className="p-8 bg-deepGreen rounded-t-[40px] shadow-2xl space-y-6">
          <div className="flex justify-between items-center text-white">
            <span className="opacity-60 text-sm font-medium">Récapitulatif</span>
            <span className="text-xs uppercase tracking-widest font-bold">Livraison: 0 CDF</span>
          </div>
          <div className="flex justify-between items-end text-white border-t border-white/10 pt-4">
            <span className="font-serif text-xl">Total TTC</span>
            <span className="text-3xl font-serif text-limeGreen">{total.toFixed(2)} CDF</span>
          </div>
          <button 
            onClick={() => onNav('payment')}
            className="w-full bg-earthOrange text-white py-5 rounded-20 font-bold text-lg shadow-xl shadow-earthOrange/20 active:scale-95 transition-all"
          >
            Valider la commande
          </button>
        </div>
      )}
    </div>
  );
};

export default CartView;
