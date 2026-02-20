
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Package, CreditCard, LogOut, Award, ShieldCheck } from 'lucide-react';
import { UserType } from '../types';
import { signOutUser, getUserData } from '../services/firebaseService';

interface ProfileViewProps {
  onNav: (view: any) => void;
  userMode: UserType | null;
  authUser?: any;
}

const ProfileView: React.FC<ProfileViewProps> = ({ onNav, userMode, authUser }) => {
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      if (authUser?.uid) {
        try {
          const data = await getUserData(authUser.uid);
          setUserData(data);
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }
      setIsLoading(false);
    };
    loadUserData();
  }, [authUser]);

  const handleLogout = async () => {
    try {
      await signOutUser();
      window.location.reload();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const userName = userData?.displayName || authUser?.displayName || (userMode === 'B2B' ? 'Hôtel de la Ville' : 'Jean Dupont');
  const userEmail = userData?.email || authUser?.email || '';
  const photoURL = userData?.photoURL || authUser?.photoURL;

  return (
    <div className="h-full bg-white flex flex-col animate-in slide-in-from-right-10 duration-300">
      <div className="p-6 flex items-center justify-between">
        <button onClick={() => onNav('main')} className="w-10 h-10 glass rounded-full flex items-center justify-center text-deepGreen">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-serif text-2xl text-deepGreen">Mon Profil</h2>
        <button onClick={() => onNav('settings')} className="w-10 h-10 glass rounded-full flex items-center justify-center text-deepGreen">
          <Settings size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-10 scrollbar-hide">
        <div className="text-center py-8">
          <div className="relative inline-block">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-deepGreen/10 shadow-xl mb-4 p-1">
              {photoURL ? (
                <img src={photoURL} className="w-full h-full rounded-full bg-slate-50 object-cover" alt="Avatar" />
              ) : (
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userMode}Premium`} className="w-full h-full rounded-full bg-slate-50" alt="Avatar" />
              )}
            </div>
            <div className="absolute bottom-6 right-2 bg-limeGreen text-deepGreen p-1.5 rounded-full border-4 border-white">
              <Award size={16} />
            </div>
          </div>
          <h3 className="font-serif text-3xl text-deepGreen">{userName}</h3>
          {userEmail && <p className="text-xs text-slate-500 mt-1">{userEmail}</p>}
          <div className="flex items-center justify-center gap-2 mt-2">
            <ShieldCheck size={14} className="text-bioGreen" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-bioGreen">Membre Premium Juingo</span>
          </div>
        </div>

        <div className="space-y-4">
          <button className="w-full glass p-5 rounded-20 flex items-center gap-4 hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 bg-deepGreen text-white rounded-full flex items-center justify-center">
              <Package size={20} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-sm text-deepGreen">Commandes récentes</p>
              <p className="text-[10px] text-slate-400">Suivre ou re-commander</p>
            </div>
          </button>

          <button className="w-full glass p-5 rounded-20 flex items-center gap-4 hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 bg-deepGreen/5 text-deepGreen rounded-full flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-sm text-deepGreen">Méthodes de paiement</p>
              <p className="text-[10px] text-slate-400">Visa •••• 4521</p>
            </div>
          </button>

          <div className="pt-10">
            <button 
              onClick={handleLogout}
              className="w-full py-5 rounded-20 bg-red-50 text-red-500 font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <LogOut size={18} />
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
