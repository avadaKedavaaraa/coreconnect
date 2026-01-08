
import { API_URL } from '../lib/config';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const NotificationService = {
  subscribeUser: async () => {
    if (!('serviceWorker' in navigator)) return { success: false, error: 'No SW support' };
    if (!('PushManager' in window)) return { success: false, error: 'No Push support' };

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID Key from server
      const response = await fetch(`${API_URL}/api/notifications/vapid-key`);
      const { publicKey } = await response.json();
      
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // Send to server
      await fetch(`${API_URL}/api/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      return { success: true };
    } catch (error: any) {
      console.error("Subscription failed:", error);
      return { success: false, error: error.message };
    }
  },

  unsubscribeUser: async () => {
      try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
              await subscription.unsubscribe();
          }
      } catch (e) {
          console.error("Unsubscribe error", e);
      }
  }
};
