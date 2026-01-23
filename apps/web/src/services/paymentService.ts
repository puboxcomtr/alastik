const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';

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
            const res = await fetch(`${API_URL}/payment-methods/bank-transfer`);
            const result = await res.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Banka hesapları yükleme hatası:', error);
            return [];
        }
    }
};