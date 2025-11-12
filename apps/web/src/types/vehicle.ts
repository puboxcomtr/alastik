export interface Vehicle {
    _id: string;
    memberId: string;
    wheelSizeData: {
        make: string;
        makeName: string;
        model: string;
        modelName: string;
        year: number;
        generation?: string;
        modification?: string;
    };
    userInputs: {
        plateNumber?: string;
        mileage?: number;
        bodyType?: string;
        enginePower?: string;
    };
    image: {
        url: string;
        source: 'wheelsize' | 'upload' | 'default';
        uploadedAt?: Date;
    };
    compatibleSizes?: {
        tires: Array<{
            width: number;
            aspectRatio: number;
            diameter: number;
            display: string;
        }>;
        wheels: Array<{
            diameter: number;
            width: number;
            offset: number;
            boltPattern: string;
            centerBore: number;
            display: string;
        }>;
        lastUpdated: Date;
    };
    isActive: boolean;
    isPrimary: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface WheelSizeMake {
    slug: string;
    name: string;
}

export interface WheelSizeModel {
    slug: string;
    name: string;
}

export interface WheelSizeYear {
    year: number;
}

export interface WheelSizeGeneration {
    slug: string;
    name: string;
}

export interface WheelSizeModification {
    slug: string;
    name: string;
    bodyType?: string;
    enginePower?: string;
}

export interface VehicleFormData {
    make: string;
    makeName: string;
    model: string;
    modelName: string;
    year: number;
    generation?: string;
    modification?: string;
    plateNumber?: string;
    mileage?: number;
    isPrimary?: boolean;
}