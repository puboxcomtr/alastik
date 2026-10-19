'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Col, Container, Row } from 'react-bootstrap';

import { useAuth } from '@/src/hooks/Theme/useAuth';

import { ROUTES } from '@/src/config/routes';

import AccountSidebar from '@/src/components/account/Sidebar/Content';
import FavouritesContent from '@/src/components/account/Content/Favourites';

type Profile = {
    firstName?: string;
    lastName?: string;
    phone?: string;
};

export default function FavouritesPage() {
    const router = useRouter();
    const { isLoggedIn, loading: authLoading, getToken } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [profile, setProfile] = useState<Profile>({});
    const [stats, setStats] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        if (!isLoggedIn) {
            router.push(ROUTES.LOGIN);
            return;
        }

        const fetchData = async () => {
            try {
                const token = getToken();

                const [profileResp, favResp] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/favourites`, {
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
                    })
                ]);

                const profileData = await profileResp.json();
                if (profileData.success && profileData.data?.user) {
                    setUsername(profileData.data.user.username || '');
                    setEmail(profileData.data.user.email);
                    setProfile({
                        firstName: profileData.data.user.profile?.firstName || '',
                        lastName: profileData.data.user.profile?.lastName || '',
                        phone: profileData.data.user.profile?.phone || ''
                    });
                    setStats({
                        segment: profileData.data.user.customerSegment,
                        orders: profileData.data.user.statistics?.totalOrders,
                        spent: profileData.data.user.statistics?.totalSpent
                    });
                } else {
                    setError(profileData.message || 'Profil alınamadı');
                }

                const favData = await favResp.json();
                if (favData.success) {
                    setItems(favData.data?.items || []);
                }
            } catch (e: any) {
                setError(e?.message || 'Veriler alınamadı');
            } finally {
                setPageLoading(false);
            }
        };
        fetchData();
    }, [authLoading, isLoggedIn]);

    const handleRemove = async (productKey: string) => {
        try {
            const token = getToken();
            const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/favourites/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ productKey })
            });
            const data = await resp.json();
            if (data.success && !data.data?.isFavourite) {
                setItems(prev => prev.filter(item => item._key !== productKey));
            }
        } catch (e) {
            console.error('Favori kaldırma hatası:', e);
        }
    };

    if (authLoading || pageLoading) return null;

    if (error) {
        return (
            <div className="container py-5">
                <div className="alert alert-warning">{error}</div>
            </div>
        );
    }

    return (
        <>
            <section id="main_account">
                <Container>
                    <div className="row-fluid">
                        <Row>
                            <Col md={3}>
                                <AccountSidebar profile={profile} email={email} username={username} stats={stats} />
                            </Col>
                            <Col md={9}>
                                <FavouritesContent items={items} onRemove={handleRemove} />
                            </Col>
                        </Row>
                    </div>
                </Container>
            </section>
        </>
    );
}