import { API_ENDPOINTS } from '@/src/config/api';

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  verified_email: boolean;
}

interface GoogleAuthResponse {
  success: boolean;
  user?: GoogleUser;
  error?: string;
}

class GoogleAuthService {
  private clientId: string;
  private isInitialized = false;
  private gapi: any = null;

  constructor() {
    this.clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

    if (!this.clientId) {
      console.warn('⚠️ Google Client ID bulunamadı. Google OAuth devre dışı.');
    }
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (typeof window === 'undefined') return false;

    if (!this.clientId) {
      console.warn('⚠️ Google Client ID eksik, OAuth başlatılamıyor');
      return false;
    }

    try {
      await this.loadGoogleScript();

      await new Promise<void>((resolve, reject) => {
        (window as any).gapi.load('auth2', {
          callback: () => {
            (window as any).gapi.auth2.init({
              client_id: this.clientId,
              scope: 'email profile'
            }).then(() => {
              this.gapi = (window as any).gapi;
              this.isInitialized = true;
              resolve();
            }).catch(reject);
          },
          onerror: reject
        });
      });

      return true;
    } catch (error) {
      console.error('Google Auth initialization failed:', error);
      return false;
    }
  }

  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google API script yüklenemedi'));
      document.head.appendChild(script);
    });
  }

  async signIn(): Promise<GoogleAuthResponse> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return { success: false, error: 'Google Auth başlatılamadı' };
        }
      }

      const authInstance = this.gapi.auth2.getAuthInstance();
      const googleUser = await authInstance.signIn({
        prompt: 'select_account'
      });

      const profile = googleUser.getBasicProfile();
      const idToken = googleUser.getAuthResponse().id_token;

      const user: GoogleUser = {
        id: profile.getId(),
        email: profile.getEmail(),
        name: profile.getName(),
        given_name: profile.getGivenName(),
        family_name: profile.getFamilyName(),
        picture: profile.getImageUrl(),
        verified_email: true
      };

      const backendResponse = await this.sendToBackend(idToken, user);

      if (backendResponse.success) {
        return { success: true, user };
      } else {
        return { success: false, error: backendResponse.error };
      }

    } catch (error: any) {
      console.error('Google Sign-In error:', error);

      if (error.error === 'popup_closed_by_user') {
        return { success: false, error: 'Giriş işlemi iptal edildi' };
      }

      return { success: false, error: 'Google ile giriş yapılırken bir hata oluştu' };
    }
  }

  async signOut(): Promise<void> {
    try {
      if (this.isInitialized && this.gapi) {
        const authInstance = this.gapi.auth2.getAuthInstance();
        await authInstance.signOut();
      }
    } catch (error) {
      console.error('Google Sign-Out error:', error);
    }
  }

  private async sendToBackend(idToken: string, user: GoogleUser): Promise<{ success: boolean, error?: string }> {
    try {
      const response = await fetch(API_ENDPOINTS.auth.google(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
          user
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.tokens) {
          localStorage.setItem('token', data.tokens.accessToken);
          localStorage.setItem('refreshToken', data.tokens.refreshToken);
        }
        return { success: true };
      } else {
        return { success: false, error: data.message || 'Backend authentication failed' };
      }
    } catch (error) {
      console.error('Backend authentication error:', error);
      return { success: false, error: 'Backend ile iletişim kurulamadı' };
    }
  }

  isSignedIn(): boolean {
    if (!this.isInitialized || !this.gapi) return false;

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      return authInstance.isSignedIn.get();
    } catch (error) {
      return false;
    }
  }

  getCurrentUser(): GoogleUser | null {
    if (!this.isSignedIn()) return null;

    try {
      const authInstance = this.gapi.auth2.getAuthInstance();
      const googleUser = authInstance.currentUser.get();
      const profile = googleUser.getBasicProfile();

      return {
        id: profile.getId(),
        email: profile.getEmail(),
        name: profile.getName(),
        given_name: profile.getGivenName(),
        family_name: profile.getFamilyName(),
        picture: profile.getImageUrl(),
        verified_email: true
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }
}

const googleAuthService = new GoogleAuthService();

export default googleAuthService;
export type { GoogleUser, GoogleAuthResponse };