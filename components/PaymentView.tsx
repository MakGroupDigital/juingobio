import React, { useState } from 'react';
import { OrderItem } from '../types';
import { ChevronRight, Smartphone, CreditCard, Wallet } from 'lucide-react';

interface PaymentViewProps {
  cart: OrderItem[];
  total: number;
  onPaymentSuccess: (orderId: string) => void;
  onNav: (view: string) => void;
}

const PaymentView: React.FC<PaymentViewProps> = ({ cart, total, onPaymentSuccess, onNav }) => {
  const [selectedMethod, setSelectedMethod] = useState<'mobile' | 'debit' | 'credit' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    }
  ];

  const handlePayment = () => {
    if (!selectedMethod || isProcessing) return;

    setIsProcessing(true);

    // Optimistic flow: navigate immediately, backend confirmation can happen in background.
    const orderId = `ORD-${Date.now()}`;
    setShowConfirm(false);
    onPaymentSuccess(orderId);
    setIsProcessing(false);
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
                'Carte Crédit'
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
