import React, { useState } from 'react';
import { Row, Col } from 'react-bootstrap';
import { TextField, MenuItem, FormControl } from '@mui/material';

interface ContactFormProps {
  formData: {
    name: string;
    surname: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
  };
  sending: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSubmit: () => void;
}

export default function ContactForm({ formData, sending, handleChange, handleSubmit }: ContactFormProps) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
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

  const handleFormSubmit = () => {
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

    if (!hasError) {
      handleSubmit().then(() => {
        setTouched({});
      });
    }
  };

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

  return (
    <section className="row row-cols-1 row-cols-md-2 g-0 overflow-hidden rounded-5">
      {/* Form */}
      <div className="col bg-body-tertiary py-5 px-4 px-xl-5">
        <div className="py-md-2 px-md-1 px-lg-3 mx-lg-3">

          {/* Konu */}
          <div className="position-relative mb-4">
            <label className="form-label">Konu <span className="text-danger">*</span></label>
            <FormControl fullWidth>
              <TextField
                select fullWidth size="small" name="subject"
                value={formData.subject} onChange={handleChange}
                onBlur={() => handleBlur('subject')}
                error={!!getError('subject')}
                helperText={getError('subject')}
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

          {/* Ad Soyad */}
          <Row className="mb-4">
            <Col md={6} className="mb-4 mb-md-0">
              <label className="form-label">Adınız <span className="text-danger">*</span></label>
              <TextField
                fullWidth size="small" name="name" placeholder="Adınız"
                value={formData.name} onChange={handleChange}
                onBlur={() => handleBlur('name')}
                error={!!getError('name')} helperText={getError('name')}
                sx={inputSx}
              />
            </Col>
            <Col md={6}>
              <label className="form-label">Soyadınız <span className="text-danger">*</span></label>
              <TextField
                fullWidth size="small" name="surname" placeholder="Soyadınız"
                value={formData.surname} onChange={handleChange}
                onBlur={() => handleBlur('surname')}
                error={!!getError('surname')} helperText={getError('surname')}
                sx={inputSx}
              />
            </Col>
          </Row>

          {/* Email Telefon */}
          <Row className="mb-4">
            <Col md={6} className="mb-4 mb-md-0">
              <label className="form-label">E-posta <span className="text-danger">*</span></label>
              <TextField
                fullWidth size="small" type="email" name="email" placeholder="ornek@email.com"
                value={formData.email} onChange={handleChange}
                onBlur={() => handleBlur('email')}
                error={!!getError('email')} helperText={getError('email')}
                sx={inputSx}
              />
            </Col>
            <Col md={6}>
              <label className="form-label">Telefon <span className="text-danger">*</span></label>
              <TextField
                fullWidth size="small" type="tel" name="phone" placeholder="+90 5XX XXX XX XX"
                value={formData.phone} onChange={handleChange}
                onBlur={() => handleBlur('phone')}
                error={!!getError('phone')} helperText={getError('phone')}
                sx={inputSx}
              />
            </Col>
          </Row>

          {/* Mesaj */}
          <div className="position-relative mb-4">
            <label className="form-label">Mesajınız <span className="text-danger">*</span></label>
            <TextField
              fullWidth size="small" name="message" multiline rows={5}
              placeholder="Mesajınızı buraya yazınız..."
              value={formData.message} onChange={handleChange}
              onBlur={() => handleBlur('message')}
              error={!!getError('message')} helperText={getError('message')}
              sx={textareaSx}
            />
          </div>

          {/* Gönder */}
          <div className="pt-2">
            <button
              className="btn btn-lg btn-dark rounded-pill"
              onClick={handleFormSubmit}
              disabled={sending}
            >
              {sending ? 'Gönderiliyor...' : 'Mesaj Gönder'}
            </button>
          </div>
        </div>
      </div>

      {/* Sağ Görsel */}
      <div className="col position-relative d-none d-md-block" style={{ minHeight: '500px' }}>
        <img
          src="/assets/img/contact_bg.jpg"
          className="position-absolute top-0 start-0 w-100 h-100 object-fit-cover"
          alt="İletişim"
        />
      </div>
    </section>
  );
}