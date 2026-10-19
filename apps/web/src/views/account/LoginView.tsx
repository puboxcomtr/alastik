'use client';

import { useState, useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { toast } from 'react-toastify';

import { api } from '@lib/api';
import { useTranslations } from '@/src/hooks/Theme/useTranslations';
import { useAuth } from '@/src/hooks/Theme/useAuth';
import { useCart } from '@/src/context/CartContext';

import { ROUTES } from '@/src/config/routes';

import { getSetting } from '@/src/hooks/Theme/useGeneralSettings';

export default function LoginView() {
    const router = useRouter();
    const { t } = useTranslations('form');
    const { setAuth, clearAuth } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [guestCheckoutEnabled, setGuestCheckoutEnabled] = useState(false);

    const [forgotModalOpen, setForgotModalOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const searchParams = useSearchParams();
    const { items, loading: cartLoading } = useCart();
    const isFromCheckout = searchParams.get('from') === 'checkout' && items.length > 0;
    useEffect(() => {
        if (cartLoading) return;
        if (searchParams.get('from') === 'checkout' && items.length === 0) {
            router.replace(ROUTES.LOGIN);
        }
    }, [items, searchParams, router, cartLoading]);

    useEffect(() => {
        const checkGuestCheckout = async () => {
            const value = await getSetting('guestCheckout');
            setGuestCheckoutEnabled(String(value) === 'true');
        };
        checkGuestCheckout();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            clearAuth();

            const result = await api.login(formData.email, formData.password);

            if (result.success) {
                toast.success('Giriş başarılı');

                if (result.data?.token && result.data?.member) {
                    setAuth(result.data.token, result.data.member);
                    document.cookie = `authToken=${result.data.token}; path=/; max-age=${30 * 24 * 60 * 60}`;
                    window.location.href = isFromCheckout ? ROUTES.CHECKOUT : ROUTES.ACCOUNT;
                }
            } else {
                toast.error(result.message || 'Giriş başarısız');
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!forgotEmail) {
            toast.error('Lütfen e-posta adresinizi giriniz');
            return;
        }

        setForgotLoading(true);

        try {
            const result = await api.post('/auth/forgot-password', { email: forgotEmail });

            if (result.success) {
                toast.success(result.message || 'Şifre sıfırlama bağlantısı gönderildi');
                setForgotEmail('');
                setForgotModalOpen(false);
            } else {
                toast.error(result.message || 'İşlem başarısız');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            toast.error('Bir hata oluştu');
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="container py-5">
            <div className="row justify-content-center">
                <div className="col-lg-10">
                    <div className="card shadow">
                        <div className="row g-0">
                            <div className="col-md-6 p-5">
                                <h5 className="mb-4 h5">{t('login_title')}</h5>
                                <form onSubmit={handleSubmit}>
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
                                    <div className='d-flex justify-content-between align-items-center mb-4'>
                                        <div>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="btn btn-primary w-100 px-5"
                                            >
                                                {loading ? t('logging_in') : t('login_button')}
                                            </button>
                                        </div>
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => setForgotModalOpen(true)}
                                                className="btn btn-link p-0 fs-sm text-muted"
                                                style={{ textDecoration: 'none' }}
                                            >
                                                {t('forgot_password')}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                                <div className="d-flex justify-content-end">
                                    <p className="text-success small fw-medium">
                                        <i className="ri-lock-line me-1"></i>
                                        {t('secure_data')}
                                    </p>
                                </div>
                            </div>
                            <div className="col-md-6 bg-light p-5 d-flex flex-column justify-content-center">
                                <h5 className="mb-4 h5">{t('register_title')}</h5>
                                <p className="text-muted mb-4">
                                    {t('register_description')}
                                </p>

                                <div className="mb-4">
                                    <div className="d-flex align-items-center mb-2">
                                        <i className="ri-car-fill text-danger me-1 fs-xl"></i>
                                        <span className='fs-sm fw-normal text-black'>{t('benefit_garage')}</span>
                                    </div>
                                    <div className="d-flex align-items-center mb-2">
                                        <i className="ri-map-pin-fill text-danger me-1 fs-xl"></i>
                                        <span className='fs-sm fw-normal text-black'>{t('benefit_tracking')}</span>
                                    </div>
                                    <div className="d-flex align-items-center mb-2">
                                        <i className="ri-discount-percent-fill text-danger me-1 fs-xl"></i>
                                        <span className='fs-sm fw-normal text-black'>{t('benefit_orders')}</span>
                                    </div>
                                </div>

                                <div className='d-flex justify-content-between align-items-center mb-4'>
                                    <div>
                                        <Link href={ROUTES.REGISTER}
                                            className="btn btn-primary w-100 px-5">
                                            {t('register_button')}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                            {isFromCheckout && guestCheckoutEnabled && (
                                <div className="col-12 p-4 border-top">
                                    <div className="text-center">
                                        <p className="text-muted mb-3">Üye olmadan da alışveriş yapabilirsiniz</p>
                                        <button
                                            type="button"
                                            className="btn btn-outline-dark px-5"
                                            onClick={() => {
                                                const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                                                sessionStorage.setItem('guestCheckoutId', guestId);
                                                router.push(ROUTES.CHECKOUT);
                                            }}
                                        >
                                            Üyeliksiz Alışveriş
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {forgotModalOpen && (
                <>
                    <div
                        className="modal fade show d-block"
                        tabIndex={-1}
                        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                        onClick={() => !forgotLoading && setForgotModalOpen(false)}
                    >
                        <div
                            className="modal-dialog modal-dialog-centered"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Şifremi Unuttum</h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => !forgotLoading && setForgotModalOpen(false)}
                                        disabled={forgotLoading}
                                    ></button>
                                </div>
                                <form onSubmit={handleForgotSubmit}>
                                    <div className="modal-body">
                                        <p className="text-muted mb-3">
                                            Kayıtlı e-posta adresinizi giriniz. Şifre sıfırlama bağlantısı tarafınıza gönderilecektir.
                                        </p>
                                        <div className="mb-3">
                                            <label className="form-label">E-posta Adresi</label>
                                            <input
                                                type="email"
                                                value={forgotEmail}
                                                onChange={(e) => setForgotEmail(e.target.value)}
                                                className="form-control"
                                                placeholder="ornek@mail.com"
                                                style={{
                                                    borderRadius: '0.375rem',
                                                    border: '1px solid black',
                                                    padding: '0.75rem'
                                                }}
                                                required
                                                autoFocus
                                                disabled={forgotLoading}
                                            />
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setForgotModalOpen(false)}
                                            disabled={forgotLoading}
                                        >
                                            Vazgeç
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={forgotLoading}
                                        >
                                            {forgotLoading ? 'Gönderiliyor...' : 'Bağlantı Gönder'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}