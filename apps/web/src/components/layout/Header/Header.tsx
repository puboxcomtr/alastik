'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/* Component */
import BlockRenderer from '@components/BlockRenderer';
import Middle from '@components/layout/Header/Middle/Main';
import Navbar from '@components/layout/Header/Navbar/Main';
import AuthModal from '@components/auth/AuthModal';
import ShoppingCart from '@components/cart/ShoppingCart';

/* Api Connection */
import { api } from '@src/lib/api';

/* Variables */
export default function Header() {
    const [logo, setLogo] = useState('');

    useEffect(() => {
        api.get('/admin/design/settings/theme').then(data => {
            if (data.success && data.data?.logo) {
                setLogo(api.getImageUrl(data.data.logo));
            }
        });
    }, []);

    return (
        <>
            <BlockRenderer blockKey="topbar" />
            <Middle logo={logo} />
            <Navbar />
        </>
    );
}