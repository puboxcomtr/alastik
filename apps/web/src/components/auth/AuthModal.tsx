'use client';

import React, { useState } from 'react';
import toast from '@lib/toast';
import authService from '@lib/auth';
import googleAuthService from '@lib/googleAuth';
import { AuthModalProps, LoginForm, RegisterForm } from '@/src/types/auth';

import styles from '@components/auth/auth.module.css';

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose,
  onAuthSuccess,
  initialMode = 'login' 
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [loginForm, setLoginForm] = useState<LoginForm>({
    identifier: '',
    password: ''
  });

  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🟦 [AUTH][LOGIN][START]', {
        identifier: loginForm.identifier.includes('@') ? loginForm.identifier.toLowerCase() : '***masked_phone***',
        ts: new Date().toISOString()
      });
      const resp = await authService.login({
        identifier: loginForm.identifier.trim(),
        password: loginForm.password,
      });
      if (resp.success) {
        console.log('🟩 [AUTH][LOGIN][SUCCESS]', { user: resp.data?.user?.email || resp.data?.user?.id });
        toast.auth.loginSuccess(resp.data?.user?.email);
        onAuthSuccess?.(resp.data?.user);
        onClose();
        setTimeout(() => window.location.reload(), 300);
        return;
      }
      console.warn('🟨 [AUTH][LOGIN][FAIL]', { message: resp.message });
      setError(resp.message || 'Giriş başarısız');
      toast.auth.loginError(resp.message || 'Giriş başarısız');
    } catch (err) {
      const errorMessage = 'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.';
      setError(errorMessage);
      toast.auth.loginError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // Gerçek Google OAuth entegrasyonu
      const result = await googleAuthService.signIn();
      
      if (result.success && result.user) {
        const googleUser = {
          email: result.user.email,
          firstName: result.user.given_name,
          lastName: result.user.family_name,
          name: result.user.name,
          picture: result.user.picture,
          googleId: result.user.id
        };
        
        toast.auth.loginSuccess(googleUser.email);
        onAuthSuccess?.(googleUser);
        onClose();
        
        // Sayfa yenilemeden auth durumunu güncelle
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        setError(result.error || 'Google ile giriş yapılırken bir hata oluştu');
        toast.auth.loginError(result.error);
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      const errorMessage = error.message || 'Google ile giriş yapılırken beklenmeyen bir hata oluştu';
      setError(errorMessage);
      toast.auth.loginError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Form validation
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      toast.auth.passwordMismatch();
      setLoading(false);
      return;
    }

    if (!registerForm.acceptTerms) {
      setError('Kullanım koşullarını kabul etmelisiniz.');
      toast.auth.termsNotAccepted();
      setLoading(false);
      return;
    }

    // Email veya telefon zorunlu
    if (!registerForm.email && !registerForm.phone) {
      setError('Email veya telefon bilgisinden en az biri gereklidir.');
      toast.auth.registerError('Email veya telefon gereklidir');
      setLoading(false);
      return;
    }

    try {
      console.log('🟦 [AUTH][REGISTER][START]', {
        username: registerForm.username,
        email: registerForm.email || undefined,
        phone: registerForm.phone ? '***masked***' : undefined,
        ts: new Date().toISOString()
      });
      const resp = await authService.register({
        username: registerForm.username.trim(),
        email: registerForm.email?.trim() || undefined,
        phone: registerForm.phone?.trim() || undefined,
        password: registerForm.password,
        gdprConsent: true,
      } as any);
      if (resp.success) {
        console.log('🟩 [AUTH][REGISTER][SUCCESS]', { user: resp.data?.user?.email || resp.data?.user?.id });
        // Kayıt sonrası doğrudan oturum açık ve yeşil toast
        toast.success('Hesap oluşturuldu. Oturum açıldı. Hoş geldiniz!', { autoClose: 3000 });
        onAuthSuccess?.(resp.data?.user);
        onClose();
        setTimeout(() => window.location.reload(), 300);
        return;
      }
      console.warn('🟨 [AUTH][REGISTER][FAIL]', { message: resp.message });
      setError(resp.message || 'Kayıt başarısız');
      toast.auth.registerError(resp.message || 'Kayıt başarısız');
    } catch (err) {
      const errorMessage = 'Kayıt olurken bir hata oluştu. Lütfen tekrar deneyin.';
      setError(errorMessage);
      toast.auth.registerError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.titleWithIcon}>
            <div className={styles.logoContainer}>
              <img 
                src="/assets/img/logo/website_logo.png" 
                alt="ALastik" 
                className={styles.logo}
                onError={(e) => {
                  // Fallback to tire icon if logo not found
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }}
              />
              <div className={styles.logoIconFallback}>
                <i className="fas fa-tire"></i>
              </div>
            </div>
            <h2 className={styles.modalTitle}>
              {mode === 'login' ? 'Hoş Geldin' : 'Aramıza Katıl'}
            </h2>
          </div>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Üst Google OAuth Button */}
          <button
            type="button"
            className={styles.googleButton}
            onClick={handleGoogleLogin}
            disabled={loading || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
          >
            <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 
              'Google ile Devam Et' : 
              'Google OAuth Yapılandırılmadı'
            }
          </button>

          {/* Mode Toggle */}
          <div className={styles.modeToggle}>
            <button
              className={`${styles.toggleBtn} ${mode === 'login' ? styles.active : ''}`}
              onClick={() => setMode('login')}
              type="button"
            >
              <i className="fas fa-sign-in-alt"></i>
              Giriş Yap
            </button>
            <button
              className={`${styles.toggleBtn} ${mode === 'register' ? styles.active : ''}`}
              onClick={() => setMode('register')}
              type="button"
            >
              <i className="fas fa-user-plus"></i>
              Üye Ol
            </button>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className={styles.authForm}>
              <div className={styles.formGroup}>
                <label htmlFor="loginIdentifier">E-POSTA ADRESİ veya TELEFON</label>
                <input
                  type="text"
                  id="loginIdentifier"
                  value={loginForm.identifier}
                  onChange={e => setLoginForm(prev => ({ ...prev, identifier: e.target.value }))}
                  required
                  placeholder="ornek@email.com / 05XXXXXXXXX"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="loginPassword">ŞİFRE</label>
                <input
                  type="password"
                  id="loginPassword"
                  value={loginForm.password}
                  onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                  placeholder="Şifrenizi girin"
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.forgotPassword}
                >
                  Şifremi Unuttum
                </button>
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin me-2"></i>
                    GİRİŞ YAPILIYOR...
                  </>
                ) : (
                  'GİRİŞ YAP'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className={styles.authForm}>
              <div className={styles.formGroup}>
                <label htmlFor="username">KULLANICI ADI</label>
                <input
                  type="text"
                  id="username"
                  value={registerForm.username}
                  onChange={e => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                  required
                  placeholder="Kullanıcı adınız"
                  minLength={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="registerEmail">E-POSTA (opsiyonel)</label>
                <input
                  type="email"
                  id="registerEmail"
                  value={registerForm.email}
                  onChange={e => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="ornek@email.com"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="phone">TELEFON NUMARASI (opsiyonel)</label>
                <input
                  type="tel"
                  id="phone"
                  value={registerForm.phone}
                  onChange={e => setRegisterForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="0555 123 45 67"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="registerPassword">ŞİFRE</label>
                <input
                  type="password"
                  id="registerPassword"
                  value={registerForm.password}
                  onChange={e => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                  placeholder="En az 6 karakter"
                  minLength={6}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">ŞİFRE TEKRAR</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={registerForm.confirmPassword}
                  onChange={e => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  placeholder="Şifrenizi tekrar girin"
                  minLength={6}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={registerForm.acceptTerms}
                    onChange={e => setRegisterForm(prev => ({ ...prev, acceptTerms: e.target.checked }))}
                    required
                  />
                  <span className={styles.checkmark}></span>
                  <span className={styles.checkboxText}>
                    <a href="/kullanim-kosullari" target="_blank">Kullanım Koşulları</a>'nı 
                    ve <a href="/gizlilik-politikasi" target="_blank">Gizlilik Politikası</a>'nı 
                    kabul ediyorum.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin me-2"></i>
                    KAYIT YAPILIYOR...
                  </>
                ) : (
                  'ÜYE OL'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Alt sosyal giriş alanı kaldırıldı */}
      </div>
    </div>
  );
};

export default AuthModal;