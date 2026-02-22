import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { saveUserData } from './firebaseService';

export const isNativePushSupported = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const registerNativePush = async (
  uid: string,
  onForegroundMessage?: (payload: { title: string; body: string }) => void
) => {
  if (!uid || !isNativePushSupported()) return;

  let permStatus = await PushNotifications.checkPermissions();
  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }
  if (permStatus.receive !== 'granted') {
    throw new Error('Permission de notification refusee');
  }

  await PushNotifications.register();

  const tokenListener = await PushNotifications.addListener('registration', async (token: Token) => {
    await saveUserData({
      uid,
      push_tokens: {
        android_fcm: token.value
      },
      updatedAt: new Date().toISOString()
    }).catch((error) => {
      console.error('Unable to save android push token:', error);
    });
  });

  const errorListener = await PushNotifications.addListener('registrationError', (error) => {
    console.error('Native push registration error:', error);
  });

  const receiveListener = await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    const title = notification.title || 'JuingoBIO';
    const body = notification.body || 'Nouvelle notification';
    onForegroundMessage?.({ title, body });
  });

  const actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (_action: ActionPerformed) => {
    // Future: route to order detail from notification payload.
  });

  return () => {
    tokenListener.remove();
    errorListener.remove();
    receiveListener.remove();
    actionListener.remove();
  };
};
