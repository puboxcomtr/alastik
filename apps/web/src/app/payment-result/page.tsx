'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
// Header/Footer global layout'tadır
import authService from '../../lib/auth';

interface OrderData {
  orderNumber: string;
  paymentStatus: string;
  status: string;
  pricing: { total: number; currency: string };
}

function PaymentResultContent() {
  const params = useSearchParams();
  const orderRef = params.get('orderRef') || '';
  const status = (params.get('status') || '').toUpperCase();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        if (!orderRef) { setLoading(false); return; }
        const res = await authService.authenticatedRequest(`/orders/number/${encodeURIComponent(orderRef)}`);
        const data = await res.json();
        if (data?.success) {
          setOrder({
            orderNumber: data.data.orderNumber,
            paymentStatus: data.data.paymentStatus,
            status: data.data.status,
            pricing: data.data.pricing
          });
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [orderRef]);

  return (
    <div className="container py-5">
      {!orderRef ? (
        <div className="alert alert-warning">Geçersiz yönlendirme.</div>
      ) : loading ? (
        <div className="text-center">
          <div className="spinner-border" role="status"><span className="visually-hidden">Yükleniyor...</span></div>
          <p className="mt-3">Ödeme sonucu yükleniyor...</p>
        </div>
      ) : (
        <div className="text-center">
          {status === 'SUCCESS' || order?.paymentStatus === 'paid' ? (
            <>
              <h3 className="text-success">Ödeme Başarılı</h3>
              <p>Sipariş Numaranız: <strong>{order?.orderNumber || orderRef}</strong></p>
              <p>Toplam: {order?.pricing?.total?.toLocaleString('tr-TR')} {order?.pricing?.currency || '₺'}</p>
              <a className="btn btn-primary" href="/account/orders">Siparişlerime Git</a>
            </>
          ) : (
            <>
              <h3 className="text-danger">Ödeme Başarısız</h3>
              <p>Sipariş Numaranız: <strong>{orderRef}</strong></p>
              <a className="btn btn-outline-primary" href="/checkout">Tekrar Dene</a>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div className="container py-5"><div>Yükleniyor...</div></div>}>
      <PaymentResultContent />
    </Suspense>
  );
}


