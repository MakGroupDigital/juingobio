
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Truck, Check, Bell } from 'lucide-react';

interface TrackingViewProps {
  onNav: (view: any) => void;
}

const TrackingView: React.FC<TrackingViewProps> = ({ onNav }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => (p < 100 ? p + 1 : 100));
    }, 400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-full bg-slate-100 flex flex-col relative overflow-hidden">
      {/* Simple Simulated Map Background */}
      <div className="absolute inset-0 bg-[#e5e7eb]">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#1A3C34 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        {/* Route visualization */}
        <svg className="absolute inset-0 w-full h-full">
          <path 
            d={`M 80 700 L ${80 + progress * 2.5} ${700 - progress * 4.5}`} 
            stroke="#4CAF50" 
            strokeWidth="4" 
            fill="none" 
            strokeDasharray="8 8" 
          />
        </svg>
        {/* Truck Marker */}
        <div 
          className="absolute w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 z-10 border-2 border-bioGreen"
          style={{ left: `${80 + progress * 2.5}px`, top: `${700 - progress * 4.5}px`, transform: 'translate(-50%, -50%)' }}
        >
          <Truck size={20} className="text-deepGreen" />
        </div>
      </div>

      <div className="relative z-20 p-6">
        <button onClick={() => onNav('main')} className="w-10 h-10 glass rounded-full flex items-center justify-center text-deepGreen">
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="mt-auto relative z-20 p-6">
        <div className="glass border-white p-8 rounded-[40px] shadow-2xl animate-in slide-in-from-bottom-full duration-500">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
          
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="font-serif text-2xl text-deepGreen">En livraison</h3>
              <p className="text-bioGreen font-bold text-xs uppercase tracking-widest mt-1">Arrivée dans {Math.max(2, 25 - Math.floor(progress/4))} minutes</p>
            </div>
            <div className="bg-limeGreen/20 text-deepGreen px-3 py-1 rounded-full text-[10px] font-bold">
              ID: #JB-742
            </div>
          </div>

          <div className="bg-deepGreen/5 p-5 rounded-30 border border-deepGreen/10 flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Benoit" alt="Livreur" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-deepGreen">Benoit (Le Domaine)</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Toyota Hilux • 4.98 ★</p>
            </div>
            <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-earthOrange">
              <Bell size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-bioGreen flex items-center justify-center">
                <Check size={12} className="text-white" />
              </div>
              <span className="text-xs font-bold text-deepGreen">Récolte et emballage validés</span>
            </div>
            <div className="flex items-center gap-3 opacity-40">
              <div className="w-5 h-5 rounded-full border-2 border-bioGreen"></div>
              <span className="text-xs font-bold text-slate-400">Arrivée prévue à Kinshasa Gombe</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingView;
