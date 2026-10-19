
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';

export interface TagType {
    _id: string;
    title: string;
    description: string;
    seoTitle: string;
    seoDescription: string;
    seoUrl: string;
    products: string[];
    productCount: number;
    isActive: boolean;
    order: number;
    createdAt: string;
    updatedAt: string;
}

export interface TagsResponse {
    success: boolean;
    data: TagType[];
    pagination: {
        total: number;
        page: number;
        pages: number;
    };
}

export interface FetchTagsParams {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    type?: string;
}

export const fetchTags = async (params: FetchTagsParams = {}): Promise<TagsResponse> => {
    const {
        page = 1,
        limit = 1000,
        search,
        isActive,
        sortBy = 'order',
        sortOrder = 'asc',
        type
    } = params;

    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    queryParams.append('sortBy', sortBy);
    queryParams.append('sortOrder', sortOrder);

    if (search) queryParams.append('search', search);
    if (isActive !== undefined) queryParams.append('isActive', isActive.toString());
    if (type) queryParams.append('type', type);

    const response = await fetch(`${API_BASE_URL}/tags?${queryParams.toString()}`);
    if (!response.ok) throw new Error('Etiketler yüklenirken hata oluştu');
    return response.json();
};

export const fetchTagById = async (id: string): Promise<TagType> => {
    const response = await fetch(`${API_BASE_URL}/tags/${id}`);
    if (!response.ok) throw new Error('Etiket yüklenirken hata oluştu');
    const result = await response.json();
    return result.data;
};

export const updateTag = async (id: string, data: Partial<TagType>) => {
    const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Etiket güncellenirken hata oluştu');
    }
    return response.json();
};

export const deleteTag = async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Etiket silinirken hata oluştu');
    return response.json();
};