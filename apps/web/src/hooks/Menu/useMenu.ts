import { useState, useEffect } from 'react';
import { api } from '@/src/lib/api';

interface MenuItem {
    _id: string;
    name: string;
    menuType: 'link' | 'category' | 'page' | 'blog' | 'product';
    linkData: {
        url?: string;
        categoryId?: string;
        categoryName?: string;
        categoryUrl?: string;
        pageId?: string;
        pageTitle?: string;
        pageUrl?: string;
        blogId?: string;
        blogTitle?: string;
        blogUrl?: string;
        productId?: string;
        productTitle?: string;
        productUrl?: string;
    };
    openNewTab: boolean;
    rowLevel: number;
    children?: MenuItem[];
}

export const useMenu = () => {
    const [menus, setMenus] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMenus();
    }, []);

    const fetchMenus = async () => {
        try {
            const result = await api.menu.getHeader();
            if (result.success) {
                setMenus(result.data);
            }
        } catch (error) {
            console.error('Menu fetch error:', error);
        }
    };

    const getMenuUrl = (menu: MenuItem): string => {
        switch (menu.menuType) {
            case 'link':
                return menu.linkData.url || '#';
            case 'category':
                return `/kategori/${menu.linkData.categoryUrl || menu.linkData.categoryId}`;
            case 'page':
                return `/sayfa/${menu.linkData.pageUrl || menu.linkData.pageId}`;
            case 'blog':
                return `/blog/${menu.linkData.blogUrl || menu.linkData.blogId}`;
            case 'product':
                return `/urun/${menu.linkData.productUrl || menu.linkData.productId}`;
            default:
                return '#';
        }
    };

    return { menus, getMenuUrl };
};