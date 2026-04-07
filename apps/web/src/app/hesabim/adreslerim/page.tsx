'use client';

import React, { useEffect, useState } from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import Link from 'next/link';
import AccountSidebar from '@/src/components/account/Sidebar/Content';
import AddressContent from '@/src/components/account/Content/Adress';
import { ROUTES } from '@/src/config/routes';
import { useAuth } from '@/src/hooks/Theme/useAuth';

type Profile = {
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export default function AdreslerimPage() {
  const { isLoggedIn, loading: authLoading, getToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState<Profile>({});
  const [stats, setStats] = useState<any>(null);
  const [userId, setUserId] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      setError('Bu sayfa için giriş yapmalısınız.');
      setPageLoading(false);
      return;
    }

    const fetchProfile = async () => {
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
          setUserId(data.data.user._id || data.data.user.id || '');
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
        } else {
          setError(data.message || 'Profil alınamadı');
        }
      } catch (e: any) {
        setError(e?.message || 'Profil alınamadı');
      } finally {
        setPageLoading(false);
      }
    };
    fetchProfile();
  }, [authLoading, isLoggedIn]);

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
    <section id="main_account">
      <Container>
        <div className="row-fluid">
          <Row>
            <Col md={3}>
              <AccountSidebar profile={profile} email={email} username={username} stats={stats} />
            </Col>
            <Col md={9}>
              <AddressContent userId={userId} />
            </Col>
          </Row>
        </div>
      </Container>
    </section>
  );
}