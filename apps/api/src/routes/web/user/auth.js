const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const WebMember = require('../../../models/web/user/WebMember');
const WebAddress = require('../../../models/web/address/WebAddress');
const SettingsHelper = require('../../../utils/web/settingsHelper');
const authMiddleware = require('../../../middleware/authMiddleware');
const { sendTemplateMail } = require('../../../services/plugins/mail/mailOrchestrator');

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
        const existingMember = await WebMember.findOne({ email: email.toLowerCase(), site: req.site });
        if (existingMember) {
            return res.status(400).json({
                success: false,
                message: 'Bu e-posta adresi zaten kayıtlı.'
            });
        }

        // Aktivasyon durumuna göre status belirle
        // Aktivasyon durumuna göre status belirle
        // memberActivation enum: 'kapali' | 'bireysel' (email) | 'yonetici' (admin)
        let status = 'active';
        let activationToken = null;
        let activationTokenExpire = null;

        if (settings.memberActivation === 'admin') {
            status = 'pending';
        } else if (settings.memberActivation === 'personal') {
            status = 'pending';
            activationToken = crypto.randomBytes(32).toString('hex');
            activationTokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat
        }
        // Üye oluştur
        const member = new WebMember({
            site: req.site,
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone,
            password,
            marketingConsent: marketingConsent || false,
            termsAccepted,
            status,
            activationToken,
            activationTokenExpire
        });

        await member.save();

        // E-posta aktivasyonu ise mail gönder (fire-and-forget)
        if (settings.memberActivation === 'personal' && activationToken) {
            sendTemplateMail({
                templateKey: 'uye_hesap_aktivasyonu',
                context: {
                    memberId: member._id.toString(),
                    activationToken
                },
                to: member.email,
                alsoSendToAdmin: false
            }).then((mailResult) => {
                if (!mailResult.success) {
                    console.warn('[register] Aktivasyon maili gönderilemedi:', member.email, mailResult.errors);
                } else {
                    console.log('[register] Aktivasyon maili gönderildi:', member.email);
                }
            }).catch((err) => {
                console.error('[register] Aktivasyon mail hatası:', member.email, err.message);
            });
        }

        // Aktivasyon mesajı
        let message = 'Üyeliğiniz başarıyla oluşturuldu.';
        if (settings.memberActivation === 'admin') {
            message = 'Üyeliğiniz oluşturuldu. Yönetici onayından sonra giriş yapabileceksiniz.';
        } else if (settings.memberActivation === 'personal') {
            message = 'Üyeliğiniz oluşturuldu. E-posta adresinize gönderilen aktivasyon bağlantısına tıklayarak hesabınızı aktif ediniz.';
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
        const member = await WebMember.findOne({ email: email.toLowerCase(), site: req.site });
        if (!member) {
            return res.status(401).json({
                success: false,
                message: 'E-posta veya şifre hatalı.'
            });
        }

        // Durum kontrolü
        // Durum kontrolü
        if (member.status === 'pending') {
            // Aktivasyon moduna göre mesaj
            const settings = await SettingsHelper.checkMemberSettings();
            let message = 'Hesabınız henüz aktif değil.';

            if (settings.memberActivation === 'personal') {
                message = 'Hesabınız henüz aktif değil. Lütfen e-posta adresinize gönderilen aktivasyon bağlantısına tıklayınız.';
            } else if (settings.memberActivation === 'admin') {
                message = 'Hesabınız henüz aktif değil. Lütfen yönetici onayını bekleyiniz.';
            }
            return res.status(403).json({
                success: false,
                message
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

// Profil Getir
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findById(req.user._id).select('-password');
        if (!member) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: member._id,
                    email: member.email,
                    profile: {
                        firstName: member.firstName || '',
                        lastName: member.lastName || '',
                        phone: member.phone || ''
                    },
                    addresses: await WebAddress.find({ userId: member._id, isActive: true }).sort({ isDefault: -1 }).lean(),
                    marketingConsent: member.marketingConsent || false,
                    customerSegment: member.customerSegment || '',
                    statistics: {
                        totalOrders: member.totalOrders || 0,
                        totalSpent: member.totalSpent || 0
                    }
                }
            }
        });
    } catch (error) {
        console.error('Profile get error:', error);
        res.status(500).json({ success: false, message: 'Profil alınamadı.' });
    }
});

// Profil Güncelle
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findById(req.user._id);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
        }

        const { firstName, lastName, phone, marketingConsent } = req.body;

        if (firstName !== undefined) member.firstName = firstName;
        if (lastName !== undefined) member.lastName = lastName;
        if (phone !== undefined) member.phone = phone;
        if (marketingConsent !== undefined) member.marketingConsent = marketingConsent;

        await member.save();

        res.json({
            success: true,
            message: 'Profil güncellendi.',
            data: {
                user: {
                    id: member._id,
                    email: member.email,
                    profile: {
                        firstName: member.firstName,
                        lastName: member.lastName,
                        phone: member.phone
                    },
                    marketingConsent: member.marketingConsent
                }
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: 'Profil güncellenemedi.' });
    }
});

