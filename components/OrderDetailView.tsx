import React, { useEffect, useRef } from 'react';
import { Order } from '../types';
import { ChevronRight, Home, Bike, Clock, Phone, Download } from 'lucide-react';
import { downloadOrderDocumentAsJpg } from '../services/orderDocumentService';

interface OrderDetailViewProps {
  order: Order;
  onNav: (view: string) => void;
}

const OrderDetailView: React.FC<OrderDetailViewProps> = ({ order, onNav }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const calcEtaMinutes = () => {
    if (
      typeof order.delivery_lat !== 'number' ||
      typeof order.delivery_lng !== 'number' ||
      typeof order.driver_lat !== 'number' ||
      typeof order.driver_lng !== 'number'
    ) {
      return 20;
    }
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(order.delivery_lat - order.driver_lat);
    const dLng = toRad(order.delivery_lng - order.driver_lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(order.driver_lat)) * Math.cos(toRad(order.delivery_lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const distanceKm = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    const minutes = Math.round((distanceKm / 28) * 60);
    return Math.max(2, minutes);
  };
  const etaMinutes = calcEtaMinutes();

  useEffect(() => {
    // Initialize Leaflet map with OpenStreetMap
    if (mapContainer.current && order.status === 'delivering' && order.delivery_lat && order.delivery_lng) {
      // Load Leaflet CSS and JS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      script.async = true;
      script.onload = () => {
        const L = (window as any).L;
        
        // Create map
        const map = L.map(mapContainer.current).setView(
          [order.delivery_lat, order.delivery_lng],
          14
        );

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        // Custom icons
        const driverIcon = L.divIcon({
          html: `<div style="background: #FF9800; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🏍</div>`,
          iconSize: [40, 40],
          className: 'driver-icon'
        });

        const destinationIcon = L.divIcon({
          html: `<div style="background: #1A3C34; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🏠</div>`,
          iconSize: [40, 40],
          className: 'destination-icon'
        });

        // Add destination marker
        L.marker([order.delivery_lat, order.delivery_lng], { icon: destinationIcon })
          .bindPopup('<strong>Destination</strong><br>Votre adresse de livraison')
          .addTo(map);

        // Add driver marker
        if (order.driver_lat && order.driver_lng) {
          L.marker([order.driver_lat, order.driver_lng], { icon: driverIcon })
            .bindPopup(`<strong>${order.driver_name || 'Livreur'}</strong><br>Moto JuingoBIO`)
            .addTo(map);

          // Draw route line
          const routeLine = L.polyline(
            [[order.driver_lat, order.driver_lng], [order.delivery_lat, order.delivery_lng]],
            { color: '#FF9800', weight: 3, opacity: 0.7, dashArray: '5, 5' }
          ).addTo(map);

          // Fit bounds
          map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
        }
      };
      document.head.appendChild(script);
    }
  }, [order.status, order.delivery_lat, order.delivery_lng, order.driver_lat, order.driver_lng]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'En attente',
      processing: 'En traitement',
      delivering: 'En route',
      completed: 'Livré'
    };
    return labels[status] || status;
  };

  const getProgressPercentage = (status: string) => {
    const progress: Record<string, number> = {
      pending: 25,
      processing: 50,
      delivering: 75,
      completed: 100
    };
    return progress[status] || 0;
  };

  const isInvoice = order.payment_status === 'due_on_delivery' || order.payment_method === 'cash_on_delivery';
  const paymentMethodLabel = order.payment_method === 'cash_on_delivery'
    ? 'Paiement a la livraison'
    : order.payment_method === 'mobile'
      ? 'Mobile Money'
      : order.payment_method === 'debit'
        ? 'Carte Debit'
        : order.payment_method === 'credit'
          ? 'Carte Credit'
          : 'Non specifie';

  return (
    <div className="h-full bg-[#F9FBF9] flex flex-col">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center">
        <button onClick={() => onNav('orders')} className="text-deepGreen">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <h1 className="font-serif text-lg text-deepGreen">Commande #{order.id}</h1>
        <div className="w-6"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Map Section - Only for delivering */}
        {order.status === 'delivering' && (
          <div className="bg-white border-b border-slate-100">
            <div ref={mapContainer} className="w-full h-80 bg-slate-100" />
            
            {/* Driver Info */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-earthOrange/20 flex items-center justify-center">
                  <Bike size={24} className="text-earthOrange" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-deepGreen">{order.driver_name || 'Livreur'}</p>
                  <p className="text-xs text-slate-500">Moto JuingoBIO{order.driver_phone ? ` • ${order.driver_phone}` : ''}</p>
                </div>
                <button className="w-10 h-10 rounded-full bg-bioGreen text-white flex items-center justify-center">
                  <Phone size={18} />
                </button>
              </div>
              
              {/* ETA */}
              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className="text-earthOrange" />
                <span className="font-semibold text-deepGreen">Livraison dans ~{etaMinutes} minutes</span>
              </div>
            </div>
          </div>
        )}

        {/* Progress Timeline */}
        <div className="p-6 bg-white border-b border-slate-100">
          <h3 className="font-bold text-deepGreen mb-4">Progression</h3>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-bioGreen to-earthOrange transition-all duration-500"
                style={{ width: `${getProgressPercentage(order.status)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 text-center">{getStatusLabel(order.status)}</p>
          </div>

          {/* Timeline Steps */}
          <div className="space-y-4">
            {[
              { label: 'Commande confirmée', status: 'pending', icon: '✓' },
              { label: 'En préparation', status: 'processing', icon: '⚙' },
              { label: 'En livraison', status: 'delivering', icon: '🏍' },
              { label: 'Livré', status: 'completed', icon: '✓' }
            ].map((step, i) => {
              const isActive = ['pending', 'processing', 'delivering', 'completed'].indexOf(order.status) >= i;
              const isCurrent = step.status === order.status;
              
              return (
                <div key={step.status} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isActive ? 'bg-bioGreen text-white' : 'bg-slate-200 text-slate-400'
                    } ${isCurrent ? 'ring-2 ring-earthOrange ring-offset-2' : ''}`}>
                      {step.icon}
                    </div>
                    {i < 3 && (
                      <div className={`w-0.5 h-8 ${isActive ? 'bg-bioGreen' : 'bg-slate-200'}`} />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className={`font-semibold ${isActive ? 'text-deepGreen' : 'text-slate-400'}`}>
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="p-6 bg-white border-b border-slate-100">
          <h3 className="font-bold text-deepGreen mb-3">Adresse de livraison</h3>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-deepGreen/10 flex items-center justify-center flex-shrink-0">
              <Home size={20} className="text-deepGreen" />
            </div>
            <div>
              <p className="text-sm font-semibold text-deepGreen">{order.delivery_address}</p>
              <p className="text-xs text-slate-500 mt-1">Livraison à domicile</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-b border-slate-100">
          <h3 className="font-bold text-deepGreen mb-3">Paiement</h3>
          <div className="rounded-20 bg-slate-50 border border-slate-100 p-4">
            <p className="text-sm text-slate-600">
              Mode: <span className="font-semibold text-deepGreen">{paymentMethodLabel}</span>
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Statut: <span className={`font-semibold ${isInvoice ? 'text-earthOrange' : 'text-bioGreen'}`}>
                {isInvoice ? 'A payer a la livraison' : 'Deja paye'}
              </span>
            </p>
            <button
              onClick={() => void downloadOrderDocumentAsJpg(order)}
              className="mt-4 w-full bg-deepGreen text-white py-3 rounded-15 font-bold text-sm flex items-center justify-center gap-2"
            >
              <Download size={16} />
              {isInvoice ? 'Telecharger la facture (JPG)' : 'Telecharger le recu (JPG)'}
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="p-6 bg-white border-b border-slate-100">
          <h3 className="font-bold text-deepGreen mb-4">Articles</h3>
          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0">
                <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-deepGreen">{item.name}</p>
                  <p className="text-xs text-slate-500">Qty: {item.qty}</p>
                </div>
                <p className="text-sm font-bold text-earthOrange">{item.qty * item.price_at_purchase} CDF</p>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="p-6 bg-white">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Sous-total HT</span>
              <span className="font-semibold text-deepGreen">{order.total_ht} CDF</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">TVA</span>
              <span className="font-semibold text-deepGreen">{(order.total_ttc - order.total_ht).toFixed(2)} CDF</span>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 flex justify-between">
            <span className="font-bold text-deepGreen">Total TTC</span>
            <span className="font-bold text-earthOrange text-lg">{order.total_ttc} CDF</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailView;
