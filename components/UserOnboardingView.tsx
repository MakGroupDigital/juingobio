import React, { useState, useEffect } from 'react';
import { ChevronRight, Phone, Building2, Home } from 'lucide-react';
import { getUserData } from '../services/firebaseService';

interface UserOnboardingViewProps {
  authUser: any;
  onComplete: (userData: any) => void;
}

const UserOnboardingView: React.FC<UserOnboardingViewProps> = ({ authUser, onComplete }) => {
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState<'B2C' | 'B2B' | null>(null);
  const [establishmentType, setEstablishmentType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  // Load user data from Firestore on mount
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
    };
    loadUserData();
  }, [authUser]);

  const establishmentTypes = [
    { id: 'restaurant', label: 'Restaurant', icon: '🍽️' },
    { id: 'hotel', label: 'Hôtel', icon: '🏨' },
    { id: 'cafe', label: 'Café/Bar', icon: '☕' },
    { id: 'catering', label: 'Catering', icon: '🍴' },
    { id: 'supermarket', label: 'Supermarché', icon: '🛒' },
    { id: 'other', label: 'Autre', icon: '🏢' }
  ];

  const handleComplete = async () => {
    if (!phone || !userType) return;

    setIsLoading(true);
    try {
      const completeUserData = {
        uid: authUser.uid,
        email: authUser.email || userData?.email,
        displayName: authUser.displayName || userData?.displayName,
        photoURL: authUser.photoURL || userData?.photoURL,
        phone,
        userType,
        establishmentType: userType === 'B2B' ? establishmentType : null,
        createdAt: userData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        onboardingCompleted: true
      };

      onComplete(completeUserData);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full bg-[#F9FBF9] flex flex-col">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-100">
        <h1 className="font-serif text-2xl text-deepGreen mb-2">Complétez votre profil</h1>
        <p className="text-sm text-slate-500">Quelques informations pour personnaliser votre expérience</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-6">
        {/* Phone Input */}
        <div className="bg-white rounded-20 p-6 border border-slate-100">
          <label className="block text-sm font-bold text-deepGreen mb-3">Numéro de téléphone</label>
          <div className="flex items-center gap-2 bg-slate-50 rounded-15 px-4 py-3 border border-slate-200">
            <Phone size={18} className="text-slate-400" />
            <input
              type="tel"
              placeholder="+243 123 456 789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 bg-transparent outline-none text-deepGreen placeholder-slate-400"
            />
          </div>
        </div>

        {/* User Type Selection */}
        <div className="bg-white rounded-20 p-6 border border-slate-100">
          <label className="block text-sm font-bold text-deepGreen mb-4">Vous êtes...</label>
          <div className="space-y-3">
            <button
              onClick={() => {
                setUserType('B2C');
                setEstablishmentType(null);
              }}
              className={`w-full p-4 rounded-15 border-2 transition-all flex items-center gap-3 ${
                userType === 'B2C'
                  ? 'border-bioGreen bg-bioGreen/5'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <Home size={24} className={userType === 'B2C' ? 'text-bioGreen' : 'text-slate-400'} />
              <div className="text-left">
                <p className="font-bold text-deepGreen">Ménage</p>
                <p className="text-xs text-slate-500">Particulier</p>
              </div>
              {userType === 'B2C' && (
                <div className="ml-auto w-5 h-5 rounded-full bg-bioGreen flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </button>

            <button
              onClick={() => setUserType('B2B')}
              className={`w-full p-4 rounded-15 border-2 transition-all flex items-center gap-3 ${
                userType === 'B2B'
                  ? 'border-earthOrange bg-earthOrange/5'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <Building2 size={24} className={userType === 'B2B' ? 'text-earthOrange' : 'text-slate-400'} />
              <div className="text-left">
                <p className="font-bold text-deepGreen">Établissement</p>
                <p className="text-xs text-slate-500">Restaurant, Hôtel, etc.</p>
              </div>
              {userType === 'B2B' && (
                <div className="ml-auto w-5 h-5 rounded-full bg-earthOrange flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Establishment Type - Only for B2B */}
        {userType === 'B2B' && (
          <div className="bg-white rounded-20 p-6 border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <label className="block text-sm font-bold text-deepGreen mb-4">Type d'établissement</label>
            <div className="grid grid-cols-2 gap-3">
              {establishmentTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setEstablishmentType(type.id)}
                  className={`p-4 rounded-15 border-2 transition-all text-center ${
                    establishmentType === type.id
                      ? 'border-earthOrange bg-earthOrange/5'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <p className="text-xs font-bold text-deepGreen">{type.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 bg-white border-t border-slate-100">
        <button
          onClick={handleComplete}
          disabled={!phone || !userType || (userType === 'B2B' && !establishmentType) || isLoading}
          className="w-full bg-earthOrange text-white py-4 rounded-20 font-bold text-lg shadow-xl shadow-earthOrange/20 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? 'Traitement...' : 'Continuer'}
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default UserOnboardingView;
