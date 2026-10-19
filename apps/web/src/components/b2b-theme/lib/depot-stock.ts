import { API_ENDPOINTS } from '@src/config/api';

export type DepotStockMap = Record<string, { ad: string; adet: number }[]>;

export async function fetchDepotStocks(codes: string[]): Promise<DepotStockMap | null> {
    const list = codes.filter(Boolean).join(',');
    if (!list) return null;
    let memberToken: string | null = null;
    let salespersonToken: string | null = null;
    try {
        memberToken = localStorage.getItem('authToken');
        salespersonToken = localStorage.getItem('plasiyerToken');
    } catch { return null; }
    const token = memberToken || salespersonToken;
    if (!token) return null;
    const url = memberToken ? API_ENDPOINTS.b2b.depoStok(list) : API_ENDPOINTS.b2b.plasiyerDepoStok(list);
    try {
        const res = await fetch(url, { headers: { 'X-Site': 'b2b', Authorization: `Bearer ${token}` } }).then(r => r.json());
        return res?.success ? (res.data as DepotStockMap) : null;
    } catch {
        return null;
    }
}
