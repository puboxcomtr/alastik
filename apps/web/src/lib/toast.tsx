import React from 'react';
import { toast, ToastOptions, Slide } from 'react-toastify';

// Default toast configuration
const defaultOptions: ToastOptions = {
  position: "top-right",
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  transition: Slide,
  className: 'custom-toast',
};

// Success toast
export const showSuccess = (message: string, options?: Partial<ToastOptions>) => {
  return toast.success(message, {
    ...defaultOptions,
    ...options,
    className: 'custom-toast success-toast',
  });
};

// Error toast
export const showError = (message: string, options?: Partial<ToastOptions>) => {
  return toast.error(message, {
    ...defaultOptions,
    ...options,
    className: 'custom-toast error-toast',
  });
};

// Warning toast
export const showWarning = (message: string, options?: Partial<ToastOptions>) => {
  return toast.warning(message, {
    ...defaultOptions,
    ...options,
    className: 'custom-toast warning-toast',
  });
};

// Info toast
export const showInfo = (message: string, options?: Partial<ToastOptions>) => {
  return toast.info(message, {
    ...defaultOptions,
    ...options,
    className: 'custom-toast info-toast',
  });
};

// Loading toast
export const showLoading = (message: string, options?: Partial<ToastOptions>) => {
  return toast.loading(message, {
    ...defaultOptions,
    ...options,
    className: 'custom-toast loading-toast',
    autoClose: false,
    closeOnClick: false,
    draggable: false,
  });
};

// Promise toast - for async operations
export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    pending: string;
    success: string;
    error: string;
  },
  options?: Partial<ToastOptions>
) => {
  return toast.promise(promise, messages, {
    ...defaultOptions,
    ...options,
    className: 'custom-toast',
  });
};

// Shopping cart specific toasts
export const cartToasts = {
  addedToCart: (productName: string) => {
    return showSuccess(`${productName} sepete eklendi!`, {
      autoClose: 3000,
    });
  },

  removedFromCart: (productName: string) => {
    return showInfo(`${productName} sepetten çıkarıldı`, {
      autoClose: 2500,
    });
  },

  updatedQuantity: (productName: string, quantity: number) => {
    return showInfo(`${productName} miktarı ${quantity} olarak güncellendi`, {
      autoClose: 2000,
    });
  },

  cartCleared: () => {
    return showWarning('Sepet temizlendi', {
      autoClose: 2500,
    });
  },

  stockLimited: (productName: string, maxStock: number) => {
    return showWarning(`${productName} için maksimum ${maxStock} adet ekleyebilirsiniz`, {
      autoClose: 4000,
    });
  },

  outOfStock: (productName: string) => {
    return showError(`${productName} stokta bulunmuyor`, {
      autoClose: 4000,
    });
  }
};

// Auth specific toasts
export const authToasts = {
  loginSuccess: (userName?: string) => {
    return showSuccess(userName ? `Hoş geldin ${userName}!` : 'Giriş başarılı!', {
      autoClose: 3000,
    });
  },

  loginError: (error?: string) => {
    return showError(error || 'Giriş yapılırken bir hata oluştu', {
      autoClose: 5000,
    });
  },

  registerSuccess: () => {
    return showSuccess('Kayıt başarılı! Şimdi giriş yapabilirsiniz.', {
      autoClose: 4000,
    });
  },

  registerError: (error?: string) => {
    return showError(error || 'Kayıt olurken bir hata oluştu', {
      autoClose: 5000,
    });
  },

  logoutSuccess: () => {
    return showInfo('Başarıyla çıkış yaptınız', {
      autoClose: 2500,
    });
  },

  passwordMismatch: () => {
    return showError('Şifreler eşleşmiyor', {
      autoClose: 3000,
    });
  },

  termsNotAccepted: () => {
    return showWarning('Kullanım koşullarını kabul etmelisiniz', {
      autoClose: 4000,
    });
  },

  loginRequired: () => {
    return showWarning('Bu işlem için giriş yapmanız gerekiyor', {
      autoClose: 4000,
    });
  }
};

// Order specific toasts
export const orderToasts = {
  orderCreated: (orderNumber: string) => {
    return showSuccess(`Siparişiniz oluşturuldu! Sipariş No: ${orderNumber}`, {
      autoClose: 6000,
    });
  },

  orderError: (error?: string) => {
    return showError(error || 'Sipariş oluşturulurken bir hata oluştu', {
      autoClose: 5000,
    });
  },

  addressRequired: () => {
    return showWarning('Lütfen teslimat adresi seçin', {
      autoClose: 3000,
    });
  },

  paymentRequired: () => {
    return showWarning('Lütfen ödeme yöntemi seçin', {
      autoClose: 3000,
    });
  },

  addressSaved: () => {
    return showSuccess('Adres başarıyla kaydedildi', {
      autoClose: 2500,
    });
  }
};

// API specific toasts
export const apiToasts = {
  networkError: () => {
    return showError('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.', {
      autoClose: 5000,
    });
  },

  serverError: () => {
    return showError('Sunucu hatası. Lütfen daha sonra tekrar deneyin.', {
      autoClose: 5000,
    });
  },

  loadingData: (message: string = 'Veriler yükleniyor...') => {
    return showLoading(message);
  },

  dataLoaded: () => {
    return showSuccess('Veriler başarıyla yüklendi', {
      autoClose: 2000,
    });
  }
};

// Utility functions
export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

export const dismissAllToasts = () => {
  toast.dismiss();
};

// Custom toast with action button
export const showActionToast = (
  message: string,
  actionText: string,
  onAction: () => void,
  options?: Partial<ToastOptions>
) => {
  return toast(
    ({ closeToast }) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <span>{message}</span>
        <button
          onClick={() => {
            onAction();
            closeToast();
          }}
          style={{
            background: '#fe696a',
            color: 'white',
            border: 'none',
            padding: '4px 12px',
            borderRadius: '4px',
            marginLeft: '10px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          {actionText}
        </button>
      </div>
    ),
    {
      ...defaultOptions,
      ...options,
      className: 'custom-toast action-toast',
      autoClose: 8000,
    }
  );
};

export default {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  promise: showPromise,
  cart: cartToasts,
  auth: authToasts,
  order: orderToasts,
  api: apiToasts,
  dismiss: dismissToast,
  dismissAll: dismissAllToasts,
  action: showActionToast
};