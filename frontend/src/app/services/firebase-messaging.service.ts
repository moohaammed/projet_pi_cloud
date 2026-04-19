import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseMessagingService {
  private messaging?: Messaging;
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private readonly firebaseConfig = {
    apiKey: "AIzaSy...", // To be replaced by actual if available, or placeholder
    authDomain: "alzcare-469d1.firebaseapp.com",
    projectId: "alzcare-469d1",
    storageBucket: "alzcare-469d1.firebasestorage.app",
    messagingSenderId: "41943154771",
    appId: "ta_clé", // placeholder
    measurementId: "ta_clé" // placeholder
  };

  private readonly VAPID_KEY = "MinbPezeaMm0nA_-kY5qvUDFku8Jbg7_arER_ApAczM"; // The key provided at the end

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const app = initializeApp(this.firebaseConfig);
      this.messaging = getMessaging(app);
      
      onMessage(this.messaging, (payload) => {
        console.log('Message received. ', payload);
        // Show a toast logic here if needed, but handled by the component or service
        this.showNotificationToast(payload);
      });
    }
  }

  async requestNotificationPermission(): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId) || !this.messaging) return null;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(this.messaging, {
          vapidKey: this.VAPID_KEY
        });
        
        if (token) {
          console.log('FCM Token:', token);
          this.saveTokenToBackend(token);
          return token;
        }
      }
    } catch (error) {
      console.error('An error occurred while retrieving token. ', error);
    }
    return null;
  }

  private saveTokenToBackend(token: string) {
    const user = this.auth.getCurrentUser();
    if (user && user.id) {
      this.http.patch(`http://localhost:8080/api/users/${user.id}/fcm-token`, { fcmToken: token })
        .subscribe(() => console.log('Token saved to backend'));
    }
  }

  private showNotificationToast(payload: any) {
    // In a real app, this would use a Toast library
    // For now, we can use the existing notification mechanism if available
    alert(`🔔 ${payload.notification.title}: ${payload.notification.body}`);
  }
}
