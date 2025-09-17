'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Header/Footer global layout'ta render ediliyor
import AuthModal from '@components/auth/AuthModal';
import { cartUtils } from '@components/cart/ShoppingCart';
import { logger } from '@lib/logger';
import toast from '@lib/toast';
import authService from '@lib/auth';
import cartService from '@lib/cartService';
import styles from './checkout.module.css';
import Swal from 'sweetalert2';

interface CartItem {
  id: string;
  name: string;
  brand: string;
  size: string;
  price: number;
  quantity: number;
  image: string;
  stockStatus: 'in_stock' | 'out_of_stock';
  maxStock: number;
}

interface Address {
  _id: string;
  title: string;
  fullName: string;
  phone: string;
  addressLine: string;
  district: string;
  city: string;
  postalCode?: string;
  neighborhood?: string;
  buildingNo?: string;
  floor?: string;
  apartmentNo?: string;
  directions?: string;
  isDefault: boolean;
  type: 'home' | 'work' | 'other';
  invoiceType: 'individual' | 'corporate';
  tcNo?: string;
  companyName?: string;
  taxNumber?: string;
  taxOffice?: string;
  fullAddress?: string;
}

interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'bank_transfer' | 'cash_on_delivery';
  title: string;
  description: string;
  fee: number;
}

