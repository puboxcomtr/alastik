// Web Uygulaması Logging Sistemi
// Bu dosya tüm frontend isteklerini ve yanıtlarını loglar

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'REQUEST' | 'RESPONSE' | 'ERROR' | 'NAVIGATION' | 'USER_ACTION';
  page: string;
  action: string;
  data?: any;
  duration?: number;
  error?: string;
  url?: string;
  method?: string;
  status?: number;
  userAgent?: string;
  screenSize?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Maksimum log sayısı
  private isEnabled = true;

  constructor() {
    // LocalStorage'dan logları yükle
    this.loadLogs();
    
    // Sayfa değişikliklerini dinle
    if (typeof window !== 'undefined') {
      this.setupNavigationListener();
      this.setupErrorListener();
    }
  }

  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadLogs(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('web_logs');
        if (stored) {
          this.logs = JSON.parse(stored);
        }
      } catch (error) {
        console.warn('Loglar yüklenirken hata:', error);
      }
    }
  }

  private saveLogs(): void {
    if (typeof window !== 'undefined') {
      try {
        // Maksimum log sayısını aşarsa eski logları sil
        if (this.logs.length > this.maxLogs) {
          this.logs = this.logs.slice(-this.maxLogs);
        }
        localStorage.setItem('web_logs', JSON.stringify(this.logs));
      } catch (error) {
        console.warn('Loglar kaydedilirken hata:', error);
      }
    }
  }

  private setupNavigationListener(): void {
    // History API değişikliklerini dinle
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.logNavigation('PUSH_STATE', window.location.pathname + window.location.search);
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.logNavigation('REPLACE_STATE', window.location.pathname + window.location.search);
    };

    // Popstate event'ini dinle
    window.addEventListener('popstate', () => {
      this.logNavigation('POP_STATE', window.location.pathname + window.location.search);
    });
  }

  private setupErrorListener(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      try {
        const errorData = {
          message: event.message || 'Bilinmeyen hata',
          filename: event.filename || 'Bilinmeyen dosya',
          lineno: event.lineno || 0,
          colno: event.colno || 0,
          error: event.error ? (event.error.stack || event.error.toString()) : 'Bilinmeyen hata'
        };
        this.logError('GLOBAL_ERROR', errorData);
      } catch (logError) {
        console.warn('Error logging failed:', logError);
      }
    });

    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      try {
        const errorData = {
          reason: event.reason || 'Bilinmeyen promise hatası',
          promise: event.promise ? 'Promise object' : 'Bilinmeyen promise'
        };
        this.logError('UNHANDLED_PROMISE_REJECTION', errorData);
      } catch (logError) {
        console.warn('Promise error logging failed:', logError);
      }
    });
  }

  private logNavigation(action: string, url: string): void {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'NAVIGATION',
      page: window.location.pathname,
      action,
      url,
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`
    };

    this.addLog(entry);
    console.log('🧭 [NAVIGATION]', entry);
  }



  private addLog(entry: LogEntry): void {
    if (!this.isEnabled) return;

    this.logs.push(entry);
    this.saveLogs();
  }

  // Public methods
  logRequest(endpoint: string, params?: any, method: string = 'GET'): string {
    const requestId = this.generateId();
    const entry: LogEntry = {
      id: requestId,
      timestamp: new Date().toISOString(),
      type: 'REQUEST',
      page: window.location.pathname,
      action: `API_REQUEST_${method}`,
      data: { endpoint, params },
      method,
      url: endpoint,
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`
    };

    this.addLog(entry);
    console.log('🚀 [REQUEST]', entry);
    return requestId;
  }

  logResponse(requestId: string, data: any, duration: number, status: number): void {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'RESPONSE',
      page: window.location.pathname,
      action: 'API_RESPONSE',
      data: {
        requestId,
        responseData: data,
        dataLength: Array.isArray(data) ? data.length : typeof data === 'object' ? Object.keys(data).length : 'scalar'
      },
      duration,
      status,
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`
    };

    this.addLog(entry);
    console.log('✅ [RESPONSE]', entry);
  }

  logApiError(requestId: string, error: any, duration: number, status?: number): void {
    // Boş error objesi kontrolü
    if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
      error = 'API çağrısı başarısız oldu';
    }

    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'ERROR',
      page: window.location.pathname,
      action: 'API_ERROR',
      error: typeof error === 'string' ? error : 
             error instanceof Error ? error.message : 
             JSON.stringify(error),
      duration,
      status,
      data: { requestId },
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`
    };

    this.addLog(entry);
    // Console spam'i azalt - sadece önemli bilgileri logla
    console.warn('⚠️ [API_ERROR]', {
      action: entry.action,
      error: entry.error,
      status: entry.status,
      duration: entry.duration
    });
  }

  logUserAction(action: string, data?: any): void {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'USER_ACTION',
      page: window.location.pathname,
      action,
      data,
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`
    };

    this.addLog(entry);
    console.log('👤 [USER_ACTION]', entry);
  }

  public logError(action: string, error: any): void {
    // Boş error objesi kontrolü
    if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
      error = 'Bilinmeyen hata';
    }

    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'ERROR',
      page: window.location.pathname,
      action,
      error: typeof error === 'string' ? error : 
             error instanceof Error ? error.message : 
             JSON.stringify(error),
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`
    };

    this.addLog(entry);
    console.error('💥 [ERROR]', entry);
  }

  // Logları getir
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Belirli bir sayfa için logları getir
  getLogsByPage(page: string): LogEntry[] {
    return this.logs.filter(log => log.page === page);
  }

  // Belirli bir tip için logları getir
  getLogsByType(type: LogEntry['type']): LogEntry[] {
    return this.logs.filter(log => log.type === type);
  }

  // Son N logu getir
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Logları temizle
  clearLogs(): void {
    this.logs = [];
    this.saveLogs();
  }

  // Logging'i aç/kapat
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // Logları dışa aktar
  exportLogs(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      totalLogs: this.logs.length,
      logs: this.logs
    }, null, 2);
  }

  // Logları analiz et
  getAnalytics(): {
    totalRequests: number;
    totalErrors: number;
    averageResponseTime: number;
    mostVisitedPages: Array<{ page: string; count: number }>;
    errorTypes: Array<{ type: string; count: number }>;
  } {
    const requests = this.logs.filter(log => log.type === 'REQUEST');
    const errors = this.logs.filter(log => log.type === 'ERROR');
    const responses = this.logs.filter(log => log.type === 'RESPONSE');

    // Sayfa ziyaretleri
    const pageCounts: Record<string, number> = {};
    this.logs.forEach(log => {
      pageCounts[log.page] = (pageCounts[log.page] || 0) + 1;
    });

    // Hata tipleri
    const errorTypes: Record<string, number> = {};
    errors.forEach(log => {
      const errorType = log.action;
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });

    return {
      totalRequests: requests.length,
      totalErrors: errors.length,
      averageResponseTime: responses.length > 0 
        ? responses.reduce((sum, log) => sum + (log.duration || 0), 0) / responses.length 
        : 0,
      mostVisitedPages: Object.entries(pageCounts)
        .map(([page, count]) => ({ page, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      errorTypes: Object.entries(errorTypes)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
    };
  }
}

// Singleton instance
export const logger = new Logger();

// Global window objesine ekle (development için)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).logger = logger;
} 