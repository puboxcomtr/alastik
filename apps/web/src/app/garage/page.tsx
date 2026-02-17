'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import authService from '../../lib/auth';
import toast from '../../lib/toast';

export default function GaragePage() {
  const [garage, setGarage] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ marka: '', model: '', yil: '', modifikasyon: '', nickname: '' });

  const load = async () => {
    try {
      const resp = await authService.authenticatedRequest('/users/garage');
      const data = await resp.json();
      if (data.success) setGarage(data.data || []);
    } catch (e) {
      toast.error('Garaj bilgileri alınamadı');
    }
  };

  useEffect(() => { load(); }, []);

  const addCar = async () => {
    try {
      const payload = { ...form, yil: parseInt(form.yil || '0') };
      const resp = await authService.authenticatedRequest('/users/garage', { method: 'POST', body: JSON.stringify(payload) });
      const data = await resp.json();
      if (data.success) { toast.success('Araç eklendi'); setForm({ marka: '', model: '', yil: '', modifikasyon: '', nickname: '' }); await load(); }
      else toast.error(data.message || 'Araç eklenemedi');
    } catch (e) { toast.error('Araç eklenemedi'); }
  };

  const deleteCar = async (index: number) => {
    if (!confirm('Aracı silmek istediğinize emin misiniz?')) return;
    try {
      const resp = await authService.authenticatedRequest(`/users/garage/${index}`, { method: 'DELETE' });
      const data = await resp.json();
      if (data.success) { toast.success('Araç silindi'); await load(); }
      else toast.error(data.message || 'Araç silinemedi');
    } catch (e) { toast.error('Araç silinemedi'); }
  };

  const toCategory = (car: any) => {
    const params = new URLSearchParams({ tip: 'arac', marka: car.marka, model: car.model, yil: String(car.yil) });
    if (car.modifikasyon) params.append('modifikasyon', car.modifikasyon);
    window.location.href = `/category?${params.toString()}`;
  };

  return (
    <div className="container py-4 py-lg-5">
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link href="/">Ana Sayfa</Link></li>
          <li className="breadcrumb-item active" aria-current="page">Garajım</li>
        </ol>
      </nav>

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="mb-0"><i className="ci-car me-2"></i>Araç Ekle</h5>
              <span className="badge bg-info-subtle text-info border">Yeni</span>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {['marka', 'model', 'yil', 'modifikasyon', 'nickname'].map((k) => (
                  <div className="col-12" key={k}>
                    <label className="form-label text-capitalize"><i className="ci-edit me-2"></i>{k}</label>
                    <input className="form-control" value={form[k] || ''} onChange={(e) => setForm((p: any) => ({ ...p, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <button className="btn btn-primary mt-3" onClick={addCar}><i className="ci-plus me-2"></i>Ekle</button>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h5 className="mb-0"><i className="ci-garage me-2"></i>Araçlarım</h5>
              {garage.length > 0 && <span className="badge bg-success-subtle text-success border">{garage.length}</span>}
            </div>
            <div className="card-body">
              {garage.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <img src="/assets/img/cars/car-not-found.jpg" width={260} className="mb-3" alt="Boş garaj" />
                  <p>Garajınız boş. Araç ekleyerek hızlı lastik araması yapabilirsiniz.</p>
                </div>
              ) : (
                garage.map((g: any, i: number) => (
                  <div className="border rounded p-3 mb-3" key={i}>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <strong>{g.nickname || `${g.marka} ${g.model}`}</strong>
                        <div className="small text-muted">{g.marka} {g.model} • {g.yil} {g.modifikasyon ? `• ${g.modifikasyon}` : ''}</div>
                      </div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => toCategory(g)}><i className="ci-search me-1"></i>Uygun Lastikleri Gör</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => deleteCar(i)}><i className="ci-trash me-1"></i>Sil</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


