const jwt = require('jsonwebtoken');
const WebSalesperson = require('../models/web/user/WebSalesperson');

/**
 * Plasiyer (satış personeli) oturum doğrulaması.
 * Token'da type:'salesperson' olmalı; kayıt aktif değil, ŞİFRESİ OLAN plasiyer geçerlidir.
 * req.salesperson = WebSalesperson dokümanı olarak set edilir.
 */
module.exports = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme token bulunamadı' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== 'salesperson') {
            return res.status(401).json({ success: false, message: 'Geçersiz plasiyer oturumu' });
        }

        const sp = await WebSalesperson.findOne({ _id: decoded.id, site: req.site });
        if (!sp || !sp.password) {
            return res.status(401).json({ success: false, message: 'Plasiyer bulunamadı veya erişim kapalı' });
        }

        req.salesperson = sp;
        next();
    } catch (error) {
        console.error('Plasiyer auth middleware hatası:', error);
        res.status(401).json({ success: false, message: 'Geçersiz token' });
    }
};
