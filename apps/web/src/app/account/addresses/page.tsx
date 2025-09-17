'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import authService from '../../../lib/auth';
import toast from '../../../lib/toast';

export default function AddressesPage() {
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ title: '', firstName: '', lastName: '', phone: '', address: '', city: '', district: '', postalCode: '' });

  const load = async () => {
    try {
      setLoading(true);
      const resp = await authService.authenticatedRequest('/users/profile');
      const data = await resp.json();
      if (data.success) setAddresses(data.data.user.addresses || []);
    } catch (e) {
      toast.error('Adresler alınamadı');
      import Swal from 'sweetalert2';

      interface Address {
        _id: string;
        title: string;
        type: 'home' | 'work' | 'other';
        fullName: string;
        phone: string;
        city: string;
        district: string;
        neighborhood?: string;
        addressLine: string;
        buildingNo?: string;
        floor?: string;
        apartmentNo?: string;
        postalCode?: string;
        directions?: string;
        isDefault: boolean;
        invoiceType: 'individual' | 'corporate';
        tcNo?: string;
        companyName?: string;
        taxNumber?: string;
        taxOffice?: string;
        fullAddress?: string;
      }

      export default function AddressesPage() {
        const [loading, setLoading] = useState(true);
        const [addresses, setAddresses] = useState<Address[]>([]);
        const [showForm, setShowForm] = useState(false);
        const [editingAddress, setEditingAddress] = useState<Address | null>(null);
        const [cities, setCities] = useState<any[]>([]);
        const [districts, setDistricts] = useState<any[]>([]);

        const [form, setForm] = useState<any>({
          title: '',
          type: 'home',
          fullName: '',
          phone: '',
          city: '',
          district: '',
          neighborhood: '',
          addressLine: '',
          buildingNo: '',
          floor: '',
          apartmentNo: '',
          postalCode: '',
          directions: '',
          isDefault: false,
          invoiceType: 'individual',
          tcNo: '',
          companyName: '',
          taxNumber: '',
          taxOffice: ''
        });

        // Adresleri yükle
        const loadAddresses = async () => {
          try {
            setLoading(true);
            const resp = await authService.authenticatedRequest('/addresses');
            const data = await resp.json();
            if (data.success) {
              setAddresses(data.data || []);
            }
          } catch (e) {
            toast.error('Adresler yüklenirken hata oluştu');
          } finally {
            setLoading(false);
          }
        };

        useEffect(() => { load(); }, []);

        const addAddress = async () => {
          try {
            setLoading(true);
            const resp = await authService.authenticatedRequest('/users/addresses', { method: 'POST', body: JSON.stringify(form) });
            const data = await resp.json();
            if (data.success) {
              toast.success('Adres eklendi');
              setForm({ title: '', firstName: '', lastName: '', phone: '', address: '', city: '', district: '', postalCode: '' });
              await load();
            } else toast.error(data.message || 'Adres eklenemedi');
          } catch (e) {
            toast.error('Adres eklenemedi');
          } finally { setLoading(false); }
        };

        const deleteAddress = async (id: string) => {
          if (!confirm('Adresi silmek istediğinize emin misiniz?')) return;
          try {
            setLoading(true);
            const resp = await authService.authenticatedRequest(`/users/addresses/${id}`, { method: 'DELETE' });
            const data = await resp.json();
            if (data.success) { toast.success('Adres silindi'); await load(); }
            else toast.error(data.message || 'Adres silinemedi');
          } catch (e) { toast.error('Adres silinemedi'); }
          finally { setLoading(false); }
          // İlleri yükle
          const loadCities = async () => {
            try {
              const resp = await authService.authenticatedRequest('/addresses/data/cities');
              const data = await resp.json();
              if (data.success) {
                setCities(data.data || []);
              }
            } catch (e) {
              console.error('İller yüklenemedi:', e);
            }
          };

          // İlçeleri yükle
          const loadDistricts = async (cityId: string) => {
            try {
              const resp = await authService.authenticatedRequest(`/addresses/data/districts/${cityId}`);
              const data = await resp.json();
              if (data.success) {
                setDistricts(data.data || []);
              }
            } catch (e) {
              console.error('İlçeler yüklenemedi:', e);
            }
          };

          useEffect(() => {
            loadAddresses();
            loadCities();
          }, []);

          useEffect(() => {
            if (form.city) {
              loadDistricts(form.city);
            } else {
              setDistricts([]);
            }
          }, [form.city]);

          // Adres ekle/güncelle
          const saveAddress = async () => {
            // Validasyon
            if (!form.title || !form.fullName || !form.phone || !form.city || !form.district || !form.addressLine) {
              toast.error('Lütfen zorunlu alanları doldurun');
              return;
            }

            // Telefon formatı kontrolü
            const phoneRegex = /^(\+90|0)?[0-9]{10}$/;
            const cleanPhone = form.phone.replace(/\s/g, '').replace(/[-()+]/g, '');
            if (!phoneRegex.test(cleanPhone)) {
              toast.error('Geçerli bir telefon numarası girin');
              return;
            }

            // TC No kontrolü (bireysel fatura için)
            if (form.invoiceType === 'individual' && form.tcNo) {
              const tcRegex = /^[1-9][0-9]{10}$/;
              if (!tcRegex.test(form.tcNo)) {
                toast.error('Geçerli bir TC Kimlik No girin');
                return;
              }
            }

            // Kurumsal fatura kontrolü
            if (form.invoiceType === 'corporate' && (!form.companyName || !form.taxNumber || !form.taxOffice)) {
              toast.error('Kurumsal fatura için şirket bilgileri zorunludur');
              return;
            }

            try {
              setLoading(true);

              const cityName = cities.find(c => c.id === form.city)?.name || form.city;
              const formData = {
                ...form,
                city: cityName,
                phone: cleanPhone
              };

              const url = editingAddress ? `/addresses/${editingAddress._id}` : '/addresses';
              const method = editingAddress ? 'PUT' : 'POST';

              const resp = await authService.authenticatedRequest(url, {
                method,
                body: JSON.stringify(formData)
              });

              const data = await resp.json();

              if (data.success) {
                await Swal.fire({
                  icon: 'success',
                  title: editingAddress ? 'Adres Güncellendi' : 'Adres Eklendi',
                  text: editingAddress ? 'Adresiniz başarıyla güncellendi.' : 'Yeni adresiniz başarıyla eklendi.',
                  confirmButtonText: 'Tamam',
                  confirmButtonColor: '#28a745'
                });

                resetForm();
                await loadAddresses();
              } else {
                toast.error(data.message || 'İşlem başarısız');
              }
            } catch (e) {
              toast.error('Bir hata oluştu');
            } finally {
              setLoading(false);
            }
          };

          // Adresi sil
          const deleteAddress = async (id: string) => {
            const result = await Swal.fire({
              icon: 'warning',
              title: 'Adresi Sil',
              text: 'Bu adresi silmek istediğinize emin misiniz?',
              showCancelButton: true,
              confirmButtonText: 'Evet, Sil',
              cancelButtonText: 'İptal',
              confirmButtonColor: '#dc3545'
            });

            if (!result.isConfirmed) return;

            try {
              setLoading(true);
              const resp = await authService.authenticatedRequest(`/addresses/${id}`, {
                method: 'DELETE'
              });
              const data = await resp.json();

              if (data.success) {
                toast.success('Adres silindi');
                await loadAddresses();
              } else {
                toast.error(data.message || 'Adres silinemedi');
              }
            } catch (e) {
              toast.error('Adres silinemedi');
            } finally {
              setLoading(false);
            }
          };

          // Varsayılan adres yap
          const setDefaultAddress = async (id: string) => {
            try {
              setLoading(true);
              const resp = await authService.authenticatedRequest(`/addresses/${id}/set-default`, {
                method: 'POST'
              });
              const data = await resp.json();

              if (data.success) {
                toast.success('Varsayılan adres değiştirildi');
                await loadAddresses();
              } else {
                toast.error(data.message || 'İşlem başarısız');
              }
            } catch (e) {
              toast.error('İşlem başarısız');
            } finally {
              setLoading(false);
            }
          };

          // Formu sıfırla
          const resetForm = () => {
            setForm({
              title: '',
              type: 'home',
              fullName: '',
              phone: '',
              city: '',
              district: '',
              neighborhood: '',
              addressLine: '',
              buildingNo: '',
              floor: '',
              apartmentNo: '',
              postalCode: '',
              directions: '',
              isDefault: false,
              invoiceType: 'individual',
              tcNo: '',
              companyName: '',
              taxNumber: '',
              taxOffice: ''
            });
            setEditingAddress(null);
            setShowForm(false);
          };

          // Düzenleme için formu doldur
          const startEdit = (address: Address) => {
            const cityObj = cities.find(c => c.name === address.city);
            setForm({
              ...address,
              city: cityObj?.id || address.city
            });
            setEditingAddress(address);
            setShowForm(true);
          };

          return (
            <div className="container py-4 py-lg-5">
              <nav aria-label="breadcrumb" className="mb-4">
                <ol className="breadcrumb">
                  <li className="breadcrumb-item"><Link href="/">Ana Sayfa</Link></li>
                  <li className="breadcrumb-item"><Link href="/account">Hesabım</Link></li>
                  <li className="breadcrumb-item active" aria-current="page">Adreslerim</li>
                </ol >
              </nav >

              <div className="row g-4">
                <div className="col-lg-6">
                  <div className="card">
                    <div className="card-header d-flex align-items-center justify-content-between">
                      <h5 className="mb-0"><i className="ci-location me-2"></i>Adres Ekle</h5>
                      <span className="badge bg-info-subtle text-info border">Yeni</span>
                    </div>
                    <div className="card-body">
                      <div className="row g-3">
                        {['title', 'firstName', 'lastName', 'phone', 'address', 'city', 'district', 'postalCode'].map((k) => (
                          <div className={k === 'address' ? 'col-12' : 'col-md-6'} key={k}>
                            <label className="form-label text-capitalize"><i className="ci-edit me-2"></i>{k}</label>
                            <input className="form-control" value={form[k] || ''} onChange={(e) => setForm((p: any) => ({ ...p, [k]: e.target.value }))} />
                          </div>
                        ))}
                      </div>
                      <button className="btn btn-primary mt-3" disabled={loading} onClick={addAddress}><i className="ci-plus me-2"></i>Ekle</button>
                    </div>
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="card">
                    <div className="card-header"><h5 className="mb-0"><i className="ci-home me-2"></i>Adreslerim</h5></div>
                    <div className="card-body">
                      {loading ? (
                        <div className="text-center py-5"><div className="spinner-border"></div></div>
                      ) : addresses.length === 0 ? (
                        <div className="text-center text-muted py-5">
                          <img src="/assets/img/help/hero-light.png" width={220} className="mb-3" alt="Boş durum" />
                          <p>Kayıtlı adres yok. Hemen bir adres ekleyin.</p>
                        </div>
                      ) : (
                        addresses.map((a: any) => (
                          <div key={a._id} className="border rounded p-3 mb-3">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <strong>{a.title}</strong>
                                <div className="small text-muted">{a.firstName} {a.lastName} • {a.phone}</div>
                                <div className="small">{a.address}, {a.district}/{a.city} • {a.postalCode}</div>
                              </div>
                              <div>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => deleteAddress(a._id)}><i className="ci-trash me-1"></i>Sil</button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div >
          );
        }


=======
          <li className="breadcrumb-item active">Adreslerim</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <i className="fas fa-map-marker-alt me-2"></i>
          Adreslerim
        </h2>
        {!showForm && (
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
            disabled={addresses.length >= 10}
          >
            <i className="fas fa-plus me-2"></i>
            Yeni Adres Ekle
          </button>
        )}
      </div>

      {/* Adres Formu */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">
              <i className="fas fa-edit me-2"></i>
              {editingAddress ? 'Adresi Düzenle' : 'Yeni Adres Ekle'}
            </h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              {/* Adres Başlığı */}
              <div className="col-md-6">
                <label className="form-label">
                  Adres Başlığı <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Örn: Ev, İş, Yazlık"
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                />
              </div>

              {/* Adres Tipi */}
              <div className="col-md-6">
                <label className="form-label">Adres Tipi</label>
                <select
                  className="form-select"
                  value={form.type}
                  onChange={(e) => setForm({...form, type: e.target.value})}
                >
                  <option value="home">Ev</option>
                  <option value="work">İş</option>
                  <option value="other">Diğer</option>
                </select>
              </div>

              {/* Ad Soyad */}
              <div className="col-md-6">
                <label className="form-label">
                  Ad Soyad <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Alıcı adı soyadı"
                  value={form.fullName}
                  onChange={(e) => setForm({...form, fullName: e.target.value})}
                />
              </div>

              {/* Telefon */}
              <div className="col-md-6">
                <label className="form-label">
                  Telefon <span className="text-danger">*</span>
                </label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="5XX XXX XX XX"
                  value={form.phone}
                  onChange={(e) => setForm({...form, phone: e.target.value})}
                />
              </div>

              {/* İl */}
              <div className="col-md-6">
                <label className="form-label">
                  İl <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.city}
                  onChange={(e) => setForm({...form, city: e.target.value, district: ''})}
                >
                  <option value="">İl Seçin</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </div>

              {/* İlçe */}
              <div className="col-md-6">
                <label className="form-label">
                  İlçe <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.district}
                  onChange={(e) => setForm({...form, district: e.target.value})}
                  disabled={!form.city}
                >
                  <option value="">İlçe Seçin</option>
                  {districts.map((district, idx) => (
                    <option key={idx} value={district.name}>{district.name}</option>
                  ))}
                </select>
              </div>

              {/* Mahalle */}
              <div className="col-md-6">
                <label className="form-label">Mahalle</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Mahalle adı"
                  value={form.neighborhood}
                  onChange={(e) => setForm({...form, neighborhood: e.target.value})}
                />
              </div>

              {/* Posta Kodu */}
              <div className="col-md-6">
                <label className="form-label">Posta Kodu</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="34XXX"
                  value={form.postalCode}
                  onChange={(e) => setForm({...form, postalCode: e.target.value})}
                />
              </div>

              {/* Adres */}
              <div className="col-12">
                <label className="form-label">
                  Adres <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Cadde, sokak adı"
                  value={form.addressLine}
                  onChange={(e) => setForm({...form, addressLine: e.target.value})}
                />
              </div>

              {/* Bina No */}
              <div className="col-md-4">
                <label className="form-label">Bina No</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Örn: 12"
                  value={form.buildingNo}
                  onChange={(e) => setForm({...form, buildingNo: e.target.value})}
                />
              </div>

              {/* Kat */}
              <div className="col-md-4">
                <label className="form-label">Kat</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Örn: 3"
                  value={form.floor}
                  onChange={(e) => setForm({...form, floor: e.target.value})}
                />
              </div>

              {/* Daire No */}
              <div className="col-md-4">
                <label className="form-label">Daire No</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Örn: 7"
                  value={form.apartmentNo}
                  onChange={(e) => setForm({...form, apartmentNo: e.target.value})}
                />
              </div>

              {/* Adres Tarifi */}
              <div className="col-12">
                <label className="form-label">Adres Tarifi</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Teslimat için yol tarifi (opsiyonel)"
                  value={form.directions}
                  onChange={(e) => setForm({...form, directions: e.target.value})}
                />
              </div>

              {/* Fatura Tipi */}
              <div className="col-12">
                <label className="form-label">Fatura Tipi</label>
                <div className="btn-group w-100" role="group">
                  <input
                    type="radio"
                    className="btn-check"
                    id="individual"
                    checked={form.invoiceType === 'individual'}
                    onChange={() => setForm({...form, invoiceType: 'individual'})}
                  />
                  <label className="btn btn-outline-primary" htmlFor="individual">
                    <i className="fas fa-user me-2"></i>
                    Bireysel
                  </label>

                  <input
                    type="radio"
                    className="btn-check"
                    id="corporate"
                    checked={form.invoiceType === 'corporate'}
                    onChange={() => setForm({...form, invoiceType: 'corporate'})}
                  />
                  <label className="btn btn-outline-primary" htmlFor="corporate">
                    <i className="fas fa-building me-2"></i>
                    Kurumsal
                  </label>
                </div>
              </div>

              {/* Bireysel Fatura Bilgileri */}
              {form.invoiceType === 'individual' && (
                <div className="col-md-6">
                  <label className="form-label">TC Kimlik No</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="11 haneli TC No"
                    maxLength={11}
                    value={form.tcNo}
                    onChange={(e) => setForm({...form, tcNo: e.target.value.replace(/\D/g, '')})}
                  />
                </div>
              )}

              {/* Kurumsal Fatura Bilgileri */}
              {form.invoiceType === 'corporate' && (
                <>
                  <div className="col-md-6">
                    <label className="form-label">
                      Firma Adı <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.companyName}
                      onChange={(e) => setForm({...form, companyName: e.target.value})}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">
                      Vergi No <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.taxNumber}
                      onChange={(e) => setForm({...form, taxNumber: e.target.value})}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">
                      Vergi Dairesi <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.taxOffice}
                      onChange={(e) => setForm({...form, taxOffice: e.target.value})}
                    />
                  </div>
                </>
              )}

              {/* Varsayılan Adres */}
              <div className="col-12">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isDefault"
                    checked={form.isDefault}
                    onChange={(e) => setForm({...form, isDefault: e.target.checked})}
                  />
                  <label className="form-check-label" htmlFor="isDefault">
                    Bu adresi varsayılan teslimat adresim olarak ayarla
                  </label>
                </div>
              </div>
            </div>

            {/* Butonlar */}
            <div className="d-flex gap-2 mt-4">
              <button
                className="btn btn-primary"
                onClick={saveAddress}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    İşleniyor...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-2"></i>
                    {editingAddress ? 'Güncelle' : 'Kaydet'}
                  </>
                )}
              </button>
              <button
                className="btn btn-secondary"
                onClick={resetForm}
                disabled={loading}
              >
                <i className="fas fa-times me-2"></i>
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adres Listesi */}
      <div className="row g-4">
        {loading && !showForm ? (
          <div className="col-12 text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Yükleniyor...</span>
            </div>
          </div>
        ) : addresses.length === 0 ? (
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center py-5">
                <img
                  src="/assets/img/help/hero-light.png"
                  width={200}
                  className="mb-4"
                  alt="Boş durum"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <h5>Henüz kayıtlı adresiniz yok</h5>
                <p className="text-muted">
                  Teslimat için en az bir adres eklemeniz gerekmektedir.
                </p>
                {!showForm && (
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(true)}
                  >
                    <i className="fas fa-plus me-2"></i>
                    İlk Adresimi Ekle
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          addresses.map((address) => (
            <div key={address._id} className="col-md-6">
              <div className={`card h-100 ${address.isDefault ? 'border-primary' : ''}`}>
                {address.isDefault && (
                  <div className="card-header bg-primary text-white">
                    <small>
                      <i className="fas fa-star me-1"></i>
                      Varsayılan Adres
                    </small>
                  </div>
                )}
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 className="card-title mb-1">{address.title}</h5>
                      <span className={`badge ${
                        address.type === 'home' ? 'bg-success' :
                        address.type === 'work' ? 'bg-info' : 'bg-secondary'
                      }`}>
                        {address.type === 'home' ? 'Ev' :
                         address.type === 'work' ? 'İş' : 'Diğer'}
                      </span>
                    </div>
                    <div className="dropdown">
                      <button
                        className="btn btn-sm btn-light"
                        type="button"
                        data-bs-toggle="dropdown"
                      >
                        <i className="fas fa-ellipsis-v"></i>
                      </button>
                      <ul className="dropdown-menu">
                        <li>
                          <button
                            className="dropdown-item"
                            onClick={() => startEdit(address)}
                          >
                            <i className="fas fa-edit me-2"></i>
                            Düzenle
                          </button>
                        </li>
                        {!address.isDefault && (
                          <li>
                            <button
                              className="dropdown-item"
                              onClick={() => setDefaultAddress(address._id)}
                            >
                              <i className="fas fa-star me-2"></i>
                              Varsayılan Yap
                            </button>
                          </li>
                        )}
                        <li><hr className="dropdown-divider" /></li>
                        <li>
                          <button
                            className="dropdown-item text-danger"
                            onClick={() => deleteAddress(address._id)}
                          >
                            <i className="fas fa-trash me-2"></i>
                            Sil
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex align-items-center mb-2">
                      <i className="fas fa-user text-muted me-2"></i>
                      <strong>{address.fullName}</strong>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <i className="fas fa-phone text-muted me-2"></i>
                      <span>{address.phone}</span>
                    </div>
                    <div className="d-flex align-items-start">
                      <i className="fas fa-map-marker-alt text-muted me-2 mt-1"></i>
                      <div>
                        <p className="mb-0">
                          {address.fullAddress || `${address.addressLine}, ${address.district}/${address.city}`}
                        </p>
                        {address.directions && (
                          <small className="text-muted">
                            <i className="fas fa-route me-1"></i>
                            {address.directions}
                          </small>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Fatura Bilgileri */}
                  <div className="border-top pt-2">
                    <small className="text-muted">
                      {address.invoiceType === 'corporate' ? (
                        <>
                          <i className="fas fa-building me-1"></i>
                          Kurumsal: {address.companyName}
                        </>
                      ) : (
                        <>
                          <i className="fas fa-user me-1"></i>
                          Bireysel Fatura
                        </>
                      )}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bilgi Notu */}
      {addresses.length > 0 && addresses.length < 10 && (
        <div className="alert alert-info mt-4">
          <i className="fas fa-info-circle me-2"></i>
          En fazla 10 adres ekleyebilirsiniz. ({addresses.length}/10)
        </div>
      )}
    </div>
  );
}
>>>>>>> 8cb892cd3cd6e5f9003894aa9c8da785c0c212dd
