'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { api } from '@/src/lib/api';

export default function RegisterView() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '+90 ',
        password: '',
        passwordConfirm: '',
        marketingConsent: false,
        termsAccepted: false
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');

        if (value.startsWith('90')) {
            value = value.slice(2);
        }

        if (value.length > 10) {
            value = value.slice(0, 10);
        }

        let formatted = '+90';
        if (value.length > 0) {
            formatted += ' ' + value.slice(0, 3);
        }
        if (value.length > 3) {
            formatted += ' ' + value.slice(3, 6);
        }
        if (value.length > 6) {
            formatted += ' ' + value.slice(6, 8);
        }
        if (value.length > 8) {
            formatted += ' ' + value.slice(8, 10);
        }

        setFormData(prev => ({ ...prev, phone: formatted }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await api.register(formData);

            if (result.success) {
                toast.success(result.message || 'Üyeliğiniz başarıyla oluşturuldu.');
                setTimeout(() => {
                    router.push('/giris-yap');
                }, 1500);
            } else {
                toast.error(result.message || 'Bir hata oluştu.');
            }
        } catch (error) {
            toast.error('Bir hata oluştu. Lütfen tekrar deneyiniz.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container py-5">
            <div className="row justify-content-center">
                <div className="col-lg-10">
                    <div className="card shadow">
                        <div className="row g-0">

                            <div className="col-md-6 bg-light p-5 d-flex flex-column justify-content-center">
                                <h5 className="mb-3">Giriş Yap</h5>
                                <p className="text-muted mb-4">
                                    Zaten üye misiniz? Giriş yapın.
                                </p>
                                <Link href="/giris-yap" className="btn btn-outline-dark">
                                    Giriş Yap
                                </Link>
                            </div>

                            {/* Sağ Taraf - Register Form */}
                            <div className="col-md-6 p-5">
                                <h1 className="mb-4">Üye Ol</h1>
                                <p className="text-muted mb-4">
                                    Üye olun ve online mağazamızın özel avantajlarından yararlanın.
                                </p>

                                <div className="mb-4">
                                    <div className="d-flex align-items-center mb-2">
                                        <div className="rounded-circle bg-danger bg-opacity-10 p-2 me-3">
                                            <i className="ri-check-line text-danger"></i>
                                        </div>
                                        <span className="small">Garajımı kaydet</span>
                                    </div>
                                    <div className="d-flex align-items-center mb-2">
                                        <div className="rounded-circle bg-danger bg-opacity-10 p-2 me-3">
                                            <i className="ri-check-line text-danger"></i>
                                        </div>
                                        <span className="small">Teslimat durumu takibi</span>
                                    </div>
                                    <div className="d-flex align-items-center mb-2">
                                        <div className="rounded-circle bg-danger bg-opacity-10 p-2 me-3">
                                            <i className="ri-check-line text-danger"></i>
                                        </div>
                                        <span className="small">Sipariş geçmişi</span>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit}>
                                    <div className="row g-3">
                                        <div className="col-6">
                                            <label className="form-label">Ad *</label>
                                            <input
                                                type="text"
                                                name="firstName"
                                                value={formData.firstName}
                                                onChange={handleChange}
                                                className="form-control"
                                                required
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label">Soyad *</label>
                                            <input
                                                type="text"
                                                name="lastName"
                                                value={formData.lastName}
                                                onChange={handleChange}
                                                className="form-control"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3 mt-3">
                                        <label className="form-label">E-posta *</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="form-control"
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Cep Telefonu *</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handlePhoneChange}
                                            className="form-control"
                                            placeholder="+90 5XX XXX XX XX"
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Şifre *</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            className="form-control"
                                            required
                                            minLength={6}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Şifre Tekrar *</label>
                                        <input
                                            type="password"
                                            name="passwordConfirm"
                                            value={formData.passwordConfirm}
                                            onChange={handleChange}
                                            className="form-control"
                                            required
                                            minLength={6}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <div className="form-check">
                                            <input
                                                type="checkbox"
                                                name="marketingConsent"
                                                checked={formData.marketingConsent}
                                                onChange={handleChange}
                                                className="form-check-input"
                                                id="marketingConsent"
                                            />
                                            <label className="form-check-label small" htmlFor="marketingConsent">
                                                ALastik kampanyalarından haberdar olmak istiyor, tarafıma Ticari Elektronik İleti gönderilmesini rıza metni kapsamında onaylıyorum.
                                            </label>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <div className="form-check">
                                            <input
                                                type="checkbox"
                                                name="termsAccepted"
                                                checked={formData.termsAccepted}
                                                onChange={handleChange}
                                                className="form-check-input"
                                                id="termsAccepted"
                                                required
                                            />
                                            <label className="form-check-label small" htmlFor="termsAccepted">
                                                <Link href="/uyelik-sozlesmesi" className="text-danger">
                                                    Üyelik Sözleşmesi
                                                </Link>
                                                'ni onaylıyorum ve{' '}
                                                <Link href="/gizlilik-politikasi" className="text-danger">
                                                    Gizlilik ve Veri Koruma Politikası
                                                </Link>{' '}
                                                ile{' '}
                                                <Link href="/aydinlatma-metni" className="text-danger">
                                                    Aydınlatma Metni
                                                </Link>
                                                'ni okudum. *
                                            </label>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn btn-danger w-100"
                                    >
                                        {loading ? 'Kaydediliyor...' : 'Üye Ol'}
                                    </button>
                                </form>

                                <p className="text-muted small mt-3">
                                    <i className="ri-lock-line me-2"></i>
                                    Verileriniz güvenli bir şekilde aktarılmaktadır.
                                </p>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}