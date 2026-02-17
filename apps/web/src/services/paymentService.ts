// apps/web/src/services/paymentService.ts
import { API_ENDPOINTS } from '@/src/config/api';

export interface BankAccount {
    _id: string;
    name: string;
    logo?: string;
    accountName: string;
    iban: string;
    processingTime?: string;
}

export const paymentService = {
    async getBankAccounts(): Promise<BankAccount[]> {
        try {
            const res = await fetch(API_ENDPOINTS.payment.bankAccounts());
            const result = await res.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('[paymentService] getBankAccounts error:', error);
            return [];
        }
    }
};