import { Address, AddressFormData } from '@/src/types/adress';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';

export const addressService = {
    // Kullanıcı adreslerini getir
    async getUserAddresses(userId: string): Promise<Address[]> {
        try {
            const res = await fetch(`${API_URL}/address/user/${userId}`);
            const data = await res.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('Adres yükleme hatası:', error);
            return [];
        }
    },

    // Tek adres getir
    async getAddress(addressId: string): Promise<Address | null> {
        try {
            const res = await fetch(`${API_URL}/address/${addressId}`);
            const data = await res.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Adres getirme hatası:', error);
            return null;
        }
    },

    // Adres ekle
    async createAddress(userId: string, addressData: AddressFormData): Promise<Address | null> {
        try {
            const res = await fetch(`${API_URL}/address`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...addressData, userId })
            });
            const data = await res.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Adres ekleme hatası:', error);
            return null;
        }
    },

    // Adres güncelle
    async updateAddress(addressId: string, addressData: Partial<AddressFormData>): Promise<Address | null> {
        try {
            const res = await fetch(`${API_URL}/address/${addressId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addressData)
            });
            const data = await res.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Adres güncelleme hatası:', error);
            return null;
        }
    },

    // Adres sil
    async deleteAddress(addressId: string): Promise<boolean> {
        try {
            const res = await fetch(`${API_URL}/address/${addressId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            return data.success;
        } catch (error) {
            console.error('Adres silme hatası:', error);
            return false;
        }
    },

    // Varsayılan adres yap
    async setDefaultAddress(addressId: string): Promise<boolean> {
        try {
            const res = await fetch(`${API_URL}/address/${addressId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isDefault: true })
            });
            const data = await res.json();
            return data.success;
        } catch (error) {
            console.error('Varsayılan adres hatası:', error);
            return false;
        }
    }
};