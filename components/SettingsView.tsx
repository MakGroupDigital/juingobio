import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Building2, Home, MapPin, Save, Smartphone, CreditCard, SlidersHorizontal } from 'lucide-react';
import { AppPreferences, UserType } from '../types';
import { getUserData, saveUserData } from '../services/firebaseService';
import {
  isNativeNotificationSupported,
  requestNativeNotificationPermission,
  sendNativeTestNotification
} from '../services/notificationService';

interface SettingsViewProps {
  onNav: (view: any) => void;
  authUser?: any;
  userMode: UserType | null;
  onUserModeChange: (mode: UserType) => void;
  onAppPreferencesChange: (preferences: AppPreferences) => void;
  onNotify: (message: string) => void;
}

type PreferredPayment = 'mobile' | 'debit' | 'credit';

interface AppSettings {
  displayName: string;
  phone: string;
  userType: UserType;
  establishmentName: string;
  establishmentType: string;
  deliveryAddress: string;
  preferredPayment: PreferredPayment;
  notifications: {
    orders: boolean;
    promos: boolean;
    stock: boolean;
  };
  appPreferences: {
    language: 'fr' | 'en';
    reducedMotion: boolean;
    dataSaver: boolean;
  };
}

const STORAGE_KEY = 'juingobio-settings';

