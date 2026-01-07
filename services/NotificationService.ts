
import { API_URL } from '../App';

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const NotificationService = {
  // 1. Check if supported
  isSupported: () => {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  },

  // 2. Get Public Key from Server (Dynamic)
  getPublicKey: async () => {
    try {
        const res = await fetch(`${API_URL}/api/notifications/vapid-key`);
        if (!res.ok) throw new Error("Server key fetch failed");
        const data = await res.json();
        return data.publicKey;
    } catch (e) {
        console.error("Failed to fetch VAPID key", e);
        return null;
    }
  },

  // 3. Register and Subscribe (Handles Key Rotation)
  subscribeUser: async () => {
    if (!NotificationService.isSupported()) return false;

    // A. Request Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    // B. Get Service Worker
    const registration = await navigator.serviceWorker.ready;
    if (!registration) return false;

    // C. Get Server Key
    const serverPublicKey = await NotificationService.getPublicKey();
    if (!serverPublicKey) {
        console.warn("Server Error: VAPID Public Key missing. Check backend logs.");
        return false;
    }

    try {
        const convertedKey = urlBase64ToUint8Array(serverPublicKey);
        
        // D. Check Existing Subscription
        let subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            // Check if key changed (e.g. Server restart with ephemeral keys)
            const currentKeyBuffer = subscription.options.applicationServerKey;
            
            let keysMatch = false;
            if (currentKeyBuffer) {
                const currentKey = new Uint8Array(currentKeyBuffer);
                if (currentKey.length === convertedKey.length) {
                    keysMatch = true;
                    for(let i=0; i<currentKey.length; i++) {
                        if (currentKey[i] !== convertedKey[i]) {
                            keysMatch = false;
                            break;
                        }
                    }
                }
            }

            if (!keysMatch) {
                console.log("⚠️ VAPID Key Mismatch (Server Restarted?). Re-subscribing...");
                await subscription.unsubscribe();
                subscription = null;
            }
        }

        // E. Subscribe if needed (New or Re-subscribe)
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedKey
            });
        }

        // F. Send to Backend
        const res = await fetch(`${API_URL}/api/notifications/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });

        if (!res.ok) {
            // If backend says 409 (Conflict), it means we are already subscribed, which is fine.
            if (res.status === 409) return true;
            throw new Error(`Server returned ${res.status}`);
        }

        localStorage.setItem('core_connect_notifications', 'granted');
        return true;

    } catch (e: any) {
        console.error("Failed to subscribe user to push", e);
        // Only alert if it's a user-initiated action (we can't easily detect that here, but usually it is)
        // alert(`Notification Error: ${e.message || "Unknown error"}`);
        return false;
    }
  },

  // 4. Unsubscribe
  unsubscribeUser: async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
        }
        localStorage.setItem('core_connect_notifications', 'denied');
      } catch (e) {
          console.error("Unsubscribe error", e);
      }
  }
};
