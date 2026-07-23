import { getSiteHeader } from '@/utils/activeSite'

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
    const response = await fetch(`${API_URL}/admin/design/slider`, {
        cache: 'no-store',
        headers: { ...getSiteHeader() }
    })
    if (!response.ok) {
        throw new Error('Sliderlar yüklenemedi')
    }

    return response.json()
}

export async function fetchSlider(id: string) {
    const response = await fetch(`${API_URL}/admin/design/slider/${id}`, {
        cache: 'no-store',
        headers: { ...getSiteHeader() }
    })
    if (!response.ok) {
        throw new Error('Slider bulunamadı')
    }
    return response.json()
}

export async function getSliderById(id: string) {
    const response = await fetch(`${API_URL}/admin/design/slider/${id}`, {
        cache: 'no-store',
        headers: { ...getSiteHeader() }
    })
    if (!response.ok) {
        throw new Error('Slider bulunamadı')
    }
    const result = await response.json()

    if (!result.success) {
        throw new Error(result.message || 'Slider detayı alınamadı')
    }

    return result.data
}

export async function createSlider(formData: FormData) {
    const response = await fetch(`${API_URL}/admin/design/slider`, {
        method: 'POST',
        headers: { ...getSiteHeader() },
        body: formData
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Slider oluşturulamadı')
    }

    return response.json()
}

export async function updateSlider(id: string, formData: FormData) {
    const response = await fetch(`${API_URL}/admin/design/slider/${id}`, {
        method: 'PUT',
        headers: { ...getSiteHeader() },
        body: formData
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Slider güncellenemedi')
    }

    return response.json()
}

export async function deleteSlider(id: string) {
    const response = await fetch(`${API_URL}/admin/design/slider/${id}`, {
        method: 'DELETE',
        headers: { ...getSiteHeader() }
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Slider silinemedi')
    }

    return response.json()
}