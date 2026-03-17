// apps/api/src/services/WheelSizeService.js
const axios = require('axios');

class WheelSizeService {
    constructor() {
        this.userKey = process.env.WHEEL_SIZE_USER_KEY || 'd53fc3695c85571775540c1c9a3ac8c5';
        this.baseURL = 'https://api.wheel-size.com/v2';
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
    async getTireSectionWidths(params = {}) {
        try {
            return await this.request('/tire/list_section_widths/', {
                region: this.defaultRegion,
                ...params
            });
        } catch (error) {
            console.error('Tire section widths error:', error.message);
            return [
                { value: 145 }, { value: 155 }, { value: 165 }, { value: 175 },
                { value: 185 }, { value: 195 }, { value: 205 }, { value: 215 },
                { value: 225 }, { value: 235 }, { value: 245 }, { value: 255 },
                { value: 265 }, { value: 275 }, { value: 285 }, { value: 295 },
                { value: 305 }, { value: 315 }, { value: 325 }
            ];
        }
    }
    async getTireAspectRatios(params = {}) {
        try {
            return await this.request('/tire/list_aspect_ratios/', {
                region: this.defaultRegion,
                ...params
            });
        } catch (error) {
            console.error('Tire aspect ratios error:', error.message);
            return [
                { value: 25 }, { value: 30 }, { value: 35 }, { value: 40 },
                { value: 45 }, { value: 50 }, { value: 55 }, { value: 60 },
                { value: 65 }, { value: 70 }, { value: 75 }, { value: 80 }
            ];
        }
    }
    async getTireRimDiameters(params = {}) {
        try {
            return await this.request('/tire/list_rim_diameters/', {
                region: this.defaultRegion,
                ...params
            });
        } catch (error) {
            console.error('Tire rim diameters error:', error.message);
            return [
                { value: 13 }, { value: 14 }, { value: 15 }, { value: 16 },
                { value: 17 }, { value: 18 }, { value: 19 }, { value: 20 },
                { value: 21 }, { value: 22 }, { value: 23 }, { value: 24 }
            ];
        }
    }
    async getRimDiameters(params = {}) {
        try {
            return await this.request('/rim/list_diameters/', {
                region: this.defaultRegion,
                ...params
            });
        } catch (error) {
            console.error('Rim diameters error:', error.message);
            return [
                { value: 13 }, { value: 14 }, { value: 15 }, { value: 16 },
                { value: 17 }, { value: 18 }, { value: 19 }, { value: 20 },
                { value: 21 }, { value: 22 }, { value: 23 }, { value: 24 }
            ];
        }
    }
    async getRimWidths(params = {}) {
        try {
            return await this.request('/rim/list_widths/', {
                region: this.defaultRegion,
                ...params
            });
        } catch (error) {
            console.error('Rim widths error:', error.message);
            return [
                { value: 5.0 }, { value: 5.5 }, { value: 6.0 }, { value: 6.5 },
                { value: 7.0 }, { value: 7.5 }, { value: 8.0 }, { value: 8.5 },
                { value: 9.0 }, { value: 9.5 }, { value: 10.0 }, { value: 10.5 }
            ];
        }
    }
    async getRimOffsets(params = {}) {
        try {
            return await this.request('/rim/list_offsets/', {
                region: this.defaultRegion,
                ...params
            });
        } catch (error) {
            console.error('Rim offsets error:', error.message);
            return [
                { value: -15 }, { value: -10 }, { value: -5 }, { value: 0 },
                { value: 5 }, { value: 10 }, { value: 15 }, { value: 20 },
                { value: 25 }, { value: 30 }, { value: 35 }, { value: 40 }
            ];
        }
    }
    async getRimBoltPatterns(params = {}) {
        try {
            return await this.request('/rim/list_bolt_patterns/', {
                region: this.defaultRegion,
                ...params
            });
        } catch (error) {
            console.error('Rim bolt patterns error:', error.message);
            return [
                { value: '4x100' }, { value: '4x108' }, { value: '5x100' },
                { value: '5x108' }, { value: '5x112' }, { value: '5x114.3' },
                { value: '5x120' }, { value: '6x139.7' }
            ];
        }
    }
    async searchByTire(width, aspectRatio, rimDiameter) {
        try {
            const vehicles = await this.request('/by_tire/search/', {
                section_width: width,
                aspect_ratio: aspectRatio,
                rim_diameter: rimDiameter,
                region: this.defaultRegion
            });

            if (!vehicles || !Array.isArray(vehicles)) {
                return { total: 0, makes: [] };
            }

            // Marka > Model > Yıl grupla
            const grouped = {};

            // Marka logolarını çek
            let makesLogoMap = {};
            try {
                const allMakes = await this.request('/makes/', { region: this.defaultRegion });
                if (Array.isArray(allMakes)) {
                    allMakes.forEach(m => {
                        if (m.slug && m.logo) makesLogoMap[m.slug] = m.logo;
                    });
                }
            } catch (e) {
                console.warn('Marka logoları alınamadı:', e.message);
            }
            vehicles.forEach(v => {
                const makeSlug = v.make?.slug || 'other';
                const makeName = v.make?.name || 'Diger';
                const modelSlug = v.slug || 'model';
                const modelName = v.name || 'Model';

                if (!grouped[makeSlug]) {
                    grouped[makeSlug] = { name: makeName, slug: makeSlug, logo: makesLogoMap[makeSlug] || null, models: {} };
                }

                if (!grouped[makeSlug].models[modelSlug]) {
                    grouped[makeSlug].models[modelSlug] = {
                        name: modelName,
                        slug: modelSlug,
                        years: new Set(),
                        image: null
                    };
                }

                // year_ranges array'ini parse et
                if (v.year_ranges && Array.isArray(v.year_ranges)) {
                    v.year_ranges.forEach(range => {
                        const parts = range.split('-');
                        if (parts[0]) grouped[makeSlug].models[modelSlug].years.add(parseInt(parts[0]));
                        if (parts[1]) grouped[makeSlug].models[modelSlug].years.add(parseInt(parts[1]));
                    });
                }
            });

            // Set -> Array, sırala
            const makes = Object.values(grouped)
                .map(make => ({
                    ...make,
                    models: Object.values(make.models).map(m => ({
                        ...m,
                        years: Array.from(m.years).filter(y => !isNaN(y)).sort((a, b) => a - b)
                    })),
                    modelCount: Object.keys(make.models).length
                }))
                .sort((a, b) => b.modelCount - a.modelCount);

            return { total: vehicles.length, makes };
        } catch (error) {
            console.error('searchByTire error:', error.message);
            return { total: 0, makes: [] };
        }
    }
}

module.exports = new WheelSizeService();