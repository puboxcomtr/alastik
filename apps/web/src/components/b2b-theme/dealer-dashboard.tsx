'use client';
import { useEffect, useState } from 'react';
import { AccountSummaryCards } from '@components/b2b-theme/account-summary-cards';
import { PurchaseChart } from '@components/b2b-theme/purchase-chart';
import { QuickActions } from '@components/b2b-theme/quick-actions';
import { DueCalendar } from '@components/b2b-theme/due-calendar';
import { PlasiyerOverview } from '@components/b2b-theme/plasiyer-overview';

export function DealerDashboard() {
    const [mod, setMod] = useState<'yukleniyor' | 'plasiyer' | 'bayi'>('yukleniyor');

    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        const plasiyerToken = localStorage.getItem('plasiyerToken');
        setMod(!authToken && plasiyerToken ? 'plasiyer' : 'bayi');
    }, []);

    if (mod === 'yukleniyor') return null;
    if (mod === 'plasiyer') return <PlasiyerOverview />;

    return (
        <>
            <AccountSummaryCards />
            <PurchaseChart />
            <QuickActions />
            <DueCalendar />
        </>
    );
}
