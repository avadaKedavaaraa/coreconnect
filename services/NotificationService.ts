
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
    if (!('serviceWorker' in navigator)) {
        console.error("SW not supported in this browser.");
        return { success: false, error: 'Service Workers not supported.' };
    }
    if (!('PushManager' in window)) {
        console.error("PushManager not supported.");
        return { success: false, error: 'Push Notifications not supported.' };
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if (!registration) {
          throw new Error("Service Worker not ready.");
      }
      
      // Get VAPID Key from server
      const response = await fetch(`${API_URL}/api/notifications/vapid-key`);
      if (!response.ok) throw new Error(`VAPID fetch failed: ${response.status}`);
      
      const { publicKey } = await response.json();
      
      if (!publicKey) throw new Error("Server returned empty VAPID key. Check .env variables.");

      const convertedVapidKey = urlBase64ToUint8Array(publicKey);

      // Check if already subscribed to a different key
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
          // Optional: Unsubscribe if keys differ? For now, we reuse.
          // await existingSub.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // Send to server
      const saveRes = await fetch(`${API_URL}/api/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      if (!saveRes.ok) throw new Error("Failed to save subscription to server DB.");

      console.log("✅ Push Notification Subscribed Successfully");
      return { success: true };
    } catch (error: any) {
      console.error("Notification Subscription Failed:", error);
      return { success: false, error: error.message };
    }
  },

  unsubscribeUser: async () => {
      try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
              await subscription.unsubscribe();
              console.log("✅ Unsubscribed from Push Notifications");
          }
      } catch (e) {
          console.error("Unsubscribe error", e);
      }
  }
};
