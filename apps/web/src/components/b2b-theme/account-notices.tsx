'use client';
import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';
import { formatKurus } from '@components/b2b-theme/lib/format';

type AccountState = {
    overdueKurus: number; discountsBlocked: boolean; creditClosed: boolean; creditClosedReason: string; totalLimitKurus: number;
    orderingClosed: boolean; orderingClosedReason: string; orderingClosedMessage: string;
    cartClosed: boolean; cartClosedMessage: string;
};

const EXCEEDED_REASON = 'exceeded';
const OVERDUE_REASON = 'overdue';

export function AccountNotices() {
    const [state, setState] = useState<AccountState | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        fetch(API_ENDPOINTS.b2b.me(), { headers: { Authorization: `Bearer ${token}`, 'X-Site': 'b2b' } })
            .then(r => r.json())
            .then(d => {
                if (!d?.success || !d.data) return;
                setState({
                    overdueKurus: Number(d.data.overdueKurus) || 0,
                    discountsBlocked: d.data.discountsBlocked === true,
                    creditClosed: d.data.creditClosed === true,
                    creditClosedReason: String(d.data.creditClosedReason || ''),
                    totalLimitKurus: Number(d.data.totalLimitKurus) || 0,
                    orderingClosed: d.data.orderingClosed === true,
                    orderingClosedReason: String(d.data.orderingClosedReason || ''),
                    orderingClosedMessage: String(d.data.orderingClosedMessage || ''),
                    cartClosed: d.data.cartClosed === true,
                    cartClosedMessage: String(d.data.cartClosedMessage || ''),
                });
            })
            .catch(() => {});
    }, []);

    if (!state || !(state.cartClosed || state.orderingClosed)) return null;
    const limitClosed = state.orderingClosed && state.orderingClosedReason !== OVERDUE_REASON;
    return (
        <>
            {limitClosed ? (
                <div className="alert error account-notice" role="alert">
                    <span>{state.orderingClosedMessage}</span>
                    {state.orderingClosedReason === EXCEEDED_REASON ? <a className="account-notice-link" href="/odeme">Ödeme Yap</a> : null}
                </div>
            ) : null}
            {state.cartClosed ? (
                <div className="alert error account-notice" role="alert">
                    <span>
                        Vadesi geçen borç: <strong>{formatKurus(state.overdueKurus)}</strong>. {state.cartClosedMessage}
                    </span>
                    {limitClosed && state.orderingClosedReason === EXCEEDED_REASON ? null : <a className="account-notice-link" href="/odeme">Ödeme Yap</a>}
                </div>
            ) : null}
        </>
    );
}
