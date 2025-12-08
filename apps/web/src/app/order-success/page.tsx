'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
// Header/Footer global layout'tadır
import { logger } from '../../lib/logger';
import styles from './order-success.module.css';

const OrderSuccessContent: React.FC = () => {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState<string>('');

  useEffect(() => {
    const order = searchParams.get('order');
    if (order) {
      setOrderNumber(`ORD-${order}`);
      logger.logUserAction('ORDER_SUCCESS_PAGE_VIEW', { orderNumber: `ORD-${order}` });
    }
  }, [searchParams]);

  return (
    <>
      
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8 col-xl-6">
            <div className={styles.successCard}>
              {/* Success Icon */}
              <div className={styles.successIcon}>
                <i className="fas fa-check-circle"></i>
              </div>

              {/* Success Message */}
              <div className={styles.successContent}>
                <h1 className={styles.successTitle}>
                  SİPARİŞİNİZ BAŞARIYLA OLUŞTURULDU!
                </h1>
                
                <p className={styles.successMessage}>
                  Siparişiniz alınmıştır ve en kısa sürede hazırlanacaktır. 
                  Sipariş durumunuzu e-posta ve SMS ile takip edebilirsiniz.
                </p>

                {orderNumber && (
                  <div className={styles.orderInfo}>
                    <div className={styles.orderNumber}>
                      <span className={styles.orderLabel}>Sipariş Numarası:</span>
                      <span className={styles.orderValue}>{orderNumber}</span>
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                <div className={styles.nextSteps}>
                  <h3>Sonraki Adımlar:</h3>
                  <ul className={styles.stepsList}>
                    <li>
                      <i className="fas fa-envelope me-2"></i>
                      E-posta adresinize sipariş onayı gönderilecek
                    </li>
                    <li>
                      <i className="fas fa-box me-2"></i>
                      Siparişiniz 1-2 iş günü içinde hazırlanacak
                    </li>
                    <li>
                      <i className="fas fa-truck me-2"></i>
                      Kargo takip numarası SMS ile bildirilecek
                    </li>
                    <li>
                      <i className="fas fa-star me-2"></i>
                      Teslimat sonrası değerlendirme yapabilirsiniz
                    </li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className={styles.actionButtons}>
                  <Link href="/siparislerim" className={styles.primaryBtn}>
                    <i className="fas fa-list me-2"></i>
                    SİPARİŞLERİMİ GÖRÜNTÜLE
                  </Link>
                  
                  <Link href="/" className={styles.secondaryBtn}>
                    <i className="fas fa-home me-2"></i>
                    ANA SAYFAYA DÖN
                  </Link>
                </div>

                {/* Contact Info */}
                <div className={styles.contactInfo}>
                  <h4>Yardıma mı ihtiyacınız var?</h4>
                  <p>
                    Herhangi bir sorunuz varsa, müşteri hizmetlerimizle iletişime geçin:
                  </p>
                  <div className={styles.contactMethods}>
                    <a href="tel:02122121212" className={styles.contactMethod}>
                      <i className="fas fa-phone me-2"></i>
                      0212 212 12 12
                    </a>
                    <a href="mailto:info@alastikb2c.com" className={styles.contactMethod}>
                      <i className="fas fa-envelope me-2"></i>
                      info@alastikb2c.com
                    </a>
                    <a href="/canli-destek" className={styles.contactMethod}>
                      <i className="fas fa-comments me-2"></i>
                      Canlı Destek
                    </a>
                  </div>
                </div>

                {/* Social Sharing */}
                <div className={styles.socialSharing}>
                  <p className="text-muted">Deneyiminizi paylaşın:</p>
                  <div className={styles.socialButtons}>
                    <a 
                      href="https://www.facebook.com/sharer/sharer.php?u=https://alastikb2c.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`${styles.socialBtn} ${styles.facebook}`}
                    >
                      <i className="fab fa-facebook-f"></i>
                    </a>
                    <a 
                      href="https://twitter.com/intent/tweet?text=ALastikB2C'den harika bir alışveriş deneyimi yaşadım!" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`${styles.socialBtn} ${styles.twitter}`}
                    >
                      <i className="fab fa-twitter"></i>
                    </a>
                    <a 
                      href="https://www.instagram.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`${styles.socialBtn} ${styles.instagram}`}
                    >
                      <i className="fab fa-instagram"></i>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products or Offers */}
        <div className="row mt-5">
          <div className="col-12">
            <div className={styles.relatedSection}>
              <h3 className="text-center mb-4">Size Özel Teklifler</h3>
              <div className="row">
                <div className="col-md-4">
                  <div className={styles.offerCard}>
                    <div className={styles.offerIcon}>
                      <i className="fas fa-percent"></i>
                    </div>
                    <h5>İlk Alışveriş İndirimi</h5>
                    <p>Bir sonraki alışverişinizde %10 indirim kazanın!</p>
                    <span className={styles.offerCode}>Kod: ILKALISVERIS10</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className={styles.offerCard}>
                    <div className={styles.offerIcon}>
                      <i className="fas fa-users"></i>
                    </div>
                    <h5>Arkadaş Davet Et</h5>
                    <p>Arkadaşlarınızı davet edin, her biri için 25₺ kazanın!</p>
                    <Link href="/referans" className={styles.offerLink}>
                      Davet Et
                    </Link>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className={styles.offerCard}>
                    <div className={styles.offerIcon}>
                      <i className="fas fa-star"></i>
                    </div>
                    <h5>Sadakat Programı</h5>
                    <p>Her alışverişte puan biriktirin, hediye kazanın!</p>
                    <Link href="/sadakat" className={styles.offerLink}>
                      Katıl
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </>
  );
};

const OrderSuccessPage: React.FC = () => {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
};

export default OrderSuccessPage;