// Şifre Değiştir
router.put('/change-password', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findById(req.user._id);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
        }

        const { currentPassword, newPassword, newPasswordConfirm } = req.body;

        if (!currentPassword || !newPassword || !newPasswordConfirm) {
            return res.status(400).json({ success: false, message: 'Tüm alanları doldurunuz.' });
        }

        if (newPassword !== newPasswordConfirm) {
            return res.status(400).json({ success: false, message: 'Yeni şifreler eşleşmiyor.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Şifre en az 6 karakter olmalıdır.' });
        }

        const isValid = await member.comparePassword(currentPassword);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Mevcut şifre hatalı.' });
        }

        member.password = newPassword;
        await member.save();

        res.json({ success: true, message: 'Şifreniz başarıyla değiştirildi.' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Şifre değiştirilemedi.' });
    }
});

// Şifremi Unuttum - Token üret ve mail gönder
router.post('/forgot-password', async (req, res) => {
    // Güvenlik için her durumda aynı genel mesaj döner (user enumeration koruması)
    const genericMessage = 'Eğer bu e-posta adresi sistemimizde kayıtlıysa, şifre sıfırlama bağlantısı gönderilmiştir.';

    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'E-posta adresi giriniz.'
            });
        }

        const member = await WebMember.findOne({
            email: email.toLowerCase().trim(),
            site: req.site,
            status: { $ne: 'deleted' }
        });

        // Üye varsa token üret ve mail gönder
        if (member) {
            // 64 karakter hex token üret
            const resetToken = crypto.randomBytes(32).toString('hex');

            // 1 saat geçerli
            member.resetPasswordToken = resetToken;
            member.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
            await member.save();

            // Mail gönder (fire-and-forget)
            sendTemplateMail({
                templateKey: 'uye_sifremi_unuttum',
                context: {
                    memberId: member._id.toString(),
                    resetToken
                },
                to: member.email,
                alsoSendToAdmin: false
            }).then((mailResult) => {
                if (!mailResult.success) {
                    console.warn('[forgot-password] Mail gönderilemedi:', member.email, mailResult.errors);
                } else {
                    console.log('[forgot-password] Mail gönderildi:', member.email);
                }
            }).catch((err) => {
                console.error('[forgot-password] Mail hatası:', member.email, err.message);
            });
        }

        // Her durumda aynı mesaj
        res.json({
            success: true,
            message: genericMessage
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        // Hata durumunda da aynı mesaj (information leak engellenir)
        res.json({
            success: true,
            message: genericMessage
        });
    }
});

// Şifre Sıfırla - Token doğrula ve yeni şifreyi kaydet
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword, newPasswordConfirm } = req.body;

        if (!token || !newPassword || !newPasswordConfirm) {
            return res.status(400).json({
                success: false,
                message: 'Tüm alanları doldurunuz.'
            });
        }

        if (newPassword !== newPasswordConfirm) {
            return res.status(400).json({
                success: false,
                message: 'Şifreler eşleşmiyor.'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Şifre en az 6 karakter olmalıdır.'
            });
        }

        // Token doğrula (geçerlilik süresi de kontrol edilir)
        const member = await WebMember.findOne({
            resetPasswordToken: token,
            resetPasswordExpire: { $gt: new Date() },
            status: { $ne: 'deleted' }
        });

        if (!member) {
            return res.status(400).json({
                success: false,
                message: 'Sıfırlama bağlantısı geçersiz veya süresi dolmuş. Lütfen tekrar talep ediniz.'
            });
        }

        // Şifreyi güncelle (model pre-save hook'u hashleyecek)
        member.password = newPassword;

        // Token temizle (tek kullanımlık)
        member.resetPasswordToken = undefined;
        member.resetPasswordExpire = undefined;

        await member.save();

        res.json({
            success: true,
            message: 'Şifreniz başarıyla sıfırlandı. Şimdi yeni şifrenizle giriş yapabilirsiniz.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Şifre sıfırlanırken bir hata oluştu.'
        });
    }
});

// Hesap Aktivasyonu - Token doğrula ve hesabı aktif et
router.post('/activate', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Aktivasyon bağlantısı geçersiz.'
            });
        }

        // Token + süre kontrolü
        // Önce token ile dene
        let member = await WebMember.findOne({
            activationToken: token,
            activationTokenExpire: { $gt: new Date() },
            status: { $ne: 'deleted' }
        });

        // Token bulunamadıysa: Bu token kısa süre önce kullanılmış olabilir
        // (StrictMode/double-call senaryosu). Bu durumda success döndür.
        if (!member) {
            return res.json({
                success: true,
                message: 'Hesabınız aktif. Giriş yapabilirsiniz.',
                alreadyActivated: true
            });
        }

        // Zaten aktifse (token süresi dolmadan tekrar çağrılmış)
        if (member.status === 'active') {
            return res.json({
                success: true,
                message: 'Hesabınız aktif. Giriş yapabilirsiniz.',
                alreadyActivated: true
            });
        }

        // Aktif et
        member.status = 'active';
        member.activatedAt = new Date();
        member.activationToken = undefined;
        member.activationTokenExpire = undefined;

        await member.save();

        res.json({
            success: true,
            message: 'Hesabınız başarıyla aktif edildi. Şimdi giriş yapabilirsiniz.'
        });

    } catch (error) {
        console.error('Activation error:', error);
        res.status(500).json({
            success: false,
            message: 'Aktivasyon sırasında bir hata oluştu.'
        });
    }
});

module.exports = router;