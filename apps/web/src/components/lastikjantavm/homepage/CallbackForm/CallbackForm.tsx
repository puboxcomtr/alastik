'use client';
// Anasayfa "Biz Sizi Arayalım" formu — tüm alanlar tek satırda (masaüstü), mobilde alt alta
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '@/src/config/api';
import { useDefinition } from '@/src/hooks/Theme/useDefinition';

type Option = { key: string; label: string };
type Options = { topics: Option[]; timeSlots: Option[] };

const EMPTY_FORM = { name: '', phone: '', topic: '', timeSlot: '' };

// WhatsApp bağlantısı: 0532 123 45 67 -> https://wa.me/905321234567
const whatsappUrl = (phone: string): string => `https://wa.me/${phone.replace(/\D/g, '').replace(/^0/, '90')}`;

// Telefonu "0532 123 45 67" biçiminde göster
const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    const parts = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9, 11)].filter(Boolean);

    return parts.join(' ');
};

export default function CallbackForm({ site = 'lastikjantavm' }: { site?: string }) {
    const [options, setOptions] = useState<Options>({ topics: [], timeSlots: [] });
    const [form, setForm] = useState(EMPTY_FORM);
    const [sending, setSending] = useState(false);
    const { definition } = useDefinition();
    // Servis noktaları (Tanımlar > Servis Noktaları) — WhatsApp butonları buradan üretilir
    const servicePoints: { name: string; phone: string }[] = (definition?.serviceInfo?.points || []).filter((p: any) => p?.name && p?.phone);

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const res = await fetch(API_ENDPOINTS.contact.callbackOptions(), { headers: { 'X-Site': site } });
                const result = await res.json();
                if (result.success && result.data) setOptions(result.data);
            } catch (error) {
                console.error('Form seçenekleri yüklenemedi:', error);
            }
        };
        loadOptions();
    }, [site]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.name.trim().length < 2) {
            toast.error('Lütfen adınızı girin');
            return;
        }
        if (form.phone.replace(/\D/g, '').length < 10) {
            toast.error('Lütfen geçerli bir telefon numarası girin');
            return;
        }

        setSending(true);
        try {
            const res = await fetch(API_ENDPOINTS.contact.callback(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Site': site },
                body: JSON.stringify(form)
            });
            const result = await res.json();

            if (result.success) {
                toast.success(result.message || 'Talebiniz alındı');
                setForm(EMPTY_FORM);
            } else {
                toast.error(result.message || 'Talebiniz iletilemedi');
            }
        } catch (error) {
            console.error('Geri arama talebi gönderilemedi:', error);
            toast.error('Bağlantı hatası, lütfen tekrar deneyin');
        } finally {
            setSending(false);
        }
    };

    return (
        <section id="callback_form" className="container mb-4">
            <div className="row-fluid">
                <div className="text-white rounded-4 px-4 px-lg-5 py-4" style={{ backgroundColor: '#000' }}>
                    {/* Üst satır: başlık (sol) + WhatsApp butonları (sağ) */}
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                        <div>
                            <h2 className="h4 mb-1 text-white">Biz Sizi Arayalım</h2>
                            <p className="mb-0 fs-sm text-white-50">Bilgilerinizi bırakın, uzmanlarımız sizi arasın.</p>
                        </div>
                        {servicePoints.length > 0 && (
                            <div className="d-flex flex-wrap gap-2">
                                {servicePoints.map((point) => (
                                    <a
                                        key={point.name}
                                        href={whatsappUrl(point.phone)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn d-inline-flex align-items-center text-start rounded-3 px-3 py-2"
                                        style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', lineHeight: 1.2 }}
                                    >
                                        {/* İkon iki satırlı metnin dikey ortasında */}
                                        <i className="ri-whatsapp-line me-2" style={{ fontSize: '1.75rem' }}></i>
                                        <span className="d-flex flex-column">
                                            <span className="fw-semibold">{point.name}</span>
                                            <span className="fs-xs">WhatsApp ile İletişim</span>
                                        </span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="row g-3 align-items-center">
                            <div className="col-12 col-md-6 col-xl-3">
                                <input
                                    type="text"
                                    className="form-control form-control-lg"
                                    placeholder="Ad Soyad"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    autoComplete="name"
                                    required
                                />
                            </div>
                            <div className="col-12 col-md-6 col-xl-3">
                                <input
                                    type="tel"
                                    className="form-control form-control-lg"
                                    placeholder="Telefon"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                                    inputMode="tel"
                                    autoComplete="tel"
                                    required
                                />
                            </div>
                            <div className="col-12 col-md-6 col-xl-2">
                                <select
                                    className="form-select form-select-lg"
                                    value={form.topic}
                                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                                >
                                    <option value="">Konu</option>
                                    {options.topics.map((t) => (
                                        <option key={t.key} value={t.key}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-12 col-md-6 col-xl-2">
                                <select
                                    className="form-select form-select-lg"
                                    value={form.timeSlot}
                                    onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                                >
                                    <option value="">Uygun Saat</option>
                                    {options.timeSlots.map((t) => (
                                        <option key={t.key} value={t.key}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-12 col-xl-2 d-grid">
                                <button
                                    type="submit"
                                    className="btn btn-lg text-nowrap fw-semibold"
                                    style={{ backgroundColor: 'var(--cz-primary)', color: '#000', border: 'none' }}
                                    disabled={sending}
                                >
                                    {sending ? '...' : 'Gönder'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    );
}
