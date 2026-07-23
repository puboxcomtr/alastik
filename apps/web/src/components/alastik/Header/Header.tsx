'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/* Component */
import BlockRenderer from '@components/BlockRenderer';
import Middle from '@components/alastik/Header/Middle/Main';
import Navbar from '@components/alastik/Header/Navbar/Main';
import MobileMenu from '@components/alastik/Header/MobileMenu';

/* Api Connection */
import { api } from '@src/lib/api';

/* Variables */
export default function Header() {
    const [logo, setLogo] = useState('');
    const [siteName, setSiteName] = useState('A Lastik');
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        api.get('/admin/design/settings/theme').then(data => {
            if (data.success && data.data?.logo) {
                setLogo(api.getImageUrl(data.data.logo));
            }
        });
        api.getSiteName().then(name => setSiteName(name));
    }, []);

    return (
        <>
            <Middle logo={logo} siteName={siteName} onMenuOpen={() => setMenuOpen(true)} />
            <Navbar />
            <MobileMenu show={menuOpen} onClose={() => setMenuOpen(false)} />

        </>
    );
}