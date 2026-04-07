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
import OrdersContent from '@/src/components/account/Content/Orders';
import OrderDetail from '@/src/components/account/Content/OrderDetail';

type Profile = {
    firstName?: string;
    lastName?: string;
    phone?: string;
};

export default function OrdersPage() {
    const router = useRouter();
    const { isLoggedIn, loading: authLoading, getToken } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [profile, setProfile] = useState<Profile>({});
    const [stats, setStats] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [pageLoading, setPageLoading] = useState(true);

    // Offcanvas state
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showDetail, setShowDetail] = useState(false);

    useEffect(() => {
        if (authLoading) return;

        if (!isLoggedIn) {
            router.push(ROUTES.LOGIN);
            return;
        }

        const fetchData = async () => {
            try {
                const token = getToken();
                const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await resp.json();
                if (data.success && data.data?.user) {
                    setUsername(data.data.user.username || '');
                    setEmail(data.data.user.email);
                    setProfile({
                        firstName: data.data.user.profile?.firstName || '',
                        lastName: data.data.user.profile?.lastName || '',
                        phone: data.data.user.profile?.phone || ''
                    });
                    setStats({
                        segment: data.data.user.customerSegment,
                        orders: data.data.user.statistics?.totalOrders,
                        spent: data.data.user.statistics?.totalSpent
                    });

                    const uid = data.data.user._id || data.data.user.id;
                    if (uid) {
                        const ordersResp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/order/user/${uid}`, {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        const ordersData = await ordersResp.json();
                        if (ordersData.success) {
                            setOrders(ordersData.data || []);
                        }
                    }
                } else {
                    setError(data.message || 'Profil alınamadı');
                }
            } catch (e: any) {
                setError(e?.message || 'Profil alınamadı');
            } finally {
                setPageLoading(false);
            }
        };
        fetchData();
    }, [authLoading, isLoggedIn]);

    const handleOrderClick = async (orderId: string) => {
        setShowDetail(true);
        setDetailLoading(true);
        setSelectedOrder(null);

        try {
            const token = getToken();
            const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/order/${orderId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await resp.json();
            if (data.success) {
                setSelectedOrder(data.data);
            }
        } catch (e) {
            console.error('Sipariş detay hatası:', e);
        } finally {
            setDetailLoading(false);
        }
    };

    if (authLoading || pageLoading) return null;

    if (error) {
        return (
            <div className="container py-5">
                <div className="alert alert-warning">
                    <p className="mb-2">{error}</p>
                    <Link href={ROUTES.LOGIN} className="btn btn-primary btn-sm">Giriş yap</Link>
                </div>
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
                                <OrdersContent orders={orders} onOrderClick={handleOrderClick} />
                            </Col>
                        </Row>
                    </div>
                </Container>
            </section>

            <OrderDetail
                order={selectedOrder}
                show={showDetail}
                onHide={() => setShowDetail(false)}
                loading={detailLoading}
            />
        </>
    );
}