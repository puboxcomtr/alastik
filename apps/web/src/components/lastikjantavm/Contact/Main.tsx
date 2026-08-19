'use client';

// LastikJantAVM iletişim sayfası — ortak Contact bileşeninden ayrıldı.
// İki şube (Mecidiyeköy + Maslak 1453) harita, telefon grupları ve
// her şubenin yanında kendi iletişim formu ile listelenir.
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Container, Row, Col } from 'react-bootstrap';
import { TextField, MenuItem, FormControl } from '@mui/material';
import Breadcumb from '@/src/components/contact/Content/Top/Breadcumb';

interface PhoneGroup {
    title: string;
    phones: string[];
    note?: string;
    link?: { href: string; label: string };
}

interface Branch {
    key: string;
    name: string;
    address: string;
    mapSrc: string;
    phoneGroups: PhoneGroup[];
}

const BRANCHES: Branch[] = [
    {
        key: 'mecidiyekoy',
        name: 'Mecidiyeköy Showroom & Servis',
        address: 'Galataderesi Caddesi Gülbahar Mahallesi No:51/B Mecidiyeköy - Şişli / İstanbul',
        mapSrc: 'https://maps.google.com/maps?q=' + encodeURIComponent('Lastik Jant AVM Gülbahar Mah. Galata Deresi Caddesi No:51/B Mecidiyeköy Şişli İstanbul') + '&z=16&output=embed',
        phoneGroups: [
            { title: 'Perakende Satış', phones: ['0212 212 08 08', '0532 672 05 52', '0530 825 01 10', '0850 333 38 08', '0536 031 99 15', '0531 334 40 40'] },
            { title: 'Kurumsal-Filo Satış', phones: ['0536 031 99 15', '0535 877 39 41', '0533 030 27 45'] },
            { title: 'Toptan Satış', phones: ['0212 217 93 93', '0530 441 91 12', '0530 956 01 90', '0539 783 74 02'] },
            { title: 'Mecidiyeköy Merkez Servis', phones: ['0530 825 01 10'] }
        ]
    },
    {
        key: 'maslak1453',
        name: 'Maslak 1453 Showroom & Servis',
        address: 'G5 Otopark Girişi, Maslak Mahallesi, Taşyoncası Sokak, Ağaoğlu, Maslak, 1453 Sitesi Alt Katı, 34398 Sarıyer / İstanbul',
        mapSrc: 'https://maps.google.com/maps?q=41.1207586,29.0075098&z=17&output=embed',
        phoneGroups: [
            { title: 'Perakende Satış', phones: ['0531 385 55 08', '0212 281 08 08', '0533 030 27 45'] },
            { title: 'Kurumsal-Filo Satış', phones: ['0212 281 08 08', '0536 031 99 15', '0533 030 27 45'] },
            {
                title: 'Lastik-Jant Oteli Randevu',
                phones: ['0212 325 23 34', '0850 433 99 08'],
                note: 'Randevu almak için (sadece sitemiz üzerinden):',
                link: { href: 'https://lastikjantoteli.com', label: 'lastikjantoteli.com' }
            },
            { title: 'Maslak Şube Servis', phones: ['0531 385 55 08'] }
        ]
    }
];

const inputSx = {
    '& .MuiOutlinedInput-root': {
        backgroundColor: '#fff',
        borderRadius: '50px',
        '& fieldset': { borderColor: '#e0e0e0' },
        '&:hover fieldset': { borderColor: '#bbb' },
        '&.Mui-focused fieldset': { borderColor: '#333' },
    }
};

const textareaSx = {
    '& .MuiOutlinedInput-root': {
        backgroundColor: '#fff',
        borderRadius: '16px',
        '& fieldset': { borderColor: '#e0e0e0' },
        '&:hover fieldset': { borderColor: '#bbb' },
        '&.Mui-focused fieldset': { borderColor: '#333' },
    }
};

const EMPTY_FORM = { name: '', surname: '', email: '', phone: '', subject: '', message: '' };

// Şube kartının yanında duran kompakt iletişim formu — her şube için ayrı örnek
function BranchContactForm({ branchName }: { branchName: string }) {
    const [formData, setFormData] = useState({ ...EMPTY_FORM });
    const [sending, setSending] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isValidPhone = (phone: string) => phone.replace(/\s/g, '').length >= 10;

    const getError = (field: string): string | null => {
        if (!touched[field]) return null;
        switch (field) {
            case 'subject': return !formData.subject ? 'Konu seçiniz' : null;
            case 'name': return !formData.name ? 'Adınızı giriniz' : null;
            case 'surname': return !formData.surname ? 'Soyadınızı giriniz' : null;
            case 'email':
                if (!formData.email) return 'E-posta adresinizi giriniz';
                if (!isValidEmail(formData.email)) return 'Geçerli bir e-posta adresi giriniz';
                return null;
            case 'phone':
                if (!formData.phone) return 'Telefon numaranızı giriniz';
                if (!isValidPhone(formData.phone)) return 'Geçerli bir telefon numarası giriniz';
                return null;
            case 'message': return !formData.message ? 'Mesajınızı giriniz' : null;
            default: return null;
        }
    };

    const handleSubmit = async () => {
        const requiredFields = ['subject', 'name', 'surname', 'email', 'phone', 'message'];
        const allTouched: Record<string, boolean> = {};
        requiredFields.forEach(f => { allTouched[f] = true; });
        setTouched(prev => ({ ...prev, ...allTouched }));

        const hasError = requiredFields.some(f => {
            if (!formData[f as keyof typeof formData]) return true;
            if (f === 'email' && !isValidEmail(formData.email)) return true;
            if (f === 'phone' && !isValidPhone(formData.phone)) return true;
            return false;
        });
        if (hasError) return;

        setSending(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    // Hangi şubeye yazıldığı mesajın başına eklenir
                    message: `[${branchName}]\n${formData.message}`
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Mesajınız iletildi');
                setFormData({ ...EMPTY_FORM });
                setTouched({});
            } else {
                toast.error(data.message || 'Bir hata oluştu');
            }
        } catch {
            toast.error('Bağlantı hatası');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-body-tertiary rounded-4 p-4 h-100">
            <h3 className="h5 mb-4">İletişim Formu</h3>

            <div className="mb-3">
                <label className="form-label">Konu <span className="text-danger">*</span></label>
                <FormControl fullWidth>
                    <TextField
                        select fullWidth size="small" name="subject"
                        value={formData.subject} onChange={handleChange}
                        onBlur={() => setTouched(prev => ({ ...prev, subject: true }))}
                        error={!!getError('subject')} helperText={getError('subject')}
                        SelectProps={{
                            displayEmpty: true,
                            MenuProps: { PaperProps: { style: { maxHeight: 200, overflowY: 'auto' } } },
                            IconComponent: (props) => <i {...props} className="ri-arrow-down-s-line" style={{ color: '#555', fontSize: 20 }} />
                        }}
                        sx={inputSx}
                    >
                        <MenuItem value="" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>Seçiniz</MenuItem>
                        <MenuItem value="genel" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>Genel Bilgi</MenuItem>
                        <MenuItem value="tedarik" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>Ürün Tedariği</MenuItem>
                        <MenuItem value="siparis" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>Sipariş Hakkında</MenuItem>
                        <MenuItem value="iade" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>İade / Değişim</MenuItem>
                        <MenuItem value="sikayet" sx={{ fontSize: '13px', borderBottom: '1px solid #eee' }}>Şikayet</MenuItem>
                        <MenuItem value="diger" sx={{ fontSize: '13px' }}>Diğer</MenuItem>
                    </TextField>
                </FormControl>
            </div>

            <Row className="mb-3">
                <Col sm={6} className="mb-3 mb-sm-0">
                    <label className="form-label">Adınız <span className="text-danger">*</span></label>
                    <TextField
                        fullWidth size="small" name="name" placeholder="Adınız"
                        value={formData.name} onChange={handleChange}
                        onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                        error={!!getError('name')} helperText={getError('name')}
                        sx={inputSx}
                    />
                </Col>
                <Col sm={6}>
                    <label className="form-label">Soyadınız <span className="text-danger">*</span></label>
                    <TextField
                        fullWidth size="small" name="surname" placeholder="Soyadınız"
                        value={formData.surname} onChange={handleChange}
                        onBlur={() => setTouched(prev => ({ ...prev, surname: true }))}
                        error={!!getError('surname')} helperText={getError('surname')}
                        sx={inputSx}
                    />
                </Col>
            </Row>

            <Row className="mb-3">
                <Col sm={6} className="mb-3 mb-sm-0">
                    <label className="form-label">E-posta <span className="text-danger">*</span></label>
                    <TextField
                        fullWidth size="small" type="email" name="email" placeholder="ornek@email.com"
                        value={formData.email} onChange={handleChange}
                        onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                        error={!!getError('email')} helperText={getError('email')}
                        sx={inputSx}
                    />
                </Col>
                <Col sm={6}>
                    <label className="form-label">Telefon <span className="text-danger">*</span></label>
                    <TextField
                        fullWidth size="small" type="tel" name="phone" placeholder="+90 5XX XXX XX XX"
                        value={formData.phone} onChange={handleChange}
                        onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                        error={!!getError('phone')} helperText={getError('phone')}
                        sx={inputSx}
                    />
                </Col>
            </Row>

            <div className="mb-3">
                <label className="form-label">Mesajınız <span className="text-danger">*</span></label>
                <TextField
                    fullWidth size="small" name="message" multiline rows={4}
                    placeholder="Mesajınızı buraya yazınız..."
                    value={formData.message} onChange={handleChange}
                    onBlur={() => setTouched(prev => ({ ...prev, message: true }))}
                    error={!!getError('message')} helperText={getError('message')}
                    sx={textareaSx}
                />
            </div>

            <button
                className="btn btn-lg btn-dark rounded-pill"
                onClick={handleSubmit}
                disabled={sending}
            >
                {sending ? 'Gönderiliyor...' : 'Mesaj Gönder'}
            </button>
        </div>
    );
}

