'use client';

import { useState, useEffect, useRef } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { toast } from 'react-toastify';

import { api } from '@lib/api';

import { ROUTES } from '@/src/config/routes';

type ActivationStatus = 'loading' | 'success' | 'error';

export default function ActivationView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<ActivationStatus>('loading');
    const [message, setMessage] = useState('Hesabınız aktif ediliyor...');

    const calledRef = useRef(false);

    useEffect(() => {
        if (calledRef.current) return;
        calledRef.current = true;

        if (!token) {
            setStatus('error');
            setMessage('Geçersiz aktivasyon bağlantısı.');
            return;
        }

        const activate = async () => {
            try {
                const result = await api.post('/auth/activate', { token });

                if (result.success) {
                    setStatus('success');
                    setMessage(result.message || 'Hesabınız başarıyla aktif edildi.');
                    toast.success(result.message || 'Hesabınız başarıyla aktif edildi.');

                    setTimeout(() => {
                        router.push(ROUTES.LOGIN);
                    }, 2500);
                } else {
                    setStatus('error');
                    setMessage(result.message || 'Aktivasyon başarısız.');
                    toast.error(result.message || 'Aktivasyon başarısız.');
                }
            } catch (error) {
                console.error('Activation error:', error);
                setStatus('error');
                setMessage('Bir hata oluştu. Lütfen tekrar deneyiniz.');
                toast.error('Bir hata oluştu.');
            }
        };

        activate();
    }, [token, router]);

    return (
        <div className="container py-5">
            <div className="row justify-content-center">
                <div className="col-md-6 col-lg-5">
                    <div className="card shadow">
                        <div className="card-body p-5 text-center">
                            <h5 className="mb-4 h5">Hesap Aktivasyonu</h5>

                            {status === 'loading' && (
                                <>
                                    <div
                                        className="spinner-border text-primary"
                                        role="status"
                                        style={{ width: '3rem', height: '3rem' }}
                                    >
                                        <span className="visually-hidden">Yükleniyor...</span>
                                    </div>
                                    <p className="text-muted mt-4 mb-0">{message}</p>
                                </>
                            )}

                            {status === 'success' && (
                                <>
                                    <i className="ri-checkbox-circle-line text-success" style={{ fontSize: '3rem' }}></i>
                                    <p className="text-muted mt-3 mb-3">{message}</p>
                                    <p className="text-muted small mb-0">
                                        Giriş sayfasına yönlendiriliyorsunuz...
                                    </p>
                                </>
                            )}

                            {status === 'error' && (
                                <>
                                    <i className="ri-error-warning-line text-danger" style={{ fontSize: '3rem' }}></i>
                                    <p className="text-muted mt-3 mb-4">{message}</p>
                                    <Link href={ROUTES.LOGIN} className="btn btn-primary px-4">
                                        Giriş Sayfasına Dön
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}