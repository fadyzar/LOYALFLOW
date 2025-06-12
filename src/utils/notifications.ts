export async function requestNotificationPermission(): Promise<boolean> {
  try {
    // בדיקה אם הדפדפן תומך בהתראות
    if (!('Notification' in window)) {
      console.log('דפדפן זה לא תומך בהתראות');
      return false;
    }

    // בדיקה אם כבר יש הרשאה
    if (Notification.permission === 'granted') {
      return true;
    }

    // בקשת הרשאה
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

export async function showNotification(title: string, options?: NotificationOptions) {
  try {
    if (!('Notification' in window)) {
      console.log('דפדפן זה לא תומך בהתראות');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.log('אין הרשאה להתראות');
      return;
    }

    // שליחת ההתראה
    const notification = new Notification(title, {
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      ...options
    });

    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}