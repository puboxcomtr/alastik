'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import authService from '../../../lib/auth';
import toast from '../../../lib/toast';

export default function FavoritesPage() {
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const resp = await authService.authenticatedRequest('/users/favorites');
      const data = await resp.json();
      if (data.success) setFavorites(data.data || []);
    } catch (e) {
      toast.error('Favoriler alınamadı');
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  const removeFav = async (productId: string) => {
    try {
      const resp = await authService.authenticatedRequest(`/users/favorites/${productId}`, { method: 'DELETE' });
      const data = await resp.json();
      if (data.success) {
        toast.success('Favoriden çıkarıldı');
        await load();
      } else toast.error(data.message || 'İşlem başarısız');
    } catch (e) { toast.error('İşlem başarısız'); }
  };

  return (
    <div className="container py-4 py-lg-5">
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link href="/">Ana Sayfa</Link></li>
          <li className="breadcrumb-item"><Link href="/account">Hesabım</Link></li>
          <li className="breadcrumb-item active" aria-current="page">Favorilerim</li>
        </ol>
      </nav>

      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="mb-0"><i className="ci-heart me-2"></i>Favori Ürünler</h5>
          {favorites.length > 0 && <span className="badge bg-success-subtle text-success border">{favorites.length}</span>}
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border"></div></div>
          ) : favorites.length === 0 ? (
            <div className="text-center text-muted py-5">
              <img src="/assets/img/help/hero-dark.png" width={220} className="mb-3" alt="Boş durum" />
              <p>Favori ürününüz yok. Ürünleri inceleyerek favorilerinize ekleyin.</p>
            </div>
          ) : (
            <div className="row g-3">
              {favorites.map((f:any)=> (
                <div className="col-md-6 col-xl-4" key={f.productId?._id || f.productId}>
                  <div className="card h-100">
                    <img src={f.productId?.images?.[0]?.url || '/assets/img/shop/tire-placeholder.jpg'} className="card-img-top" alt={f.productId?.name || 'Ürün'} />
                    <div className="card-body d-flex flex-column">
                      <h6 className="card-title">{f.productId?.brand || ''}</h6>
                      <p className="card-text small text-muted">{f.productId?.name || ''}</p>
                      <div className="mt-auto d-flex justify-content-between align-items-center">
                        <Link href={`/product/${f.productId?._id || ''}`} className="btn btn-sm btn-outline-primary"><i className="ci-eye me-1"></i>İncele</Link>
                        <button className="btn btn-sm btn-outline-danger" onClick={()=>removeFav(f.productId?._id || f.productId)}><i className="ci-trash me-1"></i>Kaldır</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


