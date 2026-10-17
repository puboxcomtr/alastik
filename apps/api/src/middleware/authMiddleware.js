const jwt = require('jsonwebtoken');
const WebMember = require('../models/web/user/WebMember');

module.exports = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Yetkilendirme token bulunamadı'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await WebMember.findOne({
            _id: decoded.id,
            status: 'active'
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        req.user = user;
        // Plasiyerin bayi adına açtığı oturum (b2b): token'daki plasiyer kimliği; normal oturumda boş
        req.impersonatedBy = decoded.impersonatedBy ? String(decoded.impersonatedBy) : '';
        next();
    } catch (error) {
        console.error('Auth middleware hatası:', error);
        res.status(401).json({
            success: false,
            message: 'Geçersiz token'
        });
    }
};