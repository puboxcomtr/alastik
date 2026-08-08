import { fetchAPI } from '@libs/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

export type SliderItemType = {
    image: string | null
    order: number
    description: string
    link: string
    isActive: boolean
    openNewTab: boolean
}

export type SliderSettingsType = {
    width?: string
    height?: string
    changeSpeed?: string
    displayDuration?: string
    showDescription?: boolean
    showNavButtons?: boolean
    showDots?: boolean
    isActive?: boolean
    autoStart?: boolean
    notes?: string
}

export type SliderType = {
    _id: string
    name: string
    sliders: SliderItemType[]
    settings: SliderSettingsType
    createdAt: Date
    updatedAt: Date
}

export async function fetchSliders() {
    try {
        return await fetchAPI(`${API_URL}/admin/design/slider`, {
            cache: 'no-store'
        })
    } catch {
        throw new Error('Sliderlar yüklenemedi')
    }
}

export async function fetchSlider(id: string) {
    try {
        return await fetchAPI(`${API_URL}/admin/design/slider/${id}`, {
            cache: 'no-store'
        })
    } catch {
        throw new Error('Slider bulunamadı')
    }
}

export async function getSliderById(id: string) {
    let result: any

    try {
        result = await fetchAPI(`${API_URL}/admin/design/slider/${id}`, {
            cache: 'no-store'
        })
    } catch {
        throw new Error('Slider bulunamadı')
    }

    if (!result.success) {
        throw new Error(result.message || 'Slider detayı alınamadı')
    }

    return result.data
}

export async function createSlider(formData: FormData) {
    try {
        return await fetchAPI(`${API_URL}/admin/design/slider`, {
            method: 'POST',
            body: formData
        })
    } catch {
        throw new Error('Slider oluşturulamadı')
    }
}

export async function updateSlider(id: string, formData: FormData) {
    try {
        return await fetchAPI(`${API_URL}/admin/design/slider/${id}`, {
            method: 'PUT',
            body: formData
        })
    } catch {
        throw new Error('Slider güncellenemedi')
    }
}

export async function deleteSlider(id: string) {
    try {
        return await fetchAPI(`${API_URL}/admin/design/slider/${id}`, {
            method: 'DELETE'
        })
    } catch {
        throw new Error('Slider silinemedi')
    }
}