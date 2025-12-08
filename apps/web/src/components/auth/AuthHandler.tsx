'use client';

import { useEffect, useState } from 'react';
import AuthModal from './AuthModal';
import { toast } from 'react-toastify';

interface AuthRequiredEvent extends CustomEvent {
  detail: {
    message: string;
    endpoint: string;
    originalError: string;
  };
}

export default function AuthHandler() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    const handleAuthRequired = (event: AuthRequiredEvent) => {
      console.log('🔐 [AUTH HANDLER] Auth required event received:', event.detail);
      
      setAuthMessage(event.detail.message);
      setShowAuthModal(true);
      
      // Toast mesajı göster
      toast.warning(event.detail.message, {
        autoClose: 4000,
        toastId: 'auth-required' // Duplicate toast'ları engelle
      });
    };

    const handleSessionInvalidated = () => {
      console.log('🔐 [AUTH HANDLER] Session invalidated event received');
      
      // Session geçersiz olduğunda kullanıcıyı bilgilendir
      toast.info('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.', {
        autoClose: 5000,
        toastId: 'session-expired'
      });
    };

    // Event listener'ları ekle
    window.addEventListener('authRequired', handleAuthRequired as EventListener);
    window.addEventListener('sessionInvalidated', handleSessionInvalidated);

    // Cleanup
    return () => {
      window.removeEventListener('authRequired', handleAuthRequired as EventListener);
      window.removeEventListener('sessionInvalidated', handleSessionInvalidated);
    };
  }, []);

  const handleAuthSuccess = (user: any) => {
    console.log('🟩 [AUTH HANDLER] Authentication successful:', user?.email || user?.id);
    setShowAuthModal(false);
    
    // Başarılı giriş mesajı
    toast.success(`Hoş geldin ${user?.firstName || user?.email || 'kullanıcı'}!`, {
      autoClose: 3000
    });

    // Sayfayı yenile ki auth state güncellensin
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleAuthClose = () => {
    setShowAuthModal(false);
  };

  return (
    <>
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={handleAuthClose}
          onAuthSuccess={handleAuthSuccess}
          initialMode="login"
        />
      )}
    </>
  );
}
