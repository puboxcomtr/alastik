'use client';
// React & Hooks
import React, { useState, useEffect } from 'react';
// Next.js Router
import { useRouter } from 'next/navigation';

// Next.js Link component
import Link from 'next/link';

// Modals & Components
import Topbar from '@components/layout/Header/Topbar';
import Middle from '@components/layout/Header/Middle/Main';
import Navbar from '@components/layout/Header/Navbar/Main';
import AuthModal from '@components/auth/AuthModal';
import ShoppingCart, { cartUtils } from '@components/cart/ShoppingCart';


// Library utils
import toast from '@src/lib/toast';
import authService from '@src/lib/auth';
import cartService from '@src/lib/cartService';


export default function Header() {
    const router = useRouter();
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [authMode, setAuthMode] = useState('login');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [cartOpen, setCartOpen] = useState(false);
    const [cartItemCount, setCartItemCount] = useState(0);

    const handleAuthClick = (mode) => {
        setAuthMode(mode);
        setAuthModalOpen(true);
    };

    const updateCartCount = async () => {
        try {
            const summary = await cartService.getCartSummary();
            setCartItemCount(summary.itemCount || 0);
        } catch {
            try { setCartItemCount(cartUtils.getCartItemCount()); } catch { setCartItemCount(0); }
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;
        // Category sayfasına genel arama parametresi ile yönlendir
        router.push(`/category?tip=genel&q=${encodeURIComponent(searchTerm.trim())}`);
    };

    // Cart count'u yükle ve cart update event'ini dinle
    useEffect(() => {
        updateCartCount();

        const handleCartUpdate = () => {
            // Daima backend/yerel kaynakla güncel sayıyı çek
            updateCartCount();
        };

        window.addEventListener('cartUpdated', handleCartUpdate);
        return () => window.removeEventListener('cartUpdated', handleCartUpdate);
    }, []);

    useEffect(() => {
        // Başlangıçta localStorage durumunu oku
        const u = authService.getUser();
        const t = authService.getToken();
        if (u && t) {
            setUser(u);
            setIsLoggedIn(true);
        } else {
            setUser(null);
            setIsLoggedIn(false);
        }
        // Oturumu arkaplanda doğrula; düşmüşse UI'ı kapat
        (async () => {
            const valid = await authService.validateSession?.();
            if (!valid) {
                setUser(null);
                setIsLoggedIn(false);
            }
        })();
        // Global session invalidation eventi
        const onInvalid = () => {
            setUser(null);
            setIsLoggedIn(false);
        };
        window.addEventListener('sessionInvalidated', onInvalid);
        return () => window.removeEventListener('sessionInvalidated', onInvalid);
    }, []);

    return (
        <>
            <Topbar />
            <Middle
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                handleSearch={handleSearch}
                isLoggedIn={isLoggedIn}
                user={user}
                handleAuthClick={handleAuthClick}
                setIsLoggedIn={setIsLoggedIn}
                setUser={setUser}
                setCartOpen={setCartOpen}
                cartItemCount={cartItemCount}
                authService={authService}
                toast={toast} />

            <Navbar />
            {/* Auth Modal */}
            <AuthModal
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
                initialMode={authMode}
            />

            {/* Shopping Cart */}
            <ShoppingCart
                isOpen={cartOpen}
                onClose={() => setCartOpen(false)}
            />
        </>
    );
}