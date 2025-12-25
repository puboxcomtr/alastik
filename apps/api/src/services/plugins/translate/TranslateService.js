const axios = require('axios');

class TranslateService {
    constructor() {
        this.apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
        this.apiUrl = 'https://translation.googleapis.com/language/translate/v2';

        if (!this.apiKey) {
            throw new Error('GOOGLE_TRANSLATE_API_KEY bulunamadi!');
        }
    }

    async translateText(text) {
        if (!text) return text;

        try {
            const response = await axios.post(`${this.apiUrl}?key=${this.apiKey}`, {
                q: [text],
                target: 'tr'
            });

            return response.data.data.translations[0].translatedText;
        } catch (error) {
            console.error('Ceviri hatasi:', error.message);
            return text;
        }
    }

    async translateBatch(textArray) {
        if (!Array.isArray(textArray) || textArray.length === 0) {
            return textArray;
        }

        try {
            const response = await axios.post(`${this.apiUrl}?key=${this.apiKey}`, {
                q: textArray,
                target: 'tr'
            });

            return response.data.data.translations.map(t => t.translatedText);
        } catch (error) {
            console.error('\n!!! CEVIRI HATASI !!!');
            console.error('Mesaj:', error.message);
            console.error('Detay:', error);
            console.error('---\n');
            return textArray;
        }
    }
}

module.exports = TranslateService;