export type TemplateItem = {
    id: string
    name: string
    defaultContent: string
}

export type TemplateCategory = {
    id: string
    name: string
    icon: string
    templates: TemplateItem[]
}

const baseTemplate = (title: string) => `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>${title}</title>
    <style type="text/css">
        @media only screen and (min-device-width: 601px) {
            .content {width: 600px !important;}
        }
        @media only screen and (max-device-width: 600px) and (max-width:600px) {
            .hidden {
                display: none;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; min-width: 100%!important;font-family: Arial, Helvetica, sans-serif;font-size:14px;line-height:20px;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center">
                <h1>${title}</h1>
                <p>Merhaba {{ad_soyad}},</p>
                <p>Buraya mail içeriği gelecek.</p>
            </td>
        </tr>
    </table>
</body>
</html>`

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
    {
        id: 'genel',
        name: 'Genel',
        icon: 'ri-folder-line',
        templates: [
            { id: 'siparis_sablonu', name: 'Sipariş Şablonu', defaultContent: baseTemplate('Sipariş Dekontu') },
            { id: 'sepet_hatirlatma', name: 'Sepet Hatırlatma Şablonu', defaultContent: baseTemplate('Sepetinizi Unuttunuz') },
            { id: 'iletisim_formu', name: 'İletişim Formu', defaultContent: baseTemplate('İletişim Formu') },
            { id: 'dinamik_form', name: 'Dinamik Form', defaultContent: baseTemplate('Dinamik Form') },
            { id: 'odeme_sablonu', name: 'Alışverişsiz Ödeme Şablonu', defaultContent: baseTemplate('Ödeme Bilgilendirme') },
            { id: 'earsiv_sablonu', name: 'E-arşiv Şablonu', defaultContent: baseTemplate('E-Arşiv Faturanız') },
            { id: 'mail_order', name: 'Mail Order Şablonu', defaultContent: baseTemplate('Mail Order') }
        ]
    },
    {
        id: 'admin',
        name: 'Admin',
        icon: 'ri-shield-user-line',
        templates: [
            { id: 'admin_hesap_aktivasyonu', name: 'Hesap Aktivasyonu', defaultContent: baseTemplate('Hesap Aktivasyonu') },
            { id: 'admin_sifremi_unuttum', name: 'Şifremi Unuttum', defaultContent: baseTemplate('Şifremi Unuttum') },
            { id: 'admin_sifre_sifirlama', name: 'Şifre Sıfırlama', defaultContent: baseTemplate('Şifre Sıfırlama') },
            { id: 'admin_iptal_iade', name: 'İptal/İade Talebi', defaultContent: baseTemplate('İptal/İade Talebi') }
        ]
    },
    {
        id: 'uye',
        name: 'Üye',
        icon: 'ri-user-line',
        templates: [
            { id: 'uye_hesap_aktivasyonu', name: 'Hesap Aktivasyonu', defaultContent: baseTemplate('Hesap Aktivasyonu') },
            { id: 'uye_facebook_uyelik', name: 'Facebook ile Üyelik Bilgilendirmesi', defaultContent: baseTemplate('Facebook Üyelik') },
            { id: 'uye_google_uyelik', name: 'Google ile Üyelik Bilgilendirmesi', defaultContent: baseTemplate('Google Üyelik') },
            { id: 'uye_sifremi_unuttum', name: 'Şifremi Unuttum', defaultContent: baseTemplate('Şifremi Unuttum') },
            { id: 'uye_davetiye', name: 'Davetiye', defaultContent: baseTemplate('Davetiye') },
            { id: 'uye_urun_fiyat', name: 'Ürün Fiyat Bilgilendirme', defaultContent: baseTemplate('Ürün Fiyat Bilgilendirme') },
            { id: 'uye_urun_stok', name: 'Ürün Stok Bilgilendirme', defaultContent: baseTemplate('Ürün Stok Bilgilendirme') },
            { id: 'uye_urun_tavsiye', name: 'Ürün Tavsiye Et', defaultContent: baseTemplate('Ürün Tavsiye') },
            { id: 'uye_iptal_iade', name: 'İptal/İade Talebi', defaultContent: baseTemplate('İptal/İade Talebi') },
            { id: 'uye_havale_bildirim', name: 'Havale Bildirim Formu', defaultContent: baseTemplate('Havale Bildirim') }
        ]
    }
]