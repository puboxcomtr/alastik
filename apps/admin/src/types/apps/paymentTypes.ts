export type ProviderField = {
  key: string
  label: string
  type: 'text' | 'password' | 'email' | 'number'
  required: boolean
  placeholder?: string
  help?: string
}

export type ProviderTemplate = {
  code: string
  name: string
  logo: string
  description: string
  requiredFields: ProviderField[]
  color?: string
  icon?: string
}

export type ProvidersData = {
  credit_card: Record<string, ProviderTemplate>
  bank_transfer: Record<string, ProviderTemplate>
}

export type PaymentType = 'credit_card' | 'bank_transfer'

export type PaymentMode = 'test' | 'live'

export type ApiCredentials = Record<string, string>

export type CreditCardSettings = {
  mode: PaymentMode
  has3DSecure: boolean
  hasInstallment: boolean
  maxInstallment: number
  minInstallmentAmount?: number
  supportedCurrency?: string[]
  commission?: number
  installmentRates?: number[]
  tekCekimAktif?: boolean
  taksitAktif?: boolean
}

export type BankTransferSettings = {
  accountName?: string
  accountNumber?: string
  branchName?: string
  branchCode?: string
  iban?: string
  swift?: string
  confirmationRequired?: boolean
  processingTime?: string
}

export type ProviderMeta = {
  displayName: string
  logo: string
  color?: string
  icon?: string
}

export type PaymentStats = {
  totalOrders: number
  totalAmount: number
  successfulOrders: number
  failedOrders: number
}

export type PaymentMethod = {
  _id: string
  type: PaymentType
  provider: string
  name: string
  description?: string
  isActive: boolean
  isDeleted: boolean
  priority: number
  providerMeta: ProviderMeta
  apiCredentials: ApiCredentials
  creditCardSettings?: CreditCardSettings
  bankTransferSettings?: BankTransferSettings
  stats: PaymentStats
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export type PaymentMethodFormData = {
  name: string
  description: string
  priority: number
  apiCredentials: ApiCredentials
  mode: PaymentMode
}

export type PaymentMethodResponse = {
  success: boolean
  message?: string
  data?: PaymentMethod
  error?: string
}

export type PaymentMethodListResponse = {
  success: boolean
  data: PaymentMethod[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  stats: {
    total: number
    active: number
    inactive: number
    creditCard: number
    bankTransfer: number
  }
}

export type ProvidersResponse = {
  success: boolean
  data: ProvidersData
}

export type PaymentTypeConfig = {
  value: PaymentType
  label: string
  icon: string
  color: string
}