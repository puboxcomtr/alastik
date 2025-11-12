// apps/api/src/services/WheelSizeService.js
const axios = require('axios');

class WheelSizeService {
    constructor() {
        this.baseURL = 'https://api.wheel-size.com/v2';
        this.userKey = process.env.WHEEL_SIZE_USER_KEY;
        this.defaultRegion = 'eudm';
    }

    async request(endpoint, params = {}) {
        try {
            const response = await axios.get(`${this.baseURL}${endpoint}`, {
                params: {
                    user_key: this.userKey,
                    ...params
                },
                timeout: 10000
            });

            return response.data.data || response.data;
        } catch (error) {
            console.error('Wheel Size API Error:', error.message);
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            }
            throw error;
        }
    }

    async getMakes(params = {}) {
        return this.request('/makes/', { region: this.defaultRegion, ...params });
    }

    async getModels(make, params = {}) {
        return this.request('/models/', { make, region: this.defaultRegion, ...params });
    }

    async getYears(make, model, params = {}) {
        return this.request('/years/', { make, model, ...params });
    }

    async getModifications(make, model, year) {
        const modifications = await this.request('/modifications/', {
            make,
            model,
            year,
            region: this.defaultRegion
        });

        const uniqueMap = new Map();

        modifications.forEach(mod => {
            const key = mod.trim?.toLowerCase().trim() || '';

            if (key && !uniqueMap.has(key)) {
                uniqueMap.set(key, mod);
            }
        });

        const uniqueModifications = Array.from(uniqueMap.values()).sort((a, b) => {
            const trimA = a.trim || '';
            const trimB = b.trim || '';
            return trimA.localeCompare(trimB);
        });

        return uniqueModifications;
    }

    async getGenerationImage(make, model, year) {
        try {
            console.log('[Fetching generation image]:', { make, model, year });

            const generations = await this.request('/generations/', {
                make,
                model,
                year,
                region: this.defaultRegion
            });

            console.log('[Generations API response count]:', generations.length);

            if (generations && generations.length > 0) {
                // Yıla uygun generation'ı bul
                const matchingGen = generations.find(gen =>
                    gen.years && gen.years.includes(year)
                );

                const targetGen = matchingGen || generations[0];
                console.log('[Selected generation]:', targetGen.name, targetGen.start + '-' + targetGen.end);

                // Bodies içinden ilk görseli al
                if (targetGen.bodies && targetGen.bodies.length > 0 && targetGen.bodies[0].image) {
                    console.log('[Using body image]:', targetGen.bodies[0].image);
                    return targetGen.bodies[0].image;
                }
            }

            console.log('[No image found in generations]');
            return null;
        } catch (error) {
            console.error('[Generation image fetch error]:', error.message);
            return null;
        }
    }
    async getVehicleDetails(make, model, year, modification) {
        return this.request('/search/by_model/', {
            make,
            model,
            year,
            modification,
            region: this.defaultRegion
        });
    }
}

module.exports = new WheelSizeService();