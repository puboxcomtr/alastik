export interface SliderItem {
    image: string;
    order: number;
    description?: string;
    link?: string;
    isActive: boolean;
    openNewTab: boolean;
}

export interface Slider {
    _id: string;
    name: string;
    sliders: SliderItem[];
    settings?: any;
}

export interface SliderResponse {
    success: boolean;
    data?: Slider;
    message?: string;
}