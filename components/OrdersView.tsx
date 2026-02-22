import React from 'react';
import { Order } from '../types';
import { ChevronRight, Truck, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface OrdersViewProps {
  onNav: (view: string) => void;
  onSelectOrder: (order: Order) => void;
  orders: Order[];
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'En attente',
    processing: 'En traitement',
    delivering: 'En route',
    completed: 'Livré'
  };
  return labels[status] || status;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600',
    processing: 'bg-bioGreen/10 text-bioGreen',
    delivering: 'bg-earthOrange/10 text-earthOrange',
    completed: 'bg-deepGreen/10 text-deepGreen'
  };
  return colors[status] || 'bg-slate-100 text-slate-600';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock size={16} />;
    case 'processing':
      return <AlertCircle size={16} />;
    case 'delivering':
      return <Truck size={16} />;
    case 'completed':
      return <CheckCircle size={16} />;
    default:
      return null;
  }
};

const OrdersView: React.FC<OrdersViewProps> = ({ onNav, onSelectOrder, orders }) => {
  const sortedOrders = [...orders].sort((a, b) => b.created_at - a.created_at);

  return (
    <div className="h-full bg-[#F9FBF9] flex flex-col">
      <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center">
        <button onClick={() => onNav('main')} className="text-deepGreen">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <h1 className="font-serif text-xl text-deepGreen">Mes Commandes</h1>
        <div className="w-6"></div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {sortedOrders.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <Truck size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-semibold mb-2">Aucune commande pour le moment</p>
              <p className="text-xs text-slate-400">Vos commandes apparaîtront ici</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {sortedOrders.map((order, index) => (
              <div
                key={order.id}
                className="bg-white rounded-20 p-4 border border-slate-100 cursor-pointer hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => onSelectOrder(order)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold">Commande #{order.id}</p>
                    <p className="text-sm font-bold text-deepGreen mt-1">{order.items.length} article(s)</p>
                  </div>
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span>{getStatusLabel(order.status)}</span>
                  </div>
                </div>

                <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
                  {order.items.slice(0, 3).map((item, i) => (
                    <img
                      key={`${order.id}-item-${i}`}
                      src={item.image}
                      alt={item.name}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ))}
                  {order.items.length > 3 && (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>

                {order.status === 'delivering' && (
                  <div className="mb-3">
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-earthOrange rounded-full animate-pulse" style={{ width: '65%' }}></div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Livraison en cours</p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <span className="text-sm font-bold text-deepGreen">{order.total_ttc.toFixed(2)} CDF</span>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersView;