const CheckoutPage: React.FC = () => {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Adres, 2: Teslimat, 3: Ödeme, 4: Özet
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Adres bilgileri
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  // Teslimat seçenekleri
  const [deliveryOption, setDeliveryOption] = useState('standard');
  const [deliveryDate, setDeliveryDate] = useState('');

  // Ödeme bilgileri
  const [paymentMethods] = useState<PaymentMethod[]>([
    {
      id: 'credit_card',
      type: 'credit_card',
      title: 'Kredi Kartı',
      description: 'Visa, MasterCard, American Express',
      fee: 0
    },
    {
      id: 'bank_transfer',
      type: 'bank_transfer',
      title: 'Havale/EFT',
      description: '3% indirim - 1 iş günü içinde kontrol',
      fee: -3
    },
    {
      id: 'cash_on_delivery',
      type: 'cash_on_delivery',
      title: 'Kapıda Ödeme',
      description: 'Nakit veya POS ile ödeme',
      fee: 15
    }
  ]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [binInfo, setBinInfo] = useState<any>(null);
  const [installmentPlans, setInstallmentPlans] = useState<Array<{ inst: number; rate: number; total: number; monthly: number; vPosId: number | null; vPosName?: string }>>([]);
  const [selectedVPosId, setSelectedVPosId] = useState<number | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Form bilgileri
  const [newAddress, setNewAddress] = useState({
    title: '',
    name: '',
    surname: '',
    phone: '',
    address: '',
    district: '',
    city: '',
    postalCode: ''
  });

  // Authentication kontrolü
  useEffect(() => {
    const authenticated = authService.isAuthenticated();
    setIsAuthenticated(authenticated);
    if (!authenticated) {
      setShowAuthModal(true);
      toast.auth.loginRequired();
      setLoading(false);
    }
  }, []);



  // Sayfa yüklendiğinde sepet bilgilerini al (auth değiştiğinde bir kez çalışsın)
  useEffect(() => {
    const loadCartItems = async () => {
      if (!isAuthenticated) {
        return;
      }

      // Lokal UI'yi boşaltmadan önce var olanı koru; backend verisi gelince üzerine yazarız

      try {
        const cartResponse = await cartService.getCart();
        if (cartResponse.success && cartResponse.data) {
          if (cartResponse.data.items.length === 0) {
            // Sepet boşsa ana sayfaya atmadan boş sepet durumunu gösterelim
            setCartItems([]);
            setLoading(false);
            return;
          }

          // Backend cart'ı frontend format'ına çevir
          const items = cartResponse.data.items.map(item => ({
            id: item.productId,
            name: item.name,
            brand: item.brand,
            size: item.specifications.size,
            price: item.price,
            quantity: item.quantity,
            image: item.images[0]?.url || '/assets/img/tires/default-tire.jpg',
            stockStatus: 'in_stock' as const,
            maxStock: 10 // API'den gelecek
          }));

          setCartItems(items);
        } else {
          // Sepet çekilemediyse (muhtemelen 401), kullanıcıyı ana sayfaya atmak yerine
          // oturum penceresini gösterelim ve burada kalalım.
          setShowAuthModal(true);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error loading cart:', error);
        // Hata durumunda yönlendirmek yerine ekranda kalalım
        setLoading(false);
        return;
      }

      setLoading(false);
    };

    if (isAuthenticated) {
      loadCartItems();
    } else {
      // Auth yoksa içerik bloklanmasın; kullanıcı modal üzerinden dönebilir
      setLoading(false);
    }

  }, [isAuthenticated]);
  // Adresleri yükle
  useEffect(() => {
    const loadAddresses = async () => {
      if (!isAuthenticated) return;

      try {
        const response = await authService.authenticatedRequest('/addresses');
        const data = await response.json();

        if (data.success && data.data) {
          setAddresses(data.data);
          const defaultAddress = data.data.find((a: Address) => a.isDefault);
          if (defaultAddress) {
            setSelectedAddress(defaultAddress);
          } else if (data.data.length > 0) {
            setSelectedAddress(data.data[0]);
          }
        }
      } catch (error) {
        console.error('Adresler yüklenirken hata:', error);
        // Hata durumunda boş adres listesi
        setAddresses([]);
      }
    };

    loadAddresses();
  }, [isAuthenticated]);
  // Sayfa yüklenme logu (tek sefer)
  useEffect(() => {
    logger.logUserAction('CHECKOUT_PAGE_LOAD', { itemCount: cartItems.length, isAuthenticated });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getDeliveryFee = () => {
    const total = getTotalPrice();
    if (total >= 500) return 0; // 500 TL üzeri ücretsiz kargo
    return deliveryOption === 'express' ? 50 : 25;
  };

  const getPaymentFee = () => {
    if (!selectedPaymentMethod) return 0;
    const total = getTotalPrice();
    // Kredi kartı ve BIN taksit planı varsa, seçilen taksitin komisyonunu uygula
    if (selectedPaymentMethod.type === 'credit_card' && installmentPlans.length > 0) {
      const plan = installmentPlans.find(p => p.inst === installment && (selectedVPosId ? p.vPosId === selectedVPosId : true))
        || installmentPlans.find(p => p.inst === installment)
        || null;
      if (plan) {
        return (total * plan.rate) / 100;
      }
    }
    // Diğer ödeme yöntemleri için mevcut fee davranışı
    if (selectedPaymentMethod.fee > 0) return selectedPaymentMethod.fee;
    if (selectedPaymentMethod.fee < 0) return (total * Math.abs(selectedPaymentMethod.fee)) / 100;
    return 0;
  };

  const getFinalTotal = () => {
    return getTotalPrice() + getDeliveryFee() + getPaymentFee();
  };

  // Summary sidebar: sepet işlemleri
  const handleChangeQuantity = async (id: string, nextQty: number) => {
    try {
      logger.logUserAction('CHECKOUT_CART_QTY_CHANGE', { id, nextQty });
      if (nextQty < 1) {
        return handleRemoveItem(id);
      }
      const prev = cartItems;
      setCartItems(prev.map(it => it.id === id ? { ...it, quantity: nextQty } : it));
      const resp = await cartService.updateQuantity(id, nextQty);
      if (!resp.success) {
        setCartItems(prev);
        toast.error('Miktar güncellenemedi.');
      }
    } catch (e) {
      logger.logError('CHECKOUT_CART_QTY_CHANGE_ERROR', { message: String(e) });
    }
  };

  const handleRemoveItem = async (id: string) => {
    try {
      logger.logUserAction('CHECKOUT_CART_REMOVE', { id });
      const prev = cartItems;
      setCartItems(prev.filter(it => it.id !== id));
      const resp = await cartService.removeFromCart(id);
      if (!resp.success) {
        setCartItems(prev);
        toast.error('Ürün sepetten çıkarılamadı.');
      } else {
        toast.cart?.removedFromCart?.('Ürün');
      }
    } catch (e) {
      logger.logError('CHECKOUT_CART_REMOVE_ERROR', { message: String(e) });
    }
  };

  // Ödeme yöntemi özel UI durumları
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [expireMonth, setExpireMonth] = useState('');
  const [expireYear, setExpireYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [installment, setInstallment] = useState(1);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [bankNotify, setBankNotify] = useState<{ bankId: string; amount: string; description: string }>({ bankId: '', amount: '', description: '' });

  // BIN sorgusu: kart numarası 6 haneye ulaştığında
  useEffect(() => {
    const clean = (cardNumber || '').replace(/\s/g, '');
    const bin = clean.slice(0, 6);
    if (bin.length === 6 && selectedPaymentMethod?.type === 'credit_card') {
      (async () => {
        try {
          console.log('[BIN][REQUEST]', { bin });
          const res = await authService.authenticatedRequest(`/payments/netahsilat/pos/bin/${bin}`, { method: 'GET' });
          const data = await res.json();
          console.log('[BIN][RESPONSE]', data);
          setBinInfo(data);
          // Taksit-komisyon planı hesapla
          const base = getTotalPrice();
          const poses = data?.virtualPoses || [];
          const plans = [] as Array<{ inst: number; rate: number; total: number; monthly: number; vPosId: number | null; vPosName?: string }>;
          for (const p of poses) {
            const rates = p.comissionRates || [];
            for (const r of rates) {
              const inst = Number(r.instalment ?? r.installment ?? r.count ?? r.term ?? 1);
              if (!inst || inst <= 0) continue;
              const rate = Number(r.commRate ?? r.CommRate ?? 0);
              const total = base * (1 + rate / 100);
              const monthly = total / inst;
              plans.push({ inst, rate, total, monthly, vPosId: p.vPosId ?? null, vPosName: p.vPosName });
            }
          }
          plans.sort((a, b) => a.inst - b.inst || a.rate - b.rate);
          setInstallmentPlans(plans);
          const current = plans.find(pl => pl.inst === installment) || plans.find(pl => pl.inst === 1) || null;
          setSelectedVPosId(current?.vPosId ?? (poses?.[0]?.vPosId ?? null));
        } catch (e) {
          console.error('[BIN][ERROR]', e);
          setInstallmentPlans([]);
          setSelectedVPosId(null);
        }
      })();
    } else {
      setBinInfo(null);
      setInstallmentPlans([]);
      setSelectedVPosId(null);
    }
  }, [cardNumber, selectedPaymentMethod]);

  useEffect(() => {
    // Banka havalesi seçilince hesapları yükle
    if (selectedPaymentMethod?.type === 'bank_transfer') {
      (async () => {
        try {
          const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api') + '/payment/bank-accounts');
          const data = await res.json();
          if (data?.success) setBankAccounts(data.data || []);
        } catch (e) {
          // yut
        }
      })();
    }
  }, [selectedPaymentMethod]);

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logger.logUserAction('CHECKOUT_ADDRESS_SUBMIT_START', { form: newAddress });
    const address: Address = {
      _id: Date.now().toString(),
      fullName: `${newAddress.name} ${newAddress.surname}`,
      addressLine: newAddress.address,
      ...newAddress,
      type: 'home' as const,
      invoiceType: 'individual' as const,
      isDefault: addresses.length === 0
    };
    setAddresses([...addresses, address]);
    setSelectedAddress(address);
    setShowAddressForm(false);
    setNewAddress({
      title: '',
      name: '',
      surname: '',
      phone: '',
      address: '',
      district: '',
      city: '',
      postalCode: ''
    });

    toast.order.addressSaved();
    logger.logUserAction('CHECKOUT_ADDRESS_SUBMIT_SUCCESS', { addressId: address._id });
  };

  const handleCompleteOrder = async () => {
    logger.logUserAction('CHECKOUT_COMPLETE_CLICK');
    if (!selectedAddress) {
      toast.order.addressRequired();
      logger.logUserAction('CHECKOUT_ADDRESS_REQUIRED');
      return;
    }

    if (!selectedPaymentMethod) {
      toast.order.paymentRequired();
      logger.logUserAction('CHECKOUT_PAYMENT_REQUIRED');
      return;
    }

    setLoading(true);

    try {
      // Login sonrası misafir sepeti backend'e merge edilmemişse garantiye al
      try {
        // @ts-ignore
        const merged = await cartService.syncLocalCartToBackend?.();
        if (merged && merged > 0) {
          // Merge olduysa sepeti bir kez daha çekip UI/durum güncel olsun
          await cartService.getCart();
        }
      } catch { }

      // fullName'i firstName ve lastName'e böl
      const nameParts = selectedAddress.fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const orderPayload = {
        shippingAddress: {
          title: selectedAddress.title,
          firstName: firstName,
          lastName: lastName,
          phone: selectedAddress.phone,
          address: selectedAddress.addressLine,
          city: selectedAddress.city,
          district: selectedAddress.district,
          postalCode: selectedAddress.postalCode || '',
          country: 'Turkey'
        },
        billingAddress: {
          title: selectedAddress.title,
          firstName: firstName,
          lastName: lastName,
          phone: selectedAddress.phone,
          address: selectedAddress.addressLine,
          city: selectedAddress.city,
          district: selectedAddress.district,
          postalCode: selectedAddress.postalCode || '',
          country: 'Turkey'
        },
        paymentMethod: selectedPaymentMethod.type,
        installments: 1,
        notes: undefined
      };

      const requestId = logger.logRequest('/orders/create', orderPayload, 'POST');
      const response = await authService.authenticatedRequest('/orders/create', {
        method: 'POST',
        body: JSON.stringify(orderPayload),
        // Ağ gecikmelerine tolerans
        // @ts-ignore - custom option
        timeoutMs: 30000
      });
      let data: any = null;
      try {
        data = await response.json();
      } catch (e) {
        logger.logApiError(requestId, 'RESPONSE_JSON_PARSE_ERROR', 0, response.status);
        throw new Error('Sunucu yanıtı geçersiz');
      }
      logger.logResponse(requestId, data, 0, response.status);

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Sipariş oluşturulamadı');
      }

      // Clear local cart cache (backend sepeti ayrı tutulur)
      localStorage.removeItem('shopping_cart');

      // Order ID'yi sakla (3D ödeme için gerekli)
      setLastOrderId(data.data?.orderId);

      // Log successful order
      logger.logUserAction('ORDER_COMPLETED', {
        orderId: data.data?.orderId,
        orderNumber: data.data?.orderNumber,
        total: data.data?.total,
        itemCount: cartItems.length,
        paymentMethod: selectedPaymentMethod.type
      });

      toast.order.orderCreated(data.data?.orderNumber || '');

      // Eğer 3D ödeme değilse direkt success sayfasına git
      if (selectedPaymentMethod.type !== 'credit_card') {
        router.push(`/order-success?order=${encodeURIComponent(data.data?.orderNumber || '')}`);
      }

      // 3D ödeme için orderId döndür
      return data.data?.orderId || null;

    } catch (error: any) {
      console.error('Order completion error:', error);
      const isTimeout = typeof error === 'string' ? error === 'timeout' : error?.name === 'AbortError' || /timeout/i.test(error?.message || '');
      logger.logError('ORDER_COMPLETION_ERROR', { message: error?.message || String(error) });
      toast.order.orderError(isTimeout ? 'Sunucu zaman aşımına uğradı, lütfen tekrar deneyin.' : 'Sipariş oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  if (loading && !showAuthModal) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Yükleniyor...</span>
          </div>
          <p className="mt-3">Sipariş bilgileri yükleniyor...</p>
          <div className="text-muted small mt-2">Eğer bu ekran 10 sn’den uzun sürerse sayfayı yenileyin. Sorun devam ederse destek ile iletişime geçin.</div>
          <div className="mt-3">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => { setLoading(false); }}>
              Yüklemeyi Durdur ve Devam Et
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleAuthSuccess = (user: any) => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
    toast.auth.loginSuccess(user?.email);
    // Auth sonrası cart'ı çekebilmek için yeniden yükle
    setLoading(true);
    (async () => {
      try {
        const cartResponse = await cartService.getCart();
        if (cartResponse.success && cartResponse.data && cartResponse.data.items.length > 0) {
          const items = cartResponse.data.items.map((item: any) => ({
            id: item.productId,
            name: item.name,
            brand: item.brand,
            size: item.specifications.size,
            price: item.price,
            quantity: item.quantity,
            image: item.images?.[0]?.url || '/assets/img/tires/default-tire.jpg',
            stockStatus: 'in_stock' as const,
            maxStock: 10,
          }));
          setCartItems(items);
          setLoading(false);
        } else {
          // Sepet boş ise ekranda kal
          setCartItems([]);
          setLoading(false);
        }
      } catch (e) {
        setLoading(false);
        // ekranda kal
      }
    })();
  };

  return (
    <>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          // Auth olmadan checkout'a giremez, ana sayfaya yönlendir
          router.push('/');
        }}
        onAuthSuccess={handleAuthSuccess}
        initialMode="login"
      />

      <div className="container py-5">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-4">
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <a href="/" className="text-decoration-none">Ana Sayfa</a>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Sipariş Tamamla
            </li>
          </ol>
        </nav>

        {/* Progress Steps */}
        <div className={styles.progressSteps}>
          <div className={`${styles.step} ${step >= 1 ? styles.active : ''}`}>
            <span className={styles.stepNumber}>1</span>
            <span className={styles.stepTitle}>Adres</span>
          </div>
          <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`}>
            <span className={styles.stepNumber}>2</span>
            <span className={styles.stepTitle}>Teslimat</span>
          </div>
          <div className={`${styles.step} ${step >= 3 ? styles.active : ''}`}>
            <span className={styles.stepNumber}>3</span>
            <span className={styles.stepTitle}>Ödeme</span>
          </div>
          <div className={`${styles.step} ${step >= 4 ? styles.active : ''}`}>
            <span className={styles.stepNumber}>4</span>
            <span className={styles.stepTitle}>Özet</span>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-8">
            {/* Step 1: Address Selection */}
            {step === 1 && (
              <div className={styles.checkoutSection}>
                <h3 className="text-uppercase fw-bold mb-4">TESLİMAT ADRESİ</h3>

                {addresses.map(address => (
                  <div key={address._id} className={styles.addressCard}>
                    <label className={styles.addressLabel}>
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddress?._id === address._id}
                        onChange={() => setSelectedAddress(address)}
                      />
                      <div className={styles.addressContent}>
                        <div className={styles.addressHeader}>
                          <strong>{address.title}</strong>
                          {address.isDefault && (
                            <span className="badge bg-primary ms-2">Varsayılan</span>
                          )}
                        </div >
                        <div className={styles.addressDetails}>
                          <p className="mb-1">{address.name} {address.surname}</p>
                          <p className="mb-1">{address.phone}</p>
                          <p className="mb-1">{address.address}</p>
                          <p className="mb-0">{address.district} / {address.city} {address.postalCode}</p>
                          <span className={`badge ms-2 ${address.type === 'home' ? 'bg-success' :
                            address.type === 'work' ? 'bg-info' : 'bg-secondary'
                            }`}>
                            {address.type === 'home' ? 'Ev' :
                              address.type === 'work' ? 'İş' : 'Diğer'}
                          </span>
                        </div>
                        <div className={styles.addressDetails}>
                          <p className="mb-1">
                            <i className="fas fa-user me-2"></i>
                            {address.fullName}
                          </p>
                          <p className="mb-1">
                            <i className="fas fa-phone me-2"></i>
                            {address.phone}
                          </p>
                          <p className="mb-1">
                            <i className="fas fa-map-marker-alt me-2"></i>
                            {address.fullAddress || `${address.addressLine} ${address.buildingNo ? `No: ${address.buildingNo}` : ''} ${address.floor ? `Kat: ${address.floor}` : ''} ${address.apartmentNo ? `Daire: ${address.apartmentNo}` : ''}`}
                          </p>
                          <p className="mb-0">
                            {address.neighborhood && `${address.neighborhood}, `}
                            {address.district} / {address.city} {address.postalCode}
                          </p>
                          {address.directions && (
                            <p className="mb-0 text-muted">
                              <small>
                                <i className="fas fa-route me-1"></i>
                                {address.directions}
                              </small>
                            </p>
                          )}
                          {address.invoiceType === 'corporate' && (
                            <p className="mb-0 text-info">
                              <small>
                                <i className="fas fa-building me-1"></i>
                                Kurumsal: {address.companyName}
                              </small>
                            </p>
                          )}
                        </div>
                      </div >
                      {
                        installmentPlans.length > 0 && (
                          <div className="col-12">
                            <div className="table-responsive">
                              <table className="table table-sm align-middle">
                                <thead>
                                  <tr>
                                    <th>Taksit</th>
                                    <th>Oran %</th>
                                    <th>Aylık</th>
                                    <th>Toplam</th>
                                    <th>POS</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Array.from(new Map(installmentPlans.map(p => [`${p.inst}-${p.vPosId}`, p])).values())
                                    .sort((a, b) => a.inst - b.inst || a.rate - b.rate)
                                    .map(p => (
                                      <tr key={`${p.inst}-${p.vPosId}`} className={p.inst === installment && p.vPosId === selectedVPosId ? 'table-primary' : ''} onClick={() => { setInstallment(p.inst); setSelectedVPosId(p.vPosId); }} style={{ cursor: 'pointer' }}>
                                        <td>{p.inst}</td>
                                        <td>{p.rate}</td>
                                        <td>{p.monthly.toLocaleString('tr-TR')} ₺</td>
                                        <td>{p.total.toLocaleString('tr-TR')} ₺</td>
                                        <td>{p.vPosName || p.vPosId}</td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      }
                    </label >
                  </div >
                ))}

                {addresses.length === 0 ? (
                  <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Henüz kayıtlı adresiniz yok. Devam etmek için bir adres ekleyin.
                  </div>
                ) : null}

                <button
                  className={styles.addAddressBtn}
                  onClick={() => {
                    // Adres sayfasına yönlendir
                    window.open('/account/addresses', '_blank');
                  }}
                  type="button"
                >
                  <i className="fas fa-plus me-2"></i>
                  YENİ ADRES EKLE
                </button>

                {
                  showAddressForm && (
                    <form onSubmit={handleAddressSubmit} className={styles.addressForm}>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">Adres Başlığı</label>
                            <input
                              type="text"
                              className="form-control"
                              value={newAddress.title}
                              onChange={e => setNewAddress(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="Ev, İş, vb."
                              required
                            />
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="mb-3">
                            <label className="form-label">Ad</label>
                            <input
                              type="text"
                              className="form-control"
                              value={newAddress.name}
                              onChange={e => setNewAddress(prev => ({ ...prev, name: e.target.value }))}
                              required
                            />
                          </div>
                        </div>
                        <div className="col-md-3">
                          <div className="mb-3">
                            <label className="form-label">Soyad</label>
                            <input
                              type="text"
                              className="form-control"
                              value={newAddress.surname}
                              onChange={e => setNewAddress(prev => ({ ...prev, surname: e.target.value }))}
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">Telefon</label>
                            <input
                              type="tel"
                              className="form-control"
                              value={newAddress.phone}
                              onChange={e => setNewAddress(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="0555 123 45 67"
                              required
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">Posta Kodu</label>
                            <input
                              type="text"
                              className="form-control"
                              value={newAddress.postalCode}
                              onChange={e => setNewAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                              placeholder="34710"
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">İl</label>
                            <input
                              type="text"
                              className="form-control"
                              value={newAddress.city}
                              onChange={e => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                              placeholder="İstanbul"
                              required
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">İlçe</label>
                            <input
                              type="text"
                              className="form-control"
                              value={newAddress.district}
                              onChange={e => setNewAddress(prev => ({ ...prev, district: e.target.value }))}
                              placeholder="Kadıköy"
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Adres</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={newAddress.address}
                          onChange={e => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Mahalle, sokak, bina no, daire no"
                          required
                        />
                      </div>
                      <div className="d-flex gap-2">
                        <button type="submit" className="btn btn-primary">
                          ADRESİ KAYDET
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowAddressForm(false)}
                        >
                          İPTAL
                        </button>
                      </div>
                    </form>
                  )
                }

                <div className="d-flex justify-content-end mt-4">
                  <button
                    className="btn btn-primary btn-lg"
                    disabled={!selectedAddress}
                    onClick={() => setStep(2)}
                  >
                    TESLİMAT SEÇENEKLERİ
                    <i className="fas fa-arrow-right ms-2"></i>
                  </button>
                </div>
              </div >
            )}

            {/* Step 2: Delivery Options */}
            {
              step === 2 && (
                <div className={styles.checkoutSection}>
                  <h3 className="text-uppercase fw-bold mb-4">TESLİMAT SEÇENEKLERİ</h3>

                  <div className={styles.deliveryOptions}>
                    <label className={styles.deliveryOption}>
                      <input
                        type="radio"
                        name="delivery"
                        value="standard"
                        checked={deliveryOption === 'standard'}
                        onChange={e => setDeliveryOption(e.target.value)}
                      />
                      <div className={styles.deliveryContent}>
                        <div className={styles.deliveryHeader}>
                          <strong>Standart Teslimat</strong>
                          <span className={styles.deliveryPrice}>
                            {getTotalPrice() >= 500 ? 'ÜCRETSİZ' : '25 ₺'}
                          </span>
                        </div>
                        <p className="text-muted mb-0">2-4 iş günü içinde teslimat</p>
                      </div>
                    </label>

                    <label className={styles.deliveryOption}>
                      <input
                        type="radio"
                        name="delivery"
                        value="express"
                        checked={deliveryOption === 'express'}
                        onChange={e => setDeliveryOption(e.target.value)}
                      />
                      <div className={styles.deliveryContent}>
                        <div className={styles.deliveryHeader}>
                          <strong>Hızlı Teslimat</strong>
                          <span className={styles.deliveryPrice}>50 ₺</span>
                        </div>
                        <p className="text-muted mb-0">1-2 iş günü içinde teslimat</p>
                      </div>
                    </label>
                  </div>

                  <div className="d-flex justify-content-between mt-4">
                    <button
                      className="btn btn-outline-secondary btn-lg"
                      onClick={() => setStep(1)}
                    >
                      <i className="fas fa-arrow-left me-2"></i>
                      GERİ
                    </button>
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={() => setStep(3)}
                    >
                      ÖDEME YÖNTEMİ
                      <i className="fas fa-arrow-right ms-2"></i>
                    </button>
                  </div>
                </div>
              )
            }

            {/* Step 3: Payment Method */}
            {
              step === 3 && (
                <div className={styles.checkoutSection}>
                  <h3 className="text-uppercase fw-bold mb-4">ÖDEME YÖNTEMİ</h3>

                  <div className={styles.paymentMethods}>
                    {paymentMethods.map(method => (
                      <label key={method.id} className={styles.paymentMethod}>
                        <input
                          type="radio"
                          name="payment"
                          checked={selectedPaymentMethod?.id === method.id}
                          onChange={() => setSelectedPaymentMethod(method)}
                        />
                        <div className={styles.paymentContent}>
                          <div className={styles.paymentHeader}>
                            <strong>{method.title}</strong>
                            {method.fee !== 0 && (
                              <span className={`${styles.paymentFee} ${method.fee < 0 ? styles.discount : ''}`}>
                                {method.fee > 0 ? `+${method.fee} ₺` : `${method.fee}%`}
                              </span>
                            )}
                          </div>
                          <p className="text-muted mb-0">{method.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Ödeme form alanları */}
                  {selectedPaymentMethod?.type === 'credit_card' && (
                    <div className="mt-3">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Kart Üzerindeki İsim</label>
                          <input className="form-control" value={cardHolderName} onChange={e => setCardHolderName(e.target.value)} placeholder="AD SOYAD" maxLength={64} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Kart Numarası</label>
                          <input className="form-control" value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/[^0-9\s]/g, ''))} placeholder="#### #### #### ####" maxLength={19} />
                        </div>
                        <div className="col-4 col-md-3">
                          <label className="form-label">Ay</label>
                          <input className="form-control" value={expireMonth} onChange={e => setExpireMonth(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="AA" />
                        </div>
                        <div className="col-4 col-md-3">
                          <label className="form-label">Yıl</label>
                          <input className="form-control" value={expireYear} onChange={e => setExpireYear(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="YY" />
                        </div>
                        <div className="col-4 col-md-3">
                          <label className="form-label">CVC</label>
                          <input className="form-control" value={cvc} onChange={e => setCvc(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} placeholder="CVC" />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">Taksit</label>
                          <select className="form-select" value={installment} onChange={e => { const inst = parseInt(e.target.value || '1'); setInstallment(inst); const best = installmentPlans.filter(p => p.inst === inst).sort((a, b) => a.rate - b.rate)[0] || installmentPlans.find(p => p.inst === 1) || null; setSelectedVPosId(best?.vPosId ?? null); }}>
                            {(installmentPlans.length ? Array.from(new Set(installmentPlans.map(p => p.inst))) : [1, 2, 3, 6, 9, 12]).map(n => <option key={n} value={n}>{n} {(installmentPlans.find(p => p.inst === n)?.rate ?? 0) ? `(+%${installmentPlans.find(p => p.inst === n)?.rate})` : ''}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="d-flex justify-content-end mt-4">
                        <button className="btn btn-danger btn-lg" disabled={loading || !cardNumber || !cardHolderName || !expireMonth || !expireYear || !cvc} onClick={async () => {
                          // Basit doğrulamalar
                          const cleanCard = cardNumber.replace(/\s/g, '');
                          if (cleanCard.length < 13) { toast.error('Kart numarası geçersiz'); return; }
                          if (!(+expireMonth >= 1 && +expireMonth <= 12)) { toast.error('Ay geçersiz'); return; }
                          if (cvc.length < 3) { toast.error('CVC geçersiz'); return; }

                          // Önce siparişi oluştur (pending)
                          const createdOrderId = await handleCompleteOrder();

                          // Ardından 3D başlat
                          try {
                            console.log('[3D_INIT][REQUEST]', {
                              orderId: createdOrderId || lastOrderId,
                              bin: cleanCard.slice(0, 6),
                              cardMasked: `${cleanCard.slice(0, 6)}******${cleanCard.slice(-4)}`,
                              expireMonth,
                              expireYear,
                              installment
                            });
                            const res = await authService.authenticatedRequest('/payments/netahsilat/3d-init', {
                              method: 'POST',
                              body: JSON.stringify({
                                orderId: createdOrderId || lastOrderId, // Son oluşturulan sipariş ID'si
                                cardNumber: cleanCard,
                                cardHolderName,
                                expireMonth,
                                expireYear,
                                cvc,
                                installment,
                                vPosId: selectedVPosId || binInfo?.virtualPoses?.[0]?.vPosId || undefined
                              })
                            });
                            const pdata = await res.json();
                            console.log('[3D_INIT][RESPONSE]', pdata);
                            if (pdata?.success && pdata.data?.threeDSHtmlContent) {
                              const w = window.open('', 'threeDSWindow');
                              if (w) {
                                w.document.open();
                                w.document.write(pdata.data.threeDSHtmlContent);
                                w.document.close();
                              } else {
                                // Yeni pencere engelliyse inline modal fallback yapılabilir
                                const iframe = document.createElement('iframe');
                                iframe.style.width = '100%';
                                iframe.style.height = '520px';
                                iframe.srcdoc = pdata.data.threeDSHtmlContent;
                                const container = document.getElementById('threeDSContainer');
                                if (container) { container.innerHTML = ''; container.appendChild(iframe); }
                              }
                            } else if (pdata?.success && pdata.data?.redirectUrl) {
                              window.location.href = pdata.data.redirectUrl;
                            } else {
<<<<<<< HEAD
                              toast.error('3D ödeme başlatılamadı');
                            }
                          } catch (e) {
                            toast.error('3D ödeme sırasında hata oluştu');
=======
                            // 3D ödeme başlatılamadı - kullanıcı dostu mesaj
                            await Swal.fire({
                              icon: 'error',
                              title: 'Ödeme Başlatılamadı',
                              text: 'Lütfen girdiğiniz bilgileri kontrol edin ve tekrar deneyin.',
                              confirmButtonText: 'Tamam',
                              confirmButtonColor: '#dc3545'
                            });
                          }
                        } catch (e) {
                          // 3D ödeme genel hatası
                          await Swal.fire({
                            icon: 'error',
                            title: 'Ödeme Hatası',
                            text: 'Ödeme işlemi sırasında bir hata oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyin.',
                            confirmButtonText: 'Tamam',
                            confirmButtonColor: '#dc3545'
                          });
>>>>>>> 8cb892cd3cd6e5f9003894aa9c8da785c0c212dd
                          }
                        }}>ÖDEMEYE GEÇ</button>
                      </div>
                      <div id="threeDSContainer" className="mt-3"></div>
                    </div>
                  )}

                  {selectedPaymentMethod?.type === 'bank_transfer' && (
                    <div className="mt-3">
                      <h6>Banka Hesapları</h6>
                      <ul className="list-group">
                        {bankAccounts.map(acc => (
                          <li key={acc.id} className="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                              <div className="fw-bold">{acc.bankName}</div>
                              <small>{acc.iban}</small>
                            </div>
                            <small>{acc.accountName}</small>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3">
                        <h6>Ödeme Bildirim Formu</h6>
                        <div className="row g-3">
                          <div className="col-md-4"><input className="form-control" placeholder="Banka" value={bankNotify.bankId} onChange={e => setBankNotify(v => ({ ...v, bankId: e.target.value }))} /></div>
                          <div className="col-md-4"><input className="form-control" placeholder="Tutar" value={bankNotify.amount} onChange={e => setBankNotify(v => ({ ...v, amount: e.target.value }))} /></div>
                          <div className="col-md-4"><input className="form-control" placeholder="Açıklama" value={bankNotify.description} onChange={e => setBankNotify(v => ({ ...v, description: e.target.value }))} /></div>
                        </div>
                        <div className="d-flex justify-content-end mt-3">
                          <button className="btn btn-success" onClick={async () => {
                            try {
                              const res = await authService.authenticatedRequest('/payment/bank-transfer/notify', {
                                method: 'POST',
                                body: JSON.stringify({ orderId: null, ...bankNotify })
                              });
                              const d = await res.json();
                              if (d?.success) toast.success('Bildirim alındı'); else toast.error('Bildirim alınamadı');
                            } catch { toast.error('Bildirim hatası'); }
                          }}>Bildir</button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="d-flex justify-content-between mt-4">
                    <button
                      className="btn btn-outline-secondary btn-lg"
                      onClick={() => setStep(2)}
                    >
                      <i className="fas fa-arrow-left me-2"></i>
                      GERİ
                    </button>
                  </div>
                </div>
              )
            }

            {/* Step 4: Order Summary */}
            {
              step === 4 && (
                <div className={styles.checkoutSection}>
                  <h3 className="text-uppercase fw-bold mb-4">SİPARİŞ ÖZETİ</h3>

                  {/* Address Summary */}
                  <div className={styles.summarySection}>
                    <h5>Teslimat Adresi</h5>
                    {selectedAddress && (
                      <div className={styles.summaryContent}>
                        <p className="mb-1"><strong>{selectedAddress.title}</strong></p>
<<<<<<< HEAD
                      <p className="mb-1">{selectedAddress.name} {selectedAddress.surname}</p>
                      <p className="mb-1">{selectedAddress.phone}</p>
                      <p className="mb-1">{selectedAddress.address}</p>
=======
                      <p className="mb-1">{selectedAddress.fullName}</p>
                      <p className="mb-1">{selectedAddress.phone}</p>
                      <p className="mb-1">{selectedAddress.addressLine}</p>
>>>>>>> 8cb892cd3cd6e5f9003894aa9c8da785c0c212dd
                      <p className="mb-0">{selectedAddress.district} / {selectedAddress.city}</p>
                    </div >
                  )
}
                </div >

  {/* Delivery Summary */ }
  < div className = { styles.summarySection } >
                  <h5>Teslimat</h5>
                  <div className={styles.summaryContent}>
                    <p className="mb-0">
                      {deliveryOption === 'express' ? 'Hızlı Teslimat (1-2 iş günü)' : 'Standart Teslimat (2-4 iş günü)'}
                    </p>
                  </div>
                </div >

  {/* Payment Summary */ }
  < div className = { styles.summarySection } >
    <h5>Ödeme Yöntemi</h5>
{
  selectedPaymentMethod && (
    <div className={styles.summaryContent}>
      <p className="mb-0">{selectedPaymentMethod.title}</p>
    </div>
  )
}
                </div >

  <div className="d-flex justify-content-between mt-4">
    <button
      className="btn btn-outline-secondary btn-lg"
      onClick={() => setStep(3)}
    >
      <i className="fas fa-arrow-left me-2"></i>
      GERİ
    </button>
    <button
      className="btn btn-success btn-lg"
      onClick={handleCompleteOrder}
      disabled={loading}
    >
      {loading ? (
        <>
          <i className="fas fa-spinner fa-spin me-2"></i>
          SİPARİŞ OLUŞTURULUYOR...
        </>
      ) : (
        <>
          SİPARİŞİ TAMAMLA
          <i className="fas fa-check ms-2"></i>
        </>
      )}
    </button>
  </div>
              </div >
            )}
          </div >

  {/* Order Summary Sidebar */ }
  < div className = "col-lg-4" >
    <div className={styles.orderSummary}>
      <h4 className="text-uppercase fw-bold mb-4">SİPARİŞ ÖZETİ</h4>

      {/* Cart Items */}
      <div className={styles.summaryItems}>
        {cartItems.map(item => (
          <div key={item.id} className={styles.summaryItem}>
            <div className={styles.itemImage}>
              <img
                src={item.image || '/assets/img/placeholder-tire.jpg'}
                alt={item.name}
                onError={(e) => {
                  e.currentTarget.src = '/assets/img/placeholder-tire.jpg';
                }}
              />
            </div>
            <div className={styles.itemDetails}>
              <h6>{item.name}</h6>
              <p className="text-muted small">{item.brand} - {item.size}</p>
              <div className="d-flex align-items-center gap-2 mt-1">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleChangeQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  aria-label="Azalt"
                >
                  -
                </button>
                <span className="small">{item.quantity}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleChangeQuantity(item.id, item.quantity + 1)}
                  aria-label="Arttır"
                >
                  +
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger ms-2"
                  onClick={() => handleRemoveItem(item.id)}
                  aria-label="Sil"
                  title="Ürünü sepetten çıkar"
                >
                  <i className="ci-trash"></i>
                </button>
              </div>
            </div>
            <div className={styles.itemPrice}>
              {(item.price * item.quantity).toLocaleString('tr-TR')} ₺
            </div>
          </div>
        ))}
      </div>

      {/* Price Breakdown */}
      <div className={styles.priceBreakdown}>
        <div className={styles.priceRow}>
          <span>Ara Toplam:</span>
          <span>{getTotalPrice().toLocaleString('tr-TR')} ₺</span>
        </div>
        <div className={styles.priceRow}>
          <span>Kargo:</span>
          <span>
            {getDeliveryFee() === 0 ? 'Ücretsiz' : `${getDeliveryFee()} ₺`}
          </span>
        </div>
        {selectedPaymentMethod && getPaymentFee() !== 0 && (
          <div className={styles.priceRow}>
            <span>Ödeme:</span>
            <span className={getPaymentFee() < 0 ? 'text-success' : ''}>
              {getPaymentFee() > 0 ? '+' : ''}{getPaymentFee().toLocaleString('tr-TR')} ₺
            </span>
          </div>
        )}
        <div className={styles.priceRow + ' ' + styles.totalRow}>
          <strong>Toplam:</strong>
          <strong>{getFinalTotal().toLocaleString('tr-TR')} ₺</strong>
        </div>
      </div>

      {getTotalPrice() < 500 && (
        <div className={styles.freeShippingNotice}>
          <i className="fas fa-truck me-2"></i>
          <small>
            {(500 - getTotalPrice()).toLocaleString('tr-TR')} ₺ daha alışveriş yapın,
            kargo ücretsiz olsun!
          </small>
        </div>
      )}
    </div>
          </div >
        </div >
      </div >

    </>
  );
};

export default CheckoutPage;