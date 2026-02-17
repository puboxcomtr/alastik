'use client';
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isEmailVerified: boolean;
  customerSegment: string;
  loyaltyPoints: number;
}

interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token: string;
    refreshToken: string;
    expiresAt: string;
  };
  error?: string;
}

interface LoginCredentials {
  identifier: string;
  password: string;
}

interface RegisterData {
  username: string;
  email?: string;
  phone?: string;
  password: string;
  gdprConsent: boolean;
  marketingConsent?: boolean;
}

class AuthService {
  private baseUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private user: User | null = null;

  constructor() {
    if (typeof window === 'undefined') {
      this.baseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';
    } else {
      this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';
    }
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      this.refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
      const userData = localStorage.getItem('user_data');
      if (userData) {
        try {
          this.user = JSON.parse(userData);
        } catch (error) {
          console.error('User data parse error:', error);
          this.clearTokens();
        }
      } else {
        // localStorage yoksa sessionStorage'dan dene
        const userDataSession = sessionStorage.getItem('user_data');
        if (userDataSession) {
          try {
            this.user = JSON.parse(userDataSession);
          } catch (error) {
            console.error('User data parse error (session):', error);
            this.clearTokens();
          }
        }
      }
    }
  }

  /**
   * Kullanıcı girişi
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const start = Date.now();
      const reqId = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      console.log('🟦 [AUTH][LOGIN][REQUEST]', { reqId, identifier: credentials.identifier.includes('@') ? credentials.identifier.toLowerCase() : '***masked_phone***' });
      const response = await fetch(`${this.baseUrl}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      console.log('✅ [AUTH][LOGIN][RESPONSE]', { reqId, status: response.status, duration: Date.now() - start, bodyKeys: Object.keys(data || {}) });

      const token = data.token || data.accessToken || data.data?.token || data.tokens?.accessToken;
      const refreshToken = data.refreshToken || data.data?.refreshToken || data.tokens?.refreshToken;
      const user = data.user || data.data?.user || data.userData || data.data?.userData;

      if (data.success && token && user) {
        this.setTokens(token, refreshToken);
        this.setUser(user);

        return {
          success: true,
          message: 'Giriş başarılı',
          data: {
            user,
            token,
            refreshToken,
            expiresAt: data.expiresAt || ''
          }
        };
      }

      return {
        success: false,
        message: data.message || 'Giriş başarısız',
        error: data.error
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Bağlantı hatası',
        error: 'network_error'
      };
    }
  }

  /**
   * Kullanıcı kaydı
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const start = Date.now();
      const reqId = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      console.log('🟦 [AUTH][REGISTER][REQUEST]', { reqId, username: userData.username, email: userData.email || undefined, phone: userData.phone ? '***masked***' : undefined });
      const response = await fetch(`${this.baseUrl}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      console.log('✅ [AUTH][REGISTER][RESPONSE]', { reqId, status: response.status, duration: Date.now() - start, bodyKeys: Object.keys(data || {}) });

      const token = data.token || data.accessToken || data.data?.token || data.tokens?.accessToken;
      const refreshToken = data.refreshToken || data.data?.refreshToken || data.tokens?.refreshToken;
      const user = data.user || data.data?.user || data.userData || data.data?.userData;

      if (data.success && token && user) {
        this.setTokens(token, refreshToken);
        this.setUser(user);

        return {
          success: true,
          message: 'Kayıt başarılı',
          data: {
            user,
            token,
            refreshToken,
            expiresAt: data.expiresAt || ''
          }
        };
      }

      return {
        success: false,
        message: data.message || 'Kayıt başarısız',
        error: data.error
      };
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        message: 'Bağlantı hatası',
        error: 'network_error'
      };
    }
  }

  /**
   * Çıkış yap
   */
  async logout(): Promise<void> {
    try {
      if (this.token) {
        await fetch(`${this.baseUrl}/users/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
      this.clearUser();
    }
  }

  /**
   * Token'ı yenile
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      if (!this.refreshToken) {
        return false;
      }

      const response = await fetch(`${this.baseUrl}/users/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken
        }),
      });

      const data = await response.json();

      if (data.success && data.token) {
        this.setTokens(data.token, data.refreshToken || this.refreshToken);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Kullanıcı bilgilerini güncelle
   */
  async updateProfile(updates: Partial<User>): Promise<AuthResponse> {
    try {
      const response = await this.authenticatedRequest('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      const updatedUser = data.user || data.data?.user;

      if (data.success && updatedUser) {
        this.setUser(updatedUser);
        return {
          success: true,
          message: 'Profil güncellendi',
          data: {
            user: updatedUser,
            token: this.token!,
            refreshToken: this.refreshToken!,
            expiresAt: ''
          }
        };
      }

      return {
        success: false,
        message: data.message || 'Profil güncellenemedi',
        error: data.error
      };
    } catch (error) {
      console.error('Profile update error:', error);
      return {
        success: false,
        message: 'Bağlantı hatası',
        error: 'network_error'
      };
    }
  }

  /**
   * Authenticated request helper
   */
  async authenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutMs = (options as any).timeoutMs ?? 20000; // 20s default
    const timeoutId = setTimeout(() => controller.abort('timeout'), timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      let response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (response.status === 401) {
        if (this.refreshToken) {
          console.warn('🟨 [AUTH][401] Token expired/invalid. Refresh denenecek...');
          const refreshed = await this.refreshAccessToken();
          console.log('🟩 [AUTH][REFRESH][RESULT]', { refreshed });
          if (refreshed) {
            headers['Authorization'] = `Bearer ${this.token}`;
            response = await fetch(url, {
              ...options,
              headers,
              signal: controller.signal,
            });
          }
        } else {
          console.warn('🟥 [AUTH][401] Refresh token yok. Oturum yenilenemiyor.');
        }
      }

      return response;
    } catch (error) {
      // Network / timeout
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Oturumu doğrula: access token geçerli mi? Gerekirse refresh dener.
   * Başarılıysa true, aksi halde false.
   */
  async validateSession(): Promise<boolean> {
    try {
      if (!this.token) return false;
      const res = await this.authenticatedRequest('/cart/summary', { method: 'GET' });
      if (res.status === 401) return false;
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Token'ları kaydet
   */
  private setTokens(token: string, refreshToken?: string): void {
    this.token = token;
    if (refreshToken) {
      this.refreshToken = refreshToken;
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('auth_token', token);
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
      } catch (e) {
        console.warn('localStorage setItem failed, trying to free space and fallback to sessionStorage', e);
        try {
          // Aşırı log birikimi olabilir, temizle ve tekrar dene
          localStorage.removeItem('web_logs');
          localStorage.setItem('auth_token', token);
          if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
          }
        } catch (e2) {
          console.warn('Retry localStorage failed, fallback to sessionStorage', e2);
          try {
            sessionStorage.setItem('auth_token', token);
            if (refreshToken) {
              sessionStorage.setItem('refresh_token', refreshToken);
            }
          } catch {
            // sessStorage da olmazsa, sadece memory'de kalsın
          }
        }
      }
    }
  }

  /**
   * Token'ları temizle
   */
  private clearTokens(): void {
    this.token = null;
    this.refreshToken = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('refresh_token');
    }
  }

  /**
   * Kullanıcı bilgilerini kaydet
   */
  private setUser(user: User): void {
    this.user = user;

    if (typeof window !== 'undefined') {
      const payload = JSON.stringify(user);
      try {
        localStorage.setItem('user_data', payload);
      } catch (e) {
        try {
          localStorage.removeItem('web_logs');
          localStorage.setItem('user_data', payload);
        } catch (e2) {
          try {
            sessionStorage.setItem('user_data', payload);
          } catch {
            // yoksun, memory'de kalsın
          }
        }
      }
    }
  }

  /**
   * Kullanıcı bilgilerini temizle
   */
  private clearUser(): void {
    this.user = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_data');
      sessionStorage.removeItem('user_data');
    }
  }

  /**
   * Getter methods
   */
  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  isEmailVerified(): boolean {
    return this.user?.isEmailVerified || false;
  }
}

// Singleton instance
const authService = new AuthService();
export default authService;

// Export types
export type { User, AuthResponse, LoginCredentials, RegisterData };