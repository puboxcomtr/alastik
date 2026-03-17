'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { api } from '@/src/lib/api';
import { useTranslations } from '@/src/hooks/Theme/useTranslations';
import { useAuth } from '@/src/hooks/Theme/useAuth';
import { ROUTES } from '@/src/config/routes';

export default function RegisterView() {
    const router = useRouter();
    const { t } = useTranslations('form');
    const { isLoggedIn, setAuth, clearAuth } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '+90 ',
        password: '',
        passwordConfirm: '',
        marketingConsent: true,
        termsAccepted: true
    });

    useEffect(() => {
        if (isLoggedIn) {
            router.replace(ROUTES.ACCOUNT);
        }
    }, [isLoggedIn, router]);

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
            if (formData.password !== formData.passwordConfirm) {
                toast.error('Şifreler eşleşmiyor');
                setLoading(false);
                return;
            }
            const phoneDigits = formData.phone.replace(/\D/g, '');
            if (phoneDigits.length < 12) {
                toast.error('Lütfen geçerli bir telefon numarası girin');
                setLoading(false);
                return;
            }

            clearAuth();

            const result = await api.register(formData);

            if (result.success) {
                toast.success(result.message || 'Üyeliğiniz başarıyla oluşturuldu');

                if (result.data?.token && result.data?.member) {
                    setAuth(result.data.token, result.data.member);
                    router.replace(ROUTES.ACCOUNT);
                } else {
                    setTimeout(() => {
                        router.push(ROUTES.LOGIN);
                    }, 1500);
                }
            } else {
                toast.error(result.message || 'Kayıt başarısız');
            }
        } catch (error) {
            console.error('Register error:', error);
            toast.error('Bir hata oluştu');
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
                            {/* Sol Taraf - Register Form */}
                            <div className="col-md-6 p-5">
                                <h5 className="mb-4 h5">{t('register_title')}</h5>

                                <form onSubmit={handleSubmit}>
                                    <div className="row g-3 mb-3">
                                        <div className="col-6">
                                            <label className="form-label">{t('first_name_label')}</label>
                                            <input
                                                type="text"
                                                name="firstName"
                                                value={formData.firstName}
                                                onChange={handleChange}
                                                className="form-control"
                                                placeholder={t('first_name_placeholder')}
                                                style={{
                                                    borderRadius: '0.375rem',
                                                    border: '1px solid black',
                                                    padding: '0.75rem'
                                                }}
                                                required
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label">{t('last_name_label')}</label>
                                            <input
                                                type="text"
                                                name="lastName"
                                                value={formData.lastName}
                                                onChange={handleChange}
                                                className="form-control"
                                                placeholder={t('last_name_placeholder')}
                                                style={{
                                                    borderRadius: '0.375rem',
                                                    border: '1px solid black',
                                                    padding: '0.75rem'
                                                }}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">{t('email_label')}</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="form-control"
                                            placeholder={t('email_placeholder')}
                                            style={{
                                                borderRadius: '0.375rem',
                                                border: '1px solid black',
                                                padding: '0.75rem'
                                            }}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">{t('phone_label')}</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handlePhoneChange}
                                            className="form-control"
                                            placeholder="+90 5XX XXX XX XX"
                                            style={{
                                                borderRadius: '0.375rem',
                                                border: '1px solid black',
                                                padding: '0.75rem'
                                            }}
                                            required
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">{t('password_label')}</label>
                                        <div className="position-relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                className="form-control"
                                                placeholder={t('password_placeholder')}
                                                style={{
                                                    borderRadius: '0.375rem',
                                                    border: '1px solid black',
                                                    padding: '0.75rem'
                                                }}
                                                required
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="btn btn-link position-absolute end-0 top-50 translate-middle-y"
                                                style={{ textDecoration: 'none', color: 'black' }}
                                            >
                                                <i className={`ri-eye${showPassword ? '-off' : ''}-line`}></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">{t('password_confirm_label')}</label>
                                        <div className="position-relative">
                                            <input
                                                type={showPasswordConfirm ? 'text' : 'password'}
                                                name="passwordConfirm"
                                                value={formData.passwordConfirm}
                                                onChange={handleChange}
                                                className="form-control"
                                                placeholder={t('password_confirm_placeholder')}
                                                style={{
                                                    borderRadius: '0.375rem',
                                                    border: '1px solid black',
                                                    padding: '0.75rem'
                                                }}
                                                required
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                                className="btn btn-link position-absolute end-0 top-50 translate-middle-y"
                                                style={{ textDecoration: 'none', color: 'black' }}
                                            >
                                                <i className={`ri-eye${showPasswordConfirm ? '-off' : ''}-line`}></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <div className="form-check">
                                            <input
                                                type="checkbox"
                                                name="marketingConsent"
                                                checked={formData.marketingConsent}
                                                onChange={handleChange}
                                                className="form-check-input cursor-pointer"
                                                id="marketingConsent"
                                            />
                                            <label className="form-check-label fs-sm cursor-pointer" htmlFor="marketingConsent">
                                                {t('marketing_consent')}
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
                                                className="form-check-input cursor-pointer"
                                                id="termsAccepted"
                                                required
                                            />
                                            <label className="form-check-label fs-sm cursor-pointer" htmlFor="termsAccepted">
                                                {t('terms_accept')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="btn btn-primary w-100 px-5"
                                            >
                                                {loading ? t('registering') : t('register_button')}
                                            </button>
                                        </div>
                                        <div className="text-success small fw-medium">
                                            <i className="ri-lock-line me-1"></i>
                                            {t('secure_data')}
                                        </div>
                                    </div>
                                </form>

                                <div className="d-flex justify-content-end mt-3">
                                </div>
                            </div>

                            {/* Sağ Taraf - Login Bilgi */}
                            <div className="col-md-6 bg-light p-5 d-flex flex-column justify-content-center">
                                <h5 className="mb-4 h5">{t('already_member')}</h5>
                                <p className="text-muted mb-4">
                                    {t('login_description')}
                                </p>

                                <div className="d-flex justify-content-between align-items-center">
                                    <Link href={ROUTES.LOGIN} className="btn btn-primary px-5">
                                        {t('login_button')}
                                    </Link>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}