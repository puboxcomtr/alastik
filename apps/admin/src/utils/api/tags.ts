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

export const fetchTags = async (): Promise<TagsResponse> => {
    const response = await fetch(`${API_BASE_URL}/tags`);
    if (!response.ok) throw new Error('Etiketler yüklenirken hata oluştu');
    return response.json();
};

export const deleteTag = async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Etiket silinirken hata oluştu');
    return response.json();
};