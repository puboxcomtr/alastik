import type { PaymentTypeConfig } from '@/types/apps/paymentTypes'

// Ödeme Tipleri
export const PAYMENT_TYPES: PaymentTypeConfig[] = [
  {
    value: 'credit_card',
    label: 'Kredi Kartı',
    icon: 'ri-bank-card-line',
    color: 'primary'
  },
  {
    value: 'bank_transfer',
    label: 'Banka Havalesi',
    icon: 'ri-bank-line',
    color: 'success'
  }
]

// Ödeme Modu
export const PAYMENT_MODES = {
  TEST: 'test' as const,
  LIVE: 'live' as const
}

// Form Varsayılanları
export const DEFAULT_FORM_DATA = {
  name: '',
  description: '',
  priority: 0,
  apiCredentials: {},
  mode: PAYMENT_MODES.TEST
}

// API Endpoints
export const API_ENDPOINTS = {
  BASE: '/admin/settings/payment',
  PROVIDERS: '/admin/settings/payment/providers',
  TOGGLE: (id: string) => `/admin/settings/payment/${id}/toggle`,
  DELETE: (id: string) => `/admin/settings/payment/${id}`
}

// Toast Messages
export const TOAST_MESSAGES = {
  LOADING_PROVIDERS_ERROR: 'Provider listesi yüklenemedi',
  SELECT_TYPE: 'Lütfen ödeme tipini seçin',
  SELECT_PROVIDER: 'Lütfen provider seçin',
  ENTER_NAME: 'Lütfen ödeme yöntemi adı girin',
  MISSING_FIELDS: (fields: string) => `Zorunlu alanları doldurun: ${fields}`,
  SUCCESS: (name: string) => `${name} başarıyla eklendi!`,
  ERROR: (message: string) => `Hata: ${message}`,
  CONNECTION_ERROR: 'Bağlantı hatası. Lütfen tekrar deneyin.'
}