const SettingsView: React.FC<SettingsViewProps> = ({
  onNav,
  authUser,
  userMode,
  onUserModeChange,
  onAppPreferencesChange,
  onNotify
}) => {
  const [settings, setSettings] = useState<AppSettings>({
    displayName: '',
    phone: '',
    userType: userMode || 'B2C',
    establishmentName: '',
    establishmentType: '',
    deliveryAddress: '',
    preferredPayment: 'mobile',
    notifications: {
      orders: true,
      promos: true,
      stock: true
    },
    appPreferences: {
      language: 'fr',
      reducedMotion: false,
      dataSaver: false
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [nativePermission, setNativePermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const localRaw = localStorage.getItem(STORAGE_KEY);
        const localSettings = localRaw ? JSON.parse(localRaw) : null;

        const baseSettings: AppSettings = {
          displayName: authUser?.displayName || '',
          phone: '',
          userType: userMode || 'B2C',
          establishmentName: '',
          establishmentType: '',
          deliveryAddress: '',
          preferredPayment: 'mobile',
          notifications: {
            orders: true,
            promos: true,
            stock: true
          },
          appPreferences: {
            language: 'fr',
            reducedMotion: false,
            dataSaver: false
          }
        };

        let merged = localSettings ? { ...baseSettings, ...localSettings } : baseSettings;

        if (authUser?.uid) {
          const remoteData = await getUserData(authUser.uid);
          if (remoteData) {
            merged = {
              ...merged,
              displayName: remoteData.displayName || merged.displayName,
              phone: remoteData.phone || merged.phone,
              userType: remoteData.userType || merged.userType,
              establishmentName: remoteData.establishmentName || merged.establishmentName,
              establishmentType: remoteData.establishmentType || merged.establishmentType,
              deliveryAddress: remoteData.delivery_address || merged.deliveryAddress,
              preferredPayment: remoteData.preferences?.preferredPayment || merged.preferredPayment,
              notifications: {
                orders: remoteData.preferences?.notifications?.orders ?? merged.notifications.orders,
                promos: remoteData.preferences?.notifications?.promos ?? merged.notifications.promos,
                stock: remoteData.preferences?.notifications?.stock ?? merged.notifications.stock
              },
              appPreferences: {
                language: remoteData.preferences?.app?.language || merged.appPreferences.language,
                reducedMotion: remoteData.preferences?.app?.reducedMotion ?? merged.appPreferences.reducedMotion,
                dataSaver: remoteData.preferences?.app?.dataSaver ?? merged.appPreferences.dataSaver
              }
            };
          }
        }

        setSettings(merged);
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings();
  }, [authUser, userMode]);

  useEffect(() => {
    if (isNativeNotificationSupported()) {
      setNativePermission(Notification.permission);
    }
  }, []);

  const updateField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateNotification = (key: keyof AppSettings['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }));
  };

  const updateAppPreference = (key: keyof AppSettings['appPreferences'], value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      appPreferences: { ...prev.appPreferences, [key]: value }
    }));
  };

  const handleSave = () => {
    setIsSaving(true);

    const nextMode = settings.userType;
    onUserModeChange(nextMode);
    onAppPreferencesChange(settings.appPreferences);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    localStorage.setItem('juingobio-user-mode', nextMode);

    if (authUser?.uid) {
      const payload = {
        uid: authUser.uid,
        email: authUser.email || '',
        photoURL: authUser.photoURL || '',
        displayName: settings.displayName || authUser.displayName || '',
        phone: settings.phone,
        userType: settings.userType,
        establishmentName: settings.userType === 'B2B' ? settings.establishmentName : null,
        establishmentType: settings.userType === 'B2B' ? settings.establishmentType : null,
        delivery_address: settings.deliveryAddress,
        preferences: {
          preferredPayment: settings.preferredPayment,
          notifications: settings.notifications,
          app: settings.appPreferences
        },
        updatedAt: new Date().toISOString()
      };

      void saveUserData(payload)
        .then(() => {
          onNotify('Paramètres sauvegardés');
        })
        .catch(() => {
          onNotify('Sauvegarde locale faite, sync cloud en attente');
        })
        .finally(() => {
          setIsSaving(false);
          onNav('profile');
        });
      return;
    }

    onNotify('Paramètres sauvegardés');
    setIsSaving(false);
    onNav('profile');
  };

  const handleEnableNativeNotifications = async () => {
    const permission = await requestNativeNotificationPermission();
    setNativePermission(permission);
    if (permission === 'granted') {
      sendNativeTestNotification('JuingoBIO', "Les notifications natives sont activées.");
      onNotify('Notifications natives activées');
    } else {
      onNotify('Notifications refusées');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full bg-white flex items-center justify-center">
        <p className="text-sm text-slate-500">Chargement des paramètres...</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#F9FBF9] flex flex-col animate-in slide-in-from-right-10 duration-300">
      <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between">
        <button onClick={() => onNav('profile')} className="w-10 h-10 glass rounded-full flex items-center justify-center text-deepGreen">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-serif text-xl text-deepGreen">Paramètres</h1>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-10 h-10 rounded-full bg-earthOrange text-white flex items-center justify-center disabled:opacity-50"
        >
          <Save size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide">
        <div className="bg-white rounded-20 p-5 border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Compte</p>
          <label className="text-xs text-slate-500">Nom affiché</label>
          <input
            value={settings.displayName}
            onChange={(e) => updateField('displayName', e.target.value)}
            className="w-full mt-1 mb-3 bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
            placeholder="Votre nom"
          />
          <label className="text-xs text-slate-500">Téléphone</label>
          <input
            value={settings.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            className="w-full mt-1 bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
            placeholder="+243..."
          />
        </div>

        <div className="bg-white rounded-20 p-5 border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Mode utilisateur</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => updateField('userType', 'B2C')}
              className={`p-3 rounded-15 border-2 flex items-center justify-center gap-2 ${settings.userType === 'B2C' ? 'border-bioGreen bg-bioGreen/5' : 'border-slate-200'}`}
            >
              <Home size={16} className="text-bioGreen" />
              <span className="text-sm font-semibold text-deepGreen">Ménage</span>
            </button>
            <button
              onClick={() => updateField('userType', 'B2B')}
              className={`p-3 rounded-15 border-2 flex items-center justify-center gap-2 ${settings.userType === 'B2B' ? 'border-earthOrange bg-earthOrange/5' : 'border-slate-200'}`}
            >
              <Building2 size={16} className="text-earthOrange" />
              <span className="text-sm font-semibold text-deepGreen">Établissement</span>
            </button>
          </div>
          {settings.userType === 'B2B' && (
            <div className="mt-3 space-y-2">
              <input
                value={settings.establishmentName}
                onChange={(e) => updateField('establishmentName', e.target.value)}
                className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                placeholder="Nom de l'établissement"
              />
              <input
                value={settings.establishmentType}
                onChange={(e) => updateField('establishmentType', e.target.value)}
                className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
                placeholder="Type: Restaurant, Hôtel..."
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-20 p-5 border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Livraison</p>
          <div className="flex items-center gap-2 mb-2 text-slate-500">
            <MapPin size={16} />
            <span className="text-xs">Adresse par défaut</span>
          </div>
          <input
            value={settings.deliveryAddress}
            onChange={(e) => updateField('deliveryAddress', e.target.value)}
            className="w-full bg-slate-50 rounded-12 px-3 py-2 text-sm outline-none"
            placeholder="Rue, commune, ville"
          />
        </div>

        <div className="bg-white rounded-20 p-5 border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Paiement préféré</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => updateField('preferredPayment', 'mobile')}
              className={`p-3 rounded-12 border flex flex-col items-center gap-1 ${settings.preferredPayment === 'mobile' ? 'border-bioGreen bg-bioGreen/5' : 'border-slate-200'}`}
            >
              <Smartphone size={16} className="text-bioGreen" />
              <span className="text-[11px]">Mobile</span>
            </button>
            <button
              onClick={() => updateField('preferredPayment', 'debit')}
              className={`p-3 rounded-12 border flex flex-col items-center gap-1 ${settings.preferredPayment === 'debit' ? 'border-earthOrange bg-earthOrange/5' : 'border-slate-200'}`}
            >
              <CreditCard size={16} className="text-earthOrange" />
              <span className="text-[11px]">Débit</span>
            </button>
            <button
              onClick={() => updateField('preferredPayment', 'credit')}
              className={`p-3 rounded-12 border flex flex-col items-center gap-1 ${settings.preferredPayment === 'credit' ? 'border-deepGreen bg-deepGreen/5' : 'border-slate-200'}`}
            >
              <CreditCard size={16} className="text-deepGreen" />
              <span className="text-[11px]">Crédit</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-20 p-5 border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Notifications</p>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-deepGreen flex items-center gap-2"><Bell size={14} /> Statut commandes</span>
              <input type="checkbox" checked={settings.notifications.orders} onChange={(e) => updateNotification('orders', e.target.checked)} />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-deepGreen">Promotions</span>
              <input type="checkbox" checked={settings.notifications.promos} onChange={(e) => updateNotification('promos', e.target.checked)} />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-deepGreen">Alertes stock</span>
              <input type="checkbox" checked={settings.notifications.stock} onChange={(e) => updateNotification('stock', e.target.checked)} />
            </label>
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={handleEnableNativeNotifications}
                disabled={!isNativeNotificationSupported() || nativePermission === 'granted'}
                className="w-full bg-deepGreen text-white py-2 rounded-12 text-sm font-semibold disabled:opacity-50"
              >
                {nativePermission === 'granted'
                  ? 'Notifications natives actives'
                  : 'Activer les notifications natives'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-20 p-5 border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Réglages de l'app</p>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-deepGreen flex items-center gap-2"><SlidersHorizontal size={14} /> Langue</span>
              <select
                value={settings.appPreferences.language}
                onChange={(e) => updateAppPreference('language', e.target.value as 'fr' | 'en')}
                className="bg-slate-100 rounded-10 px-2 py-1 text-xs"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-deepGreen">Réduire les animations</span>
              <input
                type="checkbox"
                checked={settings.appPreferences.reducedMotion}
                onChange={(e) => updateAppPreference('reducedMotion', e.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-deepGreen">Mode économie de données</span>
              <input
                type="checkbox"
                checked={settings.appPreferences.dataSaver}
                onChange={(e) => updateAppPreference('dataSaver', e.target.checked)}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
