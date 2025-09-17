const logger = require('../utils/logger');

class DiaVoucherService {
  constructor() {
    this.diaApiUrl = process.env.DIA_API_URL || 'http://localhost:8080/api';
    this.diaUsername = process.env.DIA_USERNAME;
    this.diaPassword = process.env.DIA_PASSWORD;
    this.companyCode = process.env.DIA_COMPANY_CODE || '001';
  }

  /**
   * DIA API authentication
   */
  async authenticate() {
    try {
      const response = await fetch(`${this.diaApiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: this.diaUsername,
          password: this.diaPassword,
          companyCode: this.companyCode
        })
      });

      if (!response.ok) {
        throw new Error(`DIA authentication failed: ${response.status}`);
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      logger.error('DIA authentication error:', error);
      throw new Error('DIA sistemi ile bağlantı kurulamadı');
    }
  }

  /**
   * Virman fişi oluştur
   */
  async createPaymentVoucher(transactionData) {
    try {
      const token = await this.authenticate();
      
      const voucherData = {
        // Fiş temel bilgileri
        voucherType: 'VIRMAN', // Virman fişi
        voucherDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        description: `Ödeme - Ref: ${transactionData.referenceCode}`,
        referenceNumber: transactionData.clientReferenceCode,
        
        // Müşteri bilgileri
        customerInfo: {
          name: transactionData.cardHolderName,
          email: transactionData.cardHolderEmail,
          phone: transactionData.cardHolderPhone,
          tcNo: transactionData.cardHolderTCKN
        },
        
        // Ödeme bilgileri
        paymentInfo: {
          amount: transactionData.processAmount,
          currency: transactionData.currencyCode,
          installmentCount: transactionData.period,
          cardMask: `${transactionData.cardNumberFirst6}****${transactionData.cardNumberLast4}`,
          authCode: transactionData.authCode,
          hostKey: transactionData.hostKey,
          provisionNumber: transactionData.provisionNumber
        },
        
        // Muhasebe kayıtları
        accountingEntries: [
          {
            // Borç kaydı - Banka hesabı
            accountCode: '100.01.001', // Banka Hesabı
            debitAmount: transactionData.processAmount,
            creditAmount: 0,
            description: `POS Tahsilat - ${transactionData.referenceCode}`,
            documentNo: transactionData.referenceCode,
            documentDate: transactionData.paymentDate
          },
          {
            // Alacak kaydı - Satış hesabı
            accountCode: '600.01.001', // Lastik Satış Hesabı
            debitAmount: 0,
            creditAmount: transactionData.processNetAmount,
            description: `Lastik Satış - Sipariş: ${transactionData.orderId}`,
            documentNo: transactionData.referenceCode,
            documentDate: transactionData.paymentDate
          }
        ]
      };

      // Komisyon varsa ayrı kayıt
      const commissionAmount = transactionData.processAmount - transactionData.processNetAmount;
      if (commissionAmount > 0) {
        voucherData.accountingEntries.push({
          accountCode: '770.01.001', // Komisyon Gider Hesabı
          debitAmount: commissionAmount,
          creditAmount: 0,
          description: `POS Komisyon - ${transactionData.referenceCode}`,
          documentNo: transactionData.referenceCode,
          documentDate: transactionData.paymentDate
        });
      }

      // DIA API'sine fiş gönder
      const response = await fetch(`${this.diaApiUrl}/accounting/vouchers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Company-Code': this.companyCode
        },
        body: JSON.stringify(voucherData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DIA voucher creation failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      
      logger.info(`DIA voucher created successfully: ${result.voucherNumber}`, {
        transactionRef: transactionData.referenceCode,
        voucherNumber: result.voucherNumber,
        amount: transactionData.processAmount
      });

      return {
        success: true,
        voucherNumber: result.voucherNumber,
        voucherDate: result.voucherDate,
        totalAmount: transactionData.processAmount,
        message: 'Virman fişi başarıyla oluşturuldu'
      };
    } catch (error) {
      logger.error('DIA voucher creation error:', error, {
        transactionRef: transactionData.referenceCode,
        amount: transactionData.processAmount
      });
      
      return {
        success: false,
        error: error.message,
        message: 'Virman fişi oluşturulamadı'
      };
    }
  }

  /**
   * Storno fişi oluştur (İptal/İade için)
   */
  async createCancellationVoucher(originalTransactionData, cancellationReason) {
    try {
      const token = await this.authenticate();
      
      const stornoData = {
        voucherType: 'STORNO',
        voucherDate: new Date().toISOString().split('T')[0],
        description: `Ödeme İptal/İade - Ref: ${originalTransactionData.referenceCode}`,
        referenceNumber: `STORNO-${originalTransactionData.clientReferenceCode}`,
        originalVoucherNumber: originalTransactionData.diaVoucherNumber,
        cancellationReason,
        
        // Ters kayıtlar
        accountingEntries: [
          {
            // Alacak kaydı - Banka hesabı (ters)
            accountCode: '100.01.001',
            debitAmount: 0,
            creditAmount: originalTransactionData.processAmount,
            description: `Ödeme İptal/İade - ${originalTransactionData.referenceCode}`,
            documentNo: `STORNO-${originalTransactionData.referenceCode}`,
            documentDate: new Date()
          },
          {
            // Borç kaydı - Satış hesabı (ters)
            accountCode: '600.01.001',
            debitAmount: originalTransactionData.processNetAmount,
            creditAmount: 0,
            description: `Satış İptal/İade - ${originalTransactionData.referenceCode}`,
            documentNo: `STORNO-${originalTransactionData.referenceCode}`,
            documentDate: new Date()
          }
        ]
      };

      const response = await fetch(`${this.diaApiUrl}/accounting/vouchers/storno`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Company-Code': this.companyCode
        },
        body: JSON.stringify(stornoData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DIA storno creation failed: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      
      logger.info(`DIA storno voucher created: ${result.voucherNumber}`, {
        originalRef: originalTransactionData.referenceCode,
        stornoNumber: result.voucherNumber,
        reason: cancellationReason
      });

      return {
        success: true,
        stornoNumber: result.voucherNumber,
        stornoDate: result.voucherDate,
        message: 'Storno fişi başarıyla oluşturuldu'
      };
    } catch (error) {
      logger.error('DIA storno creation error:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'Storno fişi oluşturulamadı'
      };
    }
  }

  /**
   * Günlük ödeme raporu oluştur
   */
  async createDailyPaymentReport(date) {
    try {
      const token = await this.authenticate();
      
      const reportData = {
        reportType: 'DAILY_PAYMENT_SUMMARY',
        reportDate: date,
        parameters: {
          paymentMethod: 'CREDIT_CARD',
          includeDetails: true,
          includeCancellations: true
        }
      };

      const response = await fetch(`${this.diaApiUrl}/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Company-Code': this.companyCode
        },
        body: JSON.stringify(reportData)
      });

      if (!response.ok) {
        throw new Error(`DIA report generation failed: ${response.status}`);
      }

      const result = await response.json();
      
      logger.info(`DIA daily payment report generated: ${result.reportId}`, {
        date,
        reportId: result.reportId
      });

      return {
        success: true,
        reportId: result.reportId,
        reportUrl: result.downloadUrl,
        message: 'Günlük ödeme raporu oluşturuldu'
      };
    } catch (error) {
      logger.error('DIA daily report error:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'Günlük rapor oluşturulamadı'
      };
    }
  }

  /**
   * Muhasebe hesap planını senkronize et
   */
  async syncAccountPlan() {
    try {
      const token = await this.authenticate();
      
      const response = await fetch(`${this.diaApiUrl}/accounting/chart-of-accounts/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Company-Code': this.companyCode
        }
      });

      if (!response.ok) {
        throw new Error(`DIA account sync failed: ${response.status}`);
      }

      const result = await response.json();
      
      logger.info('DIA account plan synchronized', {
        syncedAccounts: result.syncedCount,
        newAccounts: result.newCount
      });

      return {
        success: true,
        syncedCount: result.syncedCount,
        newCount: result.newCount,
        message: 'Hesap planı senkronize edildi'
      };
    } catch (error) {
      logger.error('DIA account sync error:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'Hesap planı senkronize edilemedi'
      };
    }
  }

  /**
   * Fiş durumunu kontrol et
   */
  async checkVoucherStatus(voucherNumber) {
    try {
      const token = await this.authenticate();
      
      const response = await fetch(`${this.diaApiUrl}/accounting/vouchers/${voucherNumber}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Company-Code': this.companyCode
        }
      });

      if (!response.ok) {
        throw new Error(`DIA voucher status check failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        status: result.status,
        approvalStatus: result.approvalStatus,
        lastModified: result.lastModified,
        message: 'Fiş durumu alındı'
      };
    } catch (error) {
      logger.error('DIA voucher status check error:', error);
      
      return {
        success: false,
        error: error.message,
        message: 'Fiş durumu kontrol edilemedi'
      };
    }
  }
}

module.exports = DiaVoucherService;