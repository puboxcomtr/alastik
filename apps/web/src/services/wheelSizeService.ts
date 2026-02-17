// apps/web/src/services/wheelSizeService.ts
import { API_ENDPOINTS } from '@/src/config/api';

export interface WheelSizeTireInfo {
    tire: string;
    tire_width: number;
    tire_aspect_ratio: number;
    rim_diameter: number;
    tire_construction?: string;
    load_index?: number;
    speed_index?: string;
    tire_pressure?: {
        bar: number;
        psi: number;
        kPa: number;
    } | null;
}

export interface WheelData {
    is_stock: boolean;
    is_recommended_for_winter: boolean;
    front: WheelSizeTireInfo;
    rear: WheelSizeTireInfo;
}

export interface VehicleDetailsResponse {
    slug: string;
    name: string;
    wheels: WheelData[];
    generation?: {
        name: string;
        bodies?: Array<{ name?: string; image?: string }>;
    };
    engine?: {
        fuel: string;
        capacity: string;
        type: string;
        power: {
            kW: number;
            PS: number;
            hp: number;
        };
        code?: string;
    };
}

export interface TireOption {
    id: string;
    display: string;
    width: number;
    aspectRatio: number;
    diameter: number;
    construction: string;
    loadIndex?: number;
    speedIndex?: string;
    isStock: boolean;
    isWinter: boolean;
    pressure?: {
        bar: number;
        psi: number;
    } | null;
}

export type TirePosition = 'front' | 'rear' | 'both';

export interface GroupedTires {
    front: TireOption[];
    rear: TireOption[];
    both: TireOption[];
}

class WheelSizeService {
    async getVehicleDetails(
        make: string,
        model: string,
        year: number,
        modification: string
    ): Promise<VehicleDetailsResponse[]> {
        const params = new URLSearchParams({
            make,
            model,
            year: year.toString(),
            modification
        });

        const response = await fetch(`${API_ENDPOINTS.wheelsize.vehicleDetails()}?${params}`);

        if (!response.ok) {
            throw new Error(`API Hatası: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'API isteği başarısız');
        }

        return result.data || [];
    }

    parseGroupedTires(vehicleData: VehicleDetailsResponse[]): GroupedTires {
        const vehicle = vehicleData[0];
        if (!vehicle?.wheels) {
            return { front: [], rear: [], both: [] };
        }

        const frontMap = new Map<string, TireOption>();
        const rearMap = new Map<string, TireOption>();
        const bothMap = new Map<string, TireOption>();

        vehicle.wheels.forEach((wheel) => {
            const front = wheel.front;
            const rear = wheel.rear;

            if (!front?.tire || !front.tire_width) return;

            const frontKey = front.tire;
            const hasRear = rear?.tire && rear.tire_width && rear.tire !== front.tire;

            if (hasRear) {
                if (!frontMap.has(frontKey)) {
                    frontMap.set(frontKey, {
                        id: `front-${frontKey}`,
                        display: front.tire,
                        width: front.tire_width,
                        aspectRatio: front.tire_aspect_ratio,
                        diameter: front.rim_diameter,
                        construction: front.tire_construction || 'R',
                        loadIndex: front.load_index,
                        speedIndex: front.speed_index,
                        isStock: wheel.is_stock || false,
                        isWinter: wheel.is_recommended_for_winter || false,
                        pressure: front.tire_pressure ? { bar: front.tire_pressure.bar, psi: front.tire_pressure.psi } : null
                    });
                }

                const rearKey = rear.tire;
                if (!rearMap.has(rearKey)) {
                    rearMap.set(rearKey, {
                        id: `rear-${rearKey}`,
                        display: rear.tire,
                        width: rear.tire_width,
                        aspectRatio: rear.tire_aspect_ratio,
                        diameter: rear.rim_diameter,
                        construction: rear.tire_construction || 'R',
                        loadIndex: rear.load_index,
                        speedIndex: rear.speed_index,
                        isStock: wheel.is_stock || false,
                        isWinter: wheel.is_recommended_for_winter || false,
                        pressure: rear.tire_pressure ? { bar: rear.tire_pressure.bar, psi: rear.tire_pressure.psi } : null
                    });
                }
            } else {
                if (!bothMap.has(frontKey)) {
                    bothMap.set(frontKey, {
                        id: `both-${frontKey}`,
                        display: front.tire,
                        width: front.tire_width,
                        aspectRatio: front.tire_aspect_ratio,
                        diameter: front.rim_diameter,
                        construction: front.tire_construction || 'R',
                        loadIndex: front.load_index,
                        speedIndex: front.speed_index,
                        isStock: wheel.is_stock || false,
                        isWinter: wheel.is_recommended_for_winter || false,
                        pressure: front.tire_pressure ? { bar: front.tire_pressure.bar, psi: front.tire_pressure.psi } : null
                    });
                }
            }
        });

        const sortFn = (a: TireOption, b: TireOption) => {
            if (a.isStock && !b.isStock) return -1;
            if (!a.isStock && b.isStock) return 1;
            if (a.diameter !== b.diameter) return a.diameter - b.diameter;
            return a.width - b.width;
        };

        return {
            front: Array.from(frontMap.values()).sort(sortFn),
            rear: Array.from(rearMap.values()).sort(sortFn),
            both: Array.from(bothMap.values()).sort(sortFn)
        };
    }
}

export const wheelSizeService = new WheelSizeService();
export default wheelSizeService;