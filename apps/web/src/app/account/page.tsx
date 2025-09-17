'use client';

import React, { useEffect, useState } from 'react';
import authService from '../../lib/auth';
import toast from '../../lib/toast';
import Link from 'next/link';

type Profile = {
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [profile, setProfile] = useState<Profile>({});
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        if (!authService.getToken()) {
          setError('Bu sayfa için giriş yapmalısınız.');
          setLoading(false);
          return;
        }
        const resp = await authService.authenticatedRequest('/users/profile');
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
        } else {
          setError(data.message || 'Profil alınamadı');
        }
      } catch (e: any) {
        setError(e?.message || 'Profil alınamadı');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload: Record<string, any> = {};
      if (profile.firstName !== undefined) payload['profile.firstName'] = profile.firstName;
      if (profile.lastName !== undefined) payload['profile.lastName'] = profile.lastName;
      if (profile.phone !== undefined) payload['profile.phone'] = profile.phone;
      const resp = await authService.authenticatedRequest('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (data.success) {
        toast.success('Profil güncellendi');
        // localStorage'daki kullanıcıyı tazeleyelim
        await authService.updateProfile({} as any);
      } else {
        toast.error(data.message || 'Profil güncellenemedi');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Profil güncellenemedi');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status"><span className="visually-hidden">Yükleniyor...</span></div>
        <p className="mt-3">Hesap bilgileri yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">
          <p className="mb-2">{error}</p>
          <button className="btn btn-primary btn-sm" onClick={() => (window.location.href = '/')}>Giriş yap</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 py-lg-5">
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link href="/">Ana Sayfa</Link></li>
          <li className="breadcrumb-item active" aria-current="page">Hesabım</li>
        </ol>
      </nav>

      {/* Profil Kapağı */}
      <div className="card border-0 shadow-sm mb-4" style={{ backgroundImage: 'url(/assets/img/account/cover.png)', backgroundSize: 'cover' }}>
        <div className="card-body d-flex align-items-center" style={{ backdropFilter: 'blur(2px)' }}>
          <img src="/assets/img/account/avatar.png" alt="Avatar" width={64} height={64} className="rounded-circle border me-3" />
          <div className="flex-grow-1">
            <h5 className="mb-1 d-flex align-items-center gap-2">
              <i className="ci-user"></i>
              {profile.firstName || profile.lastName ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : (username || email || 'Kullanıcı')}
              {stats?.segment && <span className="badge bg-success-subtle text-success border ms-2">{stats.segment}</span>}
            </h5>
            <div className="text-muted small">{email || 'E-posta yok'} {profile.phone ? `• ${profile.phone}` : ''}</div>
          </div>
          <div className="d-none d-md-flex gap-2">
            <Link href="/account/favorites" className="btn btn-sm btn-outline-secondary"><i className="ci-heart me-1"></i>Favoriler</Link>
            <Link href="/account/addresses" className="btn btn-sm btn-outline-secondary"><i className="ci-location me-1"></i>Adresler</Link>
            <Link href="/garage" className="btn btn-sm btn-outline-secondary"><i className="ci-car me-1"></i>Garaj</Link>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="mb-0"><i className="ci-settings me-2"></i>Hesap Bilgileri</h5>
              <span className="badge bg-info-subtle text-info border">Profil</span>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label"><i className="ci-mail me-2"></i>E-posta</label>
                <input className="form-control" value={email} disabled />
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label"><i className="ci-profile me-2"></i>Ad</label>
                  <input className="form-control" value={profile.firstName || ''} onChange={(e) => setProfile(p => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label"><i className="ci-profile me-2"></i>Soyad</label>
                  <input className="form-control" value={profile.lastName || ''} onChange={(e) => setProfile(p => ({ ...p, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label"><i className="ci-phone me-2"></i>Telefon</label>
                <input className="form-control" value={profile.phone || ''} onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="05551234567" />
              </div>
              <button className="btn btn-primary" onClick={handleSave}><i className="ci-check me-2"></i>Kaydet</button>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card mb-4">
            <div className="card-header"><h6 className="mb-0"><i className="ci-link me-2"></i>Hızlı Bağlantılar</h6></div>
            <div className="list-group list-group-flush">
              <Link href="/account/addresses" className="list-group-item list-group-item-action"><i className="ci-location me-2"></i>Adreslerim</Link>
              <Link href="/account/favorites" className="list-group-item list-group-item-action"><i className="ci-heart me-2"></i>Favorilerim</Link>
              <Link href="/garage" className="list-group-item list-group-item-action"><i className="ci-car me-2"></i>Garajım</Link>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h6 className="mb-0"><i className="ci-chart me-2"></i>Özet</h6></div>
            <div className="card-body">
              <div className="d-flex justify-content-between"><span>Segment</span><strong>{stats?.segment || '-'}</strong></div>
              <div className="d-flex justify-content-between"><span>Sipariş</span><strong>{stats?.orders ?? 0}</strong></div>
              <div className="d-flex justify-content-between"><span>Toplam Harcama</span><strong>{(stats?.spent ?? 0).toLocaleString('tr-TR')} ₺</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


