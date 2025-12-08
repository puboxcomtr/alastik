'use client';

import React, { useEffect, useState } from 'react';
// Header/Footer global layout'ta render ediliyor
import authService from '../../../lib/auth';
import styles from '../account.module.css';

interface OrderItem {
  name: string;
  brand?: string;
  quantity: number;
  unitPrice: number;
  specifications?: { size?: string };
}

interface OrderSummary {
  _id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  pricing: { total: number; currency: string };
  items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authService.authenticatedRequest('/orders');
        const data = await res.json();
        if (data?.success) {
          setOrders(data.data || []);
        } else {
          setError(data?.message || 'Siparişler alınamadı');
        }
      } catch (e) {
        setError('Siparişler alınamadı');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="container py-5">
        <h2 className="mb-4">Siparişlerim</h2>
        {loading && <div>Yükleniyor...</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {!loading && !error && orders.length === 0 && (
          <div className="alert alert-info">Henüz siparişiniz bulunmuyor.</div>
        )}
        {!loading && !error && orders.length > 0 && (
          <div className="row g-3">
            {orders.map((o) => (
              <div key={o._id} className="col-12 col-md-6">
                <div className="card h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <div className="fw-bold">{o.orderNumber}</div>
                        <small className="text-muted">{new Date(o.createdAt).toLocaleString('tr-TR')}</small>
                      </div>
                      <div className="text-end">
                        <span className="badge bg-secondary me-1">{o.status}</span>
                        <span className="badge bg-{o.paymentStatus==='paid'?'success':'warning'}">{o.paymentStatus}</span>
                      </div>
                    </div>
                    <hr />
                    <ul className="list-unstyled mb-2">
                      {o.items.slice(0,3).map((it, idx) => (
                        <li key={idx} className="small text-muted">
                          {it.brand ? `${it.brand} ` : ''}{it.name} × {it.quantity} {it.specifications?.size ? `(${it.specifications.size})` : ''}
                        </li>
                      ))}
                      {o.items.length > 3 && (
                        <li className="small text-muted">... {o.items.length - 3} ürün daha</li>
                      )}
                    </ul>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="fw-bold">Toplam: {o.pricing.total.toLocaleString('tr-TR')} {o.pricing.currency}</div>
                      <a className="btn btn-sm btn-outline-primary" href={`/account/orders/${o._id}`}>Detay</a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}


