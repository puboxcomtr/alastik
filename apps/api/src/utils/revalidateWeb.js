const axios = require('axios');

async function revalidateWebTag(tag) {
    try {
        const webUrl = process.env.FRONTEND_URL;
        const secret = process.env.REVALIDATE_SECRET;

        if (!webUrl || !secret) {
            console.warn('[Revalidate] FRONTEND_URL veya REVALIDATE_SECRET tanımsız');
            return false;
        }

        const response = await axios.post(
            `${webUrl}/api/revalidate`,
            { tag },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-revalidate-secret': secret
                },
                timeout: 5000
            }
        );

        console.log(`[Revalidate] Başarılı: ${tag}`, response.data);
        return true;
    } catch (error) {
        const status = error.response?.status;
        const msg = error.response?.data?.message || error.message;
        console.error(`[Revalidate] Cache temizleme hatası (${status}):`, msg);
        return false;
    }
}

module.exports = { revalidateWebTag };