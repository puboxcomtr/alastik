'use client';

// React & Next.js
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Bootstrap
import { Col, Container, Row } from 'react-bootstrap';

// Hooks
import { useAuth } from '@/src/hooks/Theme/useAuth';

// Config
import { ROUTES } from '@/src/config/routes';

// Components
import AccountSidebar from '@/src/components/account/Sidebar/Content';
import ReviewsContent from '@/src/components/account/Content/Reviews';

type Profile = {
    firstName?: string;
    lastName?: string;
    phone?: string;
};

export default function ReviewsPage() {
    const router = useRouter();
    const { isLoggedIn, loading: authLoading, getToken } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [profile, setProfile] = useState<Profile>({});
    const [stats, setStats] = useState<any>(null);
    const [reviews, setReviews] = useState<any[]>([]);
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

                const [profileResp, reviewsResp] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
                    }),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews/my`, {
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

                const reviewsData = await reviewsResp.json();
                if (reviewsData.success) {
                    setReviews(reviewsData.data || []);
                }
            } catch (e: any) {
                setError(e?.message || 'Veriler alınamadı');
            } finally {
                setPageLoading(false);
            }
        };
        fetchData();
    }, [authLoading, isLoggedIn]);

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
                                <ReviewsContent reviews={reviews} />
                            </Col>
                        </Row>
                    </div>
                </Container>
            </section>
        </>
    );
}