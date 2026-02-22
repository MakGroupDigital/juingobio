import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { saveUserData } from './firebaseService';

const firebaseConfig = {
  apiKey: 'AIzaSyAoyt5CjOfLXiJWko4Y0gA735_EUEZHULo',
  authDomain: 'studio-2853082048-41992.firebaseapp.com',
  projectId: 'studio-2853082048-41992',
  storageBucket: 'studio-2853082048-41992.firebasestorage.app',
  messagingSenderId: '589474614344',
  appId: '1:589474614344:web:74c361b5df7ee49c3fdc7d'
};

const getFirebaseApp = () => (getApps().length ? getApps()[0] : initializeApp(firebaseConfig));

export const registerBackgroundPush = async (
  uid: string,
  onForegroundMessage?: (payload: { title: string; body: string }) => void
) => {
  if (!uid || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return null;
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
  if (!vapidKey) {
    console.warn('Missing VITE_FIREBASE_VAPID_KEY, web push token cannot be generated.');
    return null;
  }

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();

  if (permission !== 'granted') return null;

  const swRegistration = await navigator.serviceWorker.register('/sw.js');
  const messaging = getMessaging(getFirebaseApp());
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: swRegistration
  }).catch((error) => {
    console.error('Unable to get web push token:', error);
    return null;
  });

  if (token) {
    await saveUserData({
      uid,
      push_tokens: {
        web_fcm: token
      },
      updatedAt: new Date().toISOString()
    }).catch((error) => {
      console.error('Unable to store web push token:', error);
    });
  }

  if (!onForegroundMessage) return token;

  const unsubscribe = onMessage(messaging, (payload) => {
    const title = payload.notification?.title || 'JuingoBIO';
    const body = payload.notification?.body || 'Nouvelle notification';
    onForegroundMessage({ title, body });
  });

  return () => unsubscribe();
};

