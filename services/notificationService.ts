export const isNativeNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const requestNativeNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNativeNotificationSupported()) return 'denied';

  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
};

export const sendNativeTestNotification = (title: string, body: string) => {
  if (!isNativeNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  new Notification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png'
  });
  return true;
};
