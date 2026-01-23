'use client';

import React from 'react';
import { Modal, Box, IconButton } from '@mui/material';

type TermsType = 'mesafeli-satis' | 'on-bilgilendirme';

interface TermsModalProps {
    open: boolean;
    onClose: () => void;
    type: TermsType;
}

const termsContent: Record<TermsType, { title: string; content: string }> = {
    'mesafeli-satis': {
        title: 'Mesafeli Satış Sözleşmesi',
        content: `
            <h6>1. TARAFLAR</h6>
            <p>İşbu sözleşme, bir tarafta ALastik.com (bundan sonra "SATICI" olarak anılacaktır) ile diğer tarafta sipariş veren kişi (bundan sonra "ALICI" olarak anılacaktır) arasında akdedilmiştir.</p>
            
            <h6>2. KONU</h6>
            <p>İşbu sözleşmenin konusu, ALICI'nın SATICI'ya ait web sitesinden elektronik ortamda siparişini yaptığı, sözleşmede bahsi geçen nitelikleri haiz ürünün satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkındaki Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerinin saptanmasıdır.</p>
            
            <h6>3. SATICI BİLGİLERİ</h6>
            <p>Ünvan: ALastik Otomotiv Tic. Ltd. Şti.<br/>
            Adres: İstanbul, Türkiye<br/>
            Telefon: 0850 XXX XX XX<br/>
            E-posta: info@alastik.com</p>
            
            <h6>4. ÜRÜN BİLGİLERİ</h6>
            <p>Ürünlerin temel özellikleri, satış fiyatı ve ödeme şekli sipariş sayfasında belirtilmektedir.</p>
            
            <h6>5. GENEL HÜKÜMLER</h6>
            <p>ALICI, SATICI'ya ait web sitesinde ürünün temel nitelikleri, satış fiyatı ve ödeme şekli ile teslimata ilişkin ön bilgileri okuyup bilgi sahibi olduğunu ve elektronik ortamda gerekli teyidi verdiğini beyan eder.</p>
            
            <h6>6. CAYMA HAKKI</h6>
            <p>ALICI, sözleşme konusu ürünün kendisine veya gösterdiği adresteki kişi/kuruluşa tesliminden itibaren 14 (on dört) gün içinde cayma hakkına sahiptir. Cayma hakkının kullanılması için bu süre içinde SATICI'ya yazılı bildirimde bulunulması gerekmektedir.</p>
            
            <h6>7. TESLİMAT</h6>
            <p>Ürün, ALICI'nın sipariş formunda belirttiği adrese teslim edilecektir. Teslimat süresi, siparişin onaylanmasından itibaren en geç 30 (otuz) gündür.</p>
            
            <h6>8. UYUŞMAZLIK ÇÖZÜMÜ</h6>
            <p>İşbu sözleşmeden doğan uyuşmazlıklarda Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.</p>
        `
    },
    'on-bilgilendirme': {
        title: 'Ön Bilgilendirme Formu',
        content: `
            <h6>1. SATICI BİLGİLERİ</h6>
            <p>Ünvan: ALastik Otomotiv Tic. Ltd. Şti.<br/>
            Adres: İstanbul, Türkiye<br/>
            Telefon: 0850 XXX XX XX<br/>
            E-posta: info@alastik.com</p>
            
            <h6>2. SÖZLEŞME KONUSU ÜRÜN</h6>
            <p>Sözleşme konusu ürünün cinsi, miktarı, marka/modeli, rengi ve satış bedeli sipariş sayfasında yer almaktadır.</p>
            
            <h6>3. ÖDEME ŞEKLİ</h6>
            <p>Ürün bedeli, kredi kartı veya havale/EFT ile ödenebilir. Kredi kartı ile yapılan ödemelerde taksit imkanı sunulmaktadır.</p>
            
            <h6>4. TESLİMAT</h6>
            <p>Ürünler, sipariş onayından itibaren en geç 30 gün içinde teslim edilir. Kargo ücreti, sipariş toplamına göre değişkenlik gösterebilir.</p>
            
            <h6>5. CAYMA HAKKI</h6>
            <p>Tüketici, 14 gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir.</p>
            
            <h6>6. CAYMA HAKKININ KULLANIMI</h6>
            <p>Cayma hakkını kullanmak isteyen tüketici, bu süre içinde satıcıya yazılı olarak veya kalıcı veri saklayıcısı ile bildirimde bulunmalıdır.</p>
            
            <h6>7. CAYMA HAKKININ İSTİSNALARI</h6>
            <p>Tüketicinin isteği veya açıkça kişisel ihtiyaçları doğrultusunda hazırlanan, çabuk bozulabilen veya son kullanma tarihi geçebilecek ürünlerde cayma hakkı kullanılamaz.</p>
            
            <h6>8. GARANTİ</h6>
            <p>Ürünler, üretici firma garantisi kapsamındadır. Garanti süresi ve koşulları ürüne göre değişiklik gösterebilir.</p>
        `
    }
};

export default function TermsModal({ open, onClose, type }: TermsModalProps) {
    const { title, content } = termsContent[type];

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: { xs: '95%', sm: '90%', md: 700 },
                maxHeight: '85vh',
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 24,
                display: 'flex',
                flexDirection: 'column'
            }}>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    borderBottom: '1px solid #eee'
                }}>
                    <h5 className="mb-0">{title}</h5>
                    <IconButton onClick={onClose} size="small">
                        <i className="ri-close-line"></i>
                    </IconButton>
                </Box>

                <Box sx={{
                    p: 3,
                    overflowY: 'auto',
                    flex: 1
                }}>
                    <div
                        className="terms-content"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                </Box>

                <Box sx={{
                    p: 2,
                    borderTop: '1px solid #eee',
                    textAlign: 'right'
                }}>
                    <button className="btn btn-primary" onClick={onClose}>
                        Kapat
                    </button>
                </Box>
            </Box>
        </Modal>
    );
}