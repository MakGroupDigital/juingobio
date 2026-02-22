import React, { useEffect, useState } from 'react';
import { OrderItem } from '../types';
import { ChevronRight, Smartphone, CreditCard, Wallet, MapPin } from 'lucide-react';
import { geocodeAddress, reverseGeocode } from '../services/geocodingService';

interface PaymentViewProps {
  cart: OrderItem[];
  total: number;
  onPaymentSuccess: (payload: {
    method: 'mobile' | 'debit' | 'credit' | 'cash_on_delivery';
    paymentStatus: 'paid' | 'due_on_delivery';
    deliveryAddress: string;
    deliveryLat: number;
    deliveryLng: number;
  }) => void;
  onNav: (view: string) => void;
}

const PaymentView: React.FC<PaymentViewProps> = ({ cart, total, onPaymentSuccess, onNav }) => {
  const [selectedMethod, setSelectedMethod] = useState<'mobile' | 'debit' | 'credit' | 'cash_on_delivery' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("La geolocalisation n'est pas supportee sur cet appareil.");
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setDeliveryCoords({ lat, lng });
        const reverse = await reverseGeocode(lat, lng);
        if (reverse && !deliveryAddress.trim()) {
          setDeliveryAddress(reverse);
        }
        setIsLocating(false);
      },
      () => {
        setLocationError("Acces localisation refuse. Entrez votre adresse, on calculera les coordonnees automatiquement.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  useEffect(() => {
    requestLocation();
    // Intentional one-time prompt when entering checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paymentMethods = [
    {
      id: 'mobile',
      name: 'Mobile Money',
      icon: Smartphone,
      description: 'Airtel Money, Vodacom Cash, Orange Money',
      color: 'bg-bioGreen/10 border-bioGreen'
    },
    {
      id: 'debit',
      name: 'Carte Débit',
      icon: CreditCard,
      description: 'Visa Débit, Mastercard Débit',
      color: 'bg-earthOrange/10 border-earthOrange'
    },
    {
      id: 'credit',
      name: 'Carte Crédit',
      icon: CreditCard,
      description: 'Visa, Mastercard, American Express',
      color: 'bg-deepGreen/10 border-deepGreen'
    },
    {
      id: 'cash_on_delivery',
      name: 'Paiement à la livraison',
      icon: Wallet,
      description: 'Payez en cash/mobile lors de la réception',
      color: 'bg-slate-100 border-slate-500'
    }
  ];

  const handlePayment = () => {
    if (!selectedMethod || isProcessing) return;
    if (!deliveryAddress.trim()) {
      setLocationError('Veuillez renseigner votre adresse de livraison.');
      return;
    }

    setIsProcessing(true);
    void (async () => {
      let coords = deliveryCoords;
      if (!coords) {
        coords = await geocodeAddress(deliveryAddress);
      }
      if (!coords) {
        setLocationError("Impossible de determiner les coordonnees GPS. Verifiez l'adresse.");
        setIsProcessing(false);
        return;
      }

      const paymentStatus = selectedMethod === 'cash_on_delivery' ? 'due_on_delivery' : 'paid';
      setShowConfirm(false);
      onPaymentSuccess({
        method: selectedMethod,
        paymentStatus,
        deliveryAddress: deliveryAddress.trim(),
        deliveryLat: coords.lat,
        deliveryLng: coords.lng
      });
      setIsProcessing(false);
    })();
  };

  return (
    <div className="h-full bg-[#F9FBF9] flex flex-col">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center">
        <button onClick={() => onNav('cart')} className="text-deepGreen">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <h1 className="font-serif text-xl text-deepGreen">Paiement</h1>
        <div className="w-6"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Order Summary */}
        <div className="p-6 bg-white border-b border-slate-100">
          <h3 className="font-bold text-deepGreen mb-4">Résumé de la commande</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{cart.length} article(s)</span>
              <span className="font-semibold text-deepGreen">{total.toFixed(2)} CDF</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Livraison</span>
              <span className="font-semibold text-deepGreen">0 CDF</span>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 flex justify-between">
            <span className="font-bold text-deepGreen">Total TTC</span>
            <span className="font-bold text-earthOrange text-lg">{total.toFixed(2)} CDF</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="p-6 bg-white border-b border-slate-100">
          <h3 className="font-bold text-deepGreen mb-3">Adresse de livraison</h3>
          <div className="space-y-2 mb-6">
            <textarea
              className="w-full bg-slate-50 rounded-15 px-4 py-3 text-sm outline-none border border-slate-200"
              placeholder="Ex: 15 Avenue de la Paix, Gombe, Kinshasa"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              rows={3}
            />
            <button
              onClick={requestLocation}
              type="button"
              className="w-full h-11 rounded-12 bg-slate-100 text-deepGreen text-sm font-semibold flex items-center justify-center gap-2"
            >
              <MapPin size={16} />
              {isLocating ? 'Localisation en cours...' : 'Utiliser ma position actuelle'}
            </button>
            {deliveryCoords && (
              <p className="text-[11px] text-slate-500">
                GPS detecte: {deliveryCoords.lat.toFixed(6)}, {deliveryCoords.lng.toFixed(6)}
              </p>
            )}
            {locationError && <p className="text-[11px] text-red-500 font-semibold">{locationError}</p>}
          </div>

          <h3 className="font-bold text-deepGreen mb-4">Choisir un moyen de paiement</h3>
          <div className="space-y-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;
              
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id as any)}
                  className={`w-full p-4 rounded-20 border-2 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 ${
                    isSelected
                      ? `${method.color} border-2 border-current shadow-lg`
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-white/50' : 'bg-slate-100'
                    }`}>
                      <Icon size={24} className={isSelected ? 'text-deepGreen' : 'text-slate-600'} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-deepGreen">{method.name}</p>
                      <p className="text-xs text-slate-500">{method.description}</p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-bioGreen flex items-center justify-center">
                        <span className="text-white font-bold">✓</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Security Info */}
        <div className="p-6 bg-bioGreen/5 border-b border-bioGreen/20 mx-6 mt-6 rounded-20">
          <p className="text-xs text-slate-600 text-center">
            🔒 Vos données de paiement sont sécurisées et chiffrées
          </p>
        </div>
      </div>

      {/* Footer */}
      {selectedMethod && (
        <div className="p-6 bg-white border-t border-slate-100">
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full bg-earthOrange text-white py-4 rounded-20 font-bold text-lg shadow-xl shadow-earthOrange/20 active:scale-95 transition-transform"
          >
            Confirmer le paiement
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isProcessing && setShowConfirm(false)}></div>
          <div className="relative bg-white rounded-30 p-6 max-w-sm w-full animate-in zoom-in duration-300">
            <h3 className="font-serif text-2xl text-deepGreen mb-2">Confirmer le paiement</h3>
            <p className="text-slate-600 text-sm mb-6">
              Vous êtes sur le point de payer <span className="font-bold text-earthOrange">{total.toFixed(2)} CDF</span> via {
                selectedMethod === 'mobile' ? 'Mobile Money' :
                selectedMethod === 'debit' ? 'Carte Débit' :
                selectedMethod === 'credit' ? 'Carte Crédit' :
                'Paiement à la livraison'
              }
            </p>

            <div className="space-y-3">
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-earthOrange text-white py-3 rounded-20 font-bold transition-transform active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? 'Traitement...' : 'Confirmer'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isProcessing}
                className="w-full bg-slate-100 text-deepGreen py-3 rounded-20 font-bold transition-transform active:scale-95 disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentView;
