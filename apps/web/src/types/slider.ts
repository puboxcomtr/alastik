export interface SliderItem {
    image: string;
    order?: number;
    description?: string;
    link?: string;
    isActive?: boolean;
    openNewTab?: boolean;
}

export interface SliderSettings {
    width?: string;
    height?: string;
    changeSpeed?: string;
    displayDuration?: string;
    showDescription?: boolean;
    showNavButtons?: boolean;
    showDots?: boolean;
    isActive?: boolean;
    autoStart?: boolean;
    notes?: string;
    slidesPerView?: number;
    slidesPerViewMobile?: number;
    slidesPerViewTablet?: number;
    spaceBetween?: number;
    loop?: boolean;
}

export interface Slider {
    _id: string;
    name: string;
    key?: string;
    sliders: SliderItem[];
    settings?: SliderSettings;
    createdAt?: string;
    updatedAt?: string;
}