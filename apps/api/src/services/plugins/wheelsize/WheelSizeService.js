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
            throw error;
        }
    }

    async getMakes(params = {}) {
        const allMakes = await this.request('/makes/', {
            region: 'eudm',
            ...params
        });

        const EXCLUDED_KEYWORDS = [
            'samsung', 'korea', 'trucks', 'commercial', 'alpina',
            'amg', 'brabus', 'carlsson', 'russia', 'india', 'china'
        ];

        const filteredMakes = allMakes.filter(make => {
            const name = make.name.toLowerCase();
            const slug = make.slug.toLowerCase();

            const shouldExclude = EXCLUDED_KEYWORDS.some(keyword =>
                name.includes(keyword) || slug.includes(keyword)
            );

            return !shouldExclude;
        });

        return filteredMakes;
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

        // Slug'a göre unique yap
        const uniqueMap = new Map();
        modifications.forEach(mod => {
            if (mod.slug && !uniqueMap.has(mod.slug)) {
                uniqueMap.set(mod.slug, mod);
            }
        });

        return Array.from(uniqueMap.values()).sort((a, b) => {
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB);
        });
    }

    async getGenerations(make, model) {
        return this.request('/generations/', {
            make,
            model,
            region: this.defaultRegion
        });
    }

    async getGenerationImage(make, model, year) {
        try {
            const generations = await this.request('/generations/', {
                make,
                model,
                year,
                region: this.defaultRegion
            });

            if (generations && generations.length > 0) {
                const matchingGen = generations.find(gen =>
                    gen.years && gen.years.includes(year)
                );

                const targetGen = matchingGen || generations[0];

                if (targetGen.bodies && targetGen.bodies.length > 0 && targetGen.bodies[0].image) {
                    return targetGen.bodies[0].image;
                }
            }

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