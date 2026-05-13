'use client';

/* * React Core * */
import { useState, useEffect } from 'react';

/* * Next.js * */
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

/* * Third Party Libraries */
import { toast } from 'react-toastify';

/* * Internal Imports  */
import { api } from '@lib/api';

/* Routes */
import { ROUTES } from '@/src/config/routes';

export default function ResetPasswordView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [tokenChecked, setTokenChecked] = useState(false);

    const [formData, setFormData] = useState({
        newPassword: '',
        newPasswordConfirm: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    /* Token kontrolü - URL'de token var mı */
    useEffect(() => {
        if (!token) {
            toast.error('Geçersiz bağlantı. Lütfen şifre sıfırlama talebinizi tekrarlayınız.');
        }
        setTokenChecked(true);
    }, [token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            toast.error('Geçersiz bağlantı.');
            return;
        }

        if (formData.newPassword !== formData.newPasswordConfirm) {
            toast.error('Şifreler eşleşmiyor.');
            return;
        }

        if (formData.newPassword.length < 6) {
            toast.error('Şifre en az 6 karakter olmalıdır.');
            return;
        }

        setLoading(true);

        try {
            const result = await api.post('/auth/reset-password', {
                token,
                newPassword: formData.newPassword,
                newPasswordConfirm: formData.newPasswordConfirm
            });

            if (result.success) {
                toast.success(result.message || 'Şifreniz başarıyla sıfırlandı.');
                setSuccess(true);

                // 2 saniye sonra login'e yönlendir
                setTimeout(() => {
                    router.push(ROUTES.LOGIN);
                }, 2000);
            } else {
                toast.error(result.message || 'Şifre sıfırlama başarısız.');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            toast.error('Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    if (!tokenChecked) {
        return null;
    }

    return (
        <div className="container py-5">
            <div className="row justify-content-center">
                <div className="col-md-6 col-lg-5">
                    <div className="card shadow">
                        <div className="card-body p-5">
                            <h5 className="h4 text-center mb-0">Şifre Sıfırlama</h5>
                            {!token ? (
                                /* Token yok - hata mesajı */
                                <div className="text-center">
                                    <i className="ri-error-warning-line text-danger" style={{ fontSize: '3rem' }}></i>
                                    <p className="text-muted mt-3 mb-4">
                                        Geçersiz veya eksik bağlantı.<br />
                                        Lütfen şifre sıfırlama talebinizi tekrarlayınız.
                                    </p>
                                    <Link href={ROUTES.LOGIN} className="btn btn-primary px-4">
                                        Giriş Sayfasına Dön
                                    </Link>
                                </div>
                            ) : success ? (
                                /* Başarılı durum */
                                <div className="text-center">
                                    <i className="ri-checkbox-circle-line text-success" style={{ fontSize: '3rem' }}></i>
                                    <p className="text-muted mt-3 mb-4">
                                        Şifreniz başarıyla sıfırlandı.<br />
                                        Giriş sayfasına yönlendiriliyorsunuz...
                                    </p>
                                </div>
                            ) : (
                                /* Şifre formu */
                                <>
                                    <p className="text-muted mb-4 text-center">
                                        Yeni şifrenizi oluşturarak hesabınıza tekrar erişebilirsiniz.
                                    </p>
                                    <form onSubmit={handleSubmit}>
                                        <div className="mb-3">
                                            <label className="form-label">Yeni Şifre</label>
                                            <div className="position-relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    name="newPassword"
                                                    value={formData.newPassword}
                                                    onChange={handleChange}
                                                    className="form-control"
                                                    placeholder="En az 6 karakter"
                                                    style={{
                                                        borderRadius: '0.375rem',
                                                        border: '1px solid black',
                                                        padding: '0.75rem'
                                                    }}
                                                    required
                                                    minLength={6}
                                                    disabled={loading}
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

                                        <div className="mb-4">
                                            <label className="form-label">Yeni Şifre (Tekrar)</label>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="newPasswordConfirm"
                                                value={formData.newPasswordConfirm}
                                                onChange={handleChange}
                                                className="form-control"
                                                placeholder="Şifrenizi tekrar giriniz"
                                                style={{
                                                    borderRadius: '0.375rem',
                                                    border: '1px solid black',
                                                    padding: '0.75rem'
                                                }}
                                                required
                                                minLength={6}
                                                disabled={loading}
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="btn btn-primary w-100"
                                        >
                                            {loading ? 'İşleniyor...' : 'Şifreyi Sıfırla'}
                                        </button>

                                        <div className="text-center mt-3">
                                            <Link href={ROUTES.LOGIN} className="fs-sm text-muted" style={{ textDecoration: 'none' }}>
                                                Giriş sayfasına dön
                                            </Link>
                                        </div>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}