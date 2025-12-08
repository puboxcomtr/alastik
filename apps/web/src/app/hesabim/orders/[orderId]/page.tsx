'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
// Header/Footer global layout'ta
import authService from '../../../../lib/auth';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const res = await authService.authenticatedRequest(`/orders/${orderId}`);
        const data = await res.json();
        if (data?.success) setOrder(data.data); else setError(data?.message || 'Sipariş alınamadı');
      } catch {
        setError('Sipariş alınamadı');
      } finally { setLoading(false); }
    })();
  }, [orderId]);

  return (
    <div className="container py-5">
        <h2 className="mb-4">Sipariş Detayı</h2>
        {loading && <div>Yükleniyor...</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {!loading && !error && order && (
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between mb-3">
                <div>
                  <div className="fw-bold">{order.orderNumber}</div>
                  <small className="text-muted">{new Date(order.createdAt).toLocaleString('tr-TR')}</small>
                </div>
                <div>
                  <span className="badge bg-secondary me-1">{order.status}</span>
                  <span className="badge bg-{order.paymentStatus==='paid'?'success':'warning'}">{order.paymentStatus}</span>
                </div>
              </div>
              <ul className="list-group mb-3">
                {order.items.map((it: any, idx: number) => (
                  <li key={idx} className="list-group-item d-flex justify-content-between">
                    <div>
                      <div className="fw-bold">{it.brand ? `${it.brand} ` : ''}{it.name}</div>
                      <small className="text-muted">{it.specifications?.size || ''}</small>
                    </div>
                    <div>{it.quantity} × {it.unitPrice.toLocaleString('tr-TR')} TL</div>
                  </li>
                ))}
              </ul>
              <div className="text-end fw-bold">Toplam: {order.pricing.total.toLocaleString('tr-TR')} {order.pricing.currency}</div>
            </div>
          </div>
        )}
    </div>
  );
}


