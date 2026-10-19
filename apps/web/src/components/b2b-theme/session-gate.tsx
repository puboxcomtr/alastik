'use client';
import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';
import { SpinnerIcon } from '@components/b2b-theme/icons';
import { MandatoryPasswordChange } from '@components/b2b-theme/mandatory-password-change';
import { PlasiyerBayiSecModal } from '@components/b2b-theme/plasiyer-bayi-sec-modal';

export function SessionGate({ children }: { children: React.ReactNode }) {
    const [hazir, setHazir] = useState(false);
    const [sifreBayi, setSifreBayi] = useState(false);
    const [sifrePlasiyer, setSifrePlasiyer] = useState(false);
    const [bayiSec, setBayiSec] = useState(false);

    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        const plasiyerToken = localStorage.getItem('plasiyerToken');

        if (authToken) {
            fetch(API_ENDPOINTS.b2b.me(), { headers: { Authorization: `Bearer ${authToken}` } })
                .then(r => r.json())
                .then(d => {
                    if (d?.success) {
                        if (d.data?.mustChangePassword && sessionStorage.getItem('sifreHatirlatma') !== '1') setSifreBayi(true);
                        setHazir(true);
                    } else {
                        localStorage.removeItem('authToken');
                        document.cookie = 'authToken=; path=/; max-age=0';
                        window.location.href = '/giris';
                    }
                })
                .catch(() => setHazir(true));
            return;
        }

        if (plasiyerToken) {
            fetch(API_ENDPOINTS.b2b.plasiyerMe(), { headers: { Authorization: `Bearer ${plasiyerToken}` } })
                .then(r => r.json())
                .then(d => {
                    if (d?.success) {
                        const devam = sessionStorage.getItem('plasiyerDevam') === '1';
                        if (d.data?.mustChangePassword) setSifrePlasiyer(true);
                        else if (!devam) setBayiSec(true);
                        setHazir(true);
                    } else {
                        localStorage.removeItem('plasiyerToken');
                        window.location.href = '/giris';
                    }
                })
                .catch(() => setHazir(true));
            return;
        }

        window.location.href = '/giris';
    }, []);

    if (!hazir) {
        return (
            <div className="loading-row" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6b68' }}>
                <SpinnerIcon size={20} className="loading-brand" /> Yükleniyor...
            </div>
        );
    }

    return (
        <>
            {children}
            {sifreBayi ? (
                <MandatoryPasswordChange
                    onDone={() => setSifreBayi(false)}
                    onSkip={() => { try { sessionStorage.setItem('sifreHatirlatma', '1'); } catch { } setSifreBayi(false); }}
                />
            ) : null}
            {sifrePlasiyer ? (
                <MandatoryPasswordChange
                    endpoint={API_ENDPOINTS.b2b.plasiyerSifreDegistir()}
                    tokenKey="plasiyerToken"
                    onDone={() => { setSifrePlasiyer(false); setBayiSec(true); }}
                />
            ) : null}
            {bayiSec ? (
                <PlasiyerBayiSecModal
                    onDevamEt={() => { try { sessionStorage.setItem('plasiyerDevam', '1'); } catch { } setBayiSec(false); }}
                />
            ) : null}
        </>
    );
}
