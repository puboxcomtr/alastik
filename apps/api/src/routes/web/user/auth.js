const express = require('express');
const router = express.Router();
const WebMember = require('../../../models/web/user/WebMember');
const SettingsHelper = require('../../../utils/web/settingsHelper');
const jwt = require('jsonwebtoken');

// Üye Ol
router.post('/register', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            password,
            passwordConfirm,
            marketingConsent,
            termsAccepted
        } = req.body;

        // Üyelik ayarlarını kontrol et
        const settings = await SettingsHelper.checkMemberSettings();

        if (!settings.newMember) {
            return res.status(403).json({
                success: false,
                message: 'Üyelik sistemi şu anda kapalıdır. Lütfen daha sonra tekrar deneyiniz.'
            });
        }

        // Validasyon
        if (!firstName || !lastName || !email || !phone || !password || !passwordConfirm) {
            return res.status(400).json({
                success: false,
                message: 'Tüm alanları doldurunuz.'
            });
        }

        if (!termsAccepted) {
            return res.status(400).json({
                success: false,
                message: 'Üyelik sözleşmesini ve gizlilik politikasını onaylamanız gerekmektedir.'
            });
        }

        if (password !== passwordConfirm) {
            return res.status(400).json({
                success: false,
                message: 'Şifreler eşleşmiyor.'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Şifre en az 6 karakter olmalıdır.'
            });
        }

        // Email kontrolü
        const existingMember = await WebMember.findOne({ email: email.toLowerCase() });
        if (existingMember) {
            return res.status(400).json({
                success: false,
                message: 'Bu e-posta adresi zaten kayıtlı.'
            });
        }

        // Aktivasyon durumuna göre status belirle
        let status = 'active';
        if (settings.memberActivation === 'admin') {
            status = 'pending';
        } else if (settings.memberActivation === 'email') {
            status = 'pending';
            // Aktivasyon kodu oluştur (sonra mail gönderilecek)
        }

        // Üye oluştur
        const member = new WebMember({
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone,
            password,
            marketingConsent: marketingConsent || false,
            termsAccepted,
            status
        });

        await member.save();

        // Aktivasyon mesajı
        let message = 'Üyeliğiniz başarıyla oluşturuldu.';
        if (settings.memberActivation === 'admin') {
            message = 'Üyeliğiniz oluşturuldu. Yönetici onayından sonra giriş yapabileceksiniz.';
        } else if (settings.memberActivation === 'email') {
            message = 'Üyeliğiniz oluşturuldu. E-posta adresinize gönderilen aktivasyon bağlantısına tıklayınız.';
        }

        res.status(201).json({
            success: true,
            message,
            data: {
                email: member.email,
                status: member.status
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Üyelik oluşturulurken bir hata oluştu.'
        });
    }
});

// Giriş Yap
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'E-posta ve şifre giriniz.'
            });
        }

        // Üyeyi bul
        const member = await WebMember.findOne({ email: email.toLowerCase() });
        if (!member) {
            return res.status(401).json({
                success: false,
                message: 'E-posta veya şifre hatalı.'
            });
        }

        // Durum kontrolü
        if (member.status === 'pending') {
            return res.status(403).json({
                success: false,
                message: 'Hesabınız henüz aktif değil. Lütfen yönetici onayını bekleyiniz.'
            });
        }

        if (member.status === 'suspended') {
            return res.status(403).json({
                success: false,
                message: 'Hesabınız askıya alınmıştır. Lütfen destek ile iletişime geçiniz.'
            });
        }

        // Şifre kontrolü
        const isPasswordValid = await member.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'E-posta veya şifre hatalı.'
            });
        }

        // Token oluştur
        const token = jwt.sign(
            {
                id: member._id,
                email: member.email,
                type: 'member'
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' }
        );

        // Son giriş güncelle
        member.lastLoginAt = new Date();
        member.loginAttempts = 0;
        await member.save();

        res.json({
            success: true,
            message: 'Giriş başarılı.',
            data: {
                token,
                member: {
                    id: member._id,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    email: member.email,
                    phone: member.phone
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Giriş yapılırken bir hata oluştu.'
        });
    }
});

module.exports = router;