import { useState, useEffect } from 'react';
import { useSubscribeToPushMutation, useUnsubscribeFromPushMutation } from '../store/api/notificationsApi';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported() ? Notification.permission : 'denied'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);

  const [subscribeMutation] = useSubscribeToPushMutation();
  const [unsubscribeMutation] = useUnsubscribeFromPushMutation();

  // Check current subscription on mount
  useEffect(() => {
    if (!isSupported() || !VAPID_PUBLIC_KEY) return;

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => {});
  }, []);

  const subscribe = async (): Promise<void> => {
    if (!isSupported() || !VAPID_PUBLIC_KEY) return;

    const permission = await Notification.requestPermission();
    setPermission(permission);
    if (permission !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    await subscribeMutation(sub.toJSON() as PushSubscriptionJSON).unwrap();
    setIsSubscribed(true);
  };

  const unsubscribe = async (): Promise<void> => {
    if (!isSupported()) return;

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    await unsubscribeMutation({ endpoint: sub.endpoint }).unwrap();
    await sub.unsubscribe();
    setIsSubscribed(false);
  };

  return {
    isSupported: isSupported() && !!VAPID_PUBLIC_KEY,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
  };
}
