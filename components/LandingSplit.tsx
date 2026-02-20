
import React from 'react';
import { UserType } from '../types';

interface LandingSplitProps {
  onSelect: (type: UserType) => void;
}

const LandingSplit: React.FC<LandingSplitProps> = ({ onSelect }) => {
  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-white">
      {/* Logo Overlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-full shadow-2xl border border-white">
          <h1 className="font-serif text-4xl text-deepGreen tracking-tight">JB.</h1>
        </div>
      </div>

      {/* Top Section - B2B */}
      <div 
        onClick={() => onSelect('B2B')}
        className="flex-1 bg-deepGreen relative group cursor-pointer overflow-hidden transition-all duration-700 hover:flex-[1.2]"
      >
        <div className="absolute inset-0 opacity-40 bg-[url('https://picsum.photos/seed/restaurant/800/1200')] bg-cover bg-center transition-transform duration-[3s] group-hover:scale-110"></div>
        <div className="relative h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-black/20 to-transparent">
          <h2 className="font-serif text-4xl text-white mb-2">Établissements</h2>
          <p className="text-bioGreen font-medium text-sm tracking-widest uppercase">Efficacité & Volume</p>
          <div className="mt-4 bg-white/20 px-4 py-2 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            Hôtels, Restaurants, Cafés
          </div>
        </div>
      </div>

      {/* Bottom Section - B2C */}
      <div 
        onClick={() => onSelect('B2C')}
        className="flex-1 bg-bioGreen relative group cursor-pointer overflow-hidden transition-all duration-700 hover:flex-[1.2]"
      >
        <div className="absolute inset-0 opacity-40 bg-[url('https://picsum.photos/seed/family/800/1200')] bg-cover bg-center transition-transform duration-[3s] group-hover:scale-110"></div>
        <div className="relative h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-t from-black/20 to-transparent">
          <p className="text-deepGreen font-medium text-sm tracking-widest uppercase mb-2">Terroir & Cuisine</p>
          <h2 className="font-serif text-4xl text-white">Ménages</h2>
          <div className="mt-4 bg-black/10 px-4 py-2 rounded-full text-deepGreen text-xs opacity-0 group-hover:opacity-100 transition-opacity font-bold">
            Particuliers & Familles
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingSplit;