export default function LastikJantAvmContact() {
    return (
        <>
            {/* Breadcrumb */}
            <section id="breadcumb">
                <Container>
                    <div className='row-fluid'>
                        <Row>
                            <Col lg={12}>
                                <Breadcumb />
                            </Col>
                        </Row>
                    </div>
                </Container>
            </section>

            {/* Şubeler — her şubenin yanında kendi iletişim formu */}
            <section id="branches">
                <Container>
                    <div className='row-fluid'>
                        <h1 className="h3 mb-4">Şubelerimiz</h1>
                        {BRANCHES.map((branch) => (
                            <Row className="g-4 mb-5" key={branch.key}>
                                <Col lg={7}>
                                    <div className="card h-100 border-0 shadow-sm rounded-4 overflow-hidden">
                                        <iframe
                                            src={branch.mapSrc}
                                            title={`LastikJantAVM ${branch.name} harita`}
                                            width="100%"
                                            height="280"
                                            style={{ border: 0 }}
                                            allowFullScreen
                                            loading="lazy"
                                            referrerPolicy="strict-origin-when-cross-origin"
                                        ></iframe>
                                        <div className="card-body">
                                            <h2 className="h5 mb-3">{branch.name}</h2>
                                            <p className="d-flex align-items-start mb-3">
                                                <i className="ri-map-pin-line me-2 mt-1"></i>
                                                <span>{branch.address}</span>
                                            </p>
                                            <Row className="g-3">
                                                {branch.phoneGroups.map((group) => (
                                                    <Col sm={6} key={group.title}>
                                                        <h3 className="h6 mb-2">{group.title}</h3>
                                                        <ul className="list-unstyled mb-0">
                                                            {group.phones.map((phone) => (
                                                                <li key={phone} className="mb-1">
                                                                    <i className="ri-phone-line me-2"></i>
                                                                    <a className="text-decoration-none" href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>
                                                                </li>
                                                            ))}
                                                            {group.note && group.link && (
                                                                <li className="mt-2">
                                                                    <small className="d-block text-muted">{group.note}</small>
                                                                    <i className="ri-global-line me-2"></i>
                                                                    <a className="text-decoration-none fw-medium" href={group.link.href} target="_blank" rel="noopener noreferrer">
                                                                        {group.link.label}
                                                                    </a>
                                                                </li>
                                                            )}
                                                        </ul>
                                                    </Col>
                                                ))}
                                            </Row>
                                        </div>
                                    </div>
                                </Col>
                                <Col lg={5}>
                                    <BranchContactForm branchName={branch.name} />
                                </Col>
                            </Row>
                        ))}
                    </div>
                </Container>
            </section>

        </>
    );
}
