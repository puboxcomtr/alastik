import Link from 'next/link';

interface MenuItemType {
    _id: string;
    name: string;
    menuType: 'link' | 'category' | 'page' | 'blog' | 'product' | 'heading';
    linkData?: {
        url?: string;
        categoryUrl?: string;
        categoryId?: string;
        pageUrl?: string;
        pageId?: string;
        blogUrl?: string;
        blogId?: string;
        productUrl?: string;
        productId?: string;
    };
    openNewTab?: boolean;
    children?: MenuItemType[];
}

interface CategoryMenuProps {
    menu: { _id: string; name: string; items: MenuItemType[] } | null;
}

function itemUrl(item: MenuItemType): string {
    if (item.menuType === 'link') return item.linkData?.url || '#';
    if (item.menuType === 'category') return `/kategori/${item.linkData?.categoryUrl || item.linkData?.categoryId}`;
    if (item.menuType === 'page') return `/sayfa/${item.linkData?.pageUrl || item.linkData?.pageId}`;
    if (item.menuType === 'blog') return `/blog/${item.linkData?.blogUrl || item.linkData?.blogId}`;
    if (item.menuType === 'product') return `/urun/${item.linkData?.productUrl || item.linkData?.productId}`;
    return '#';
}

export default function CategoryMenu({ menu }: CategoryMenuProps) {
    if (!menu || !menu.items || menu.items.length === 0) return null;

    // Açılır öğeler de tek seviyede gösterilir (kategori sayfasında dropdown yoktur)
    const links = menu.items.flatMap(item =>
        item.menuType === 'heading' ? (item.children || []) : [item, ...(item.children || [])]
    );

    if (links.length === 0) return null;

    return (
        // Sol sidebar'ın en üstünde dikey liste; kutu çerçevesi yok, ayrım satır altı çizgisiyle
        <div className="category-menu mb-4 pe-lg-4">
            <div className="h6 mb-2">{menu.name}</div>
            <ul className="nav flex-column mb-0">
                {links.map(item => (
                    <li key={item._id} className="d-flex w-100 border-bottom py-2">
                        <Link
                            href={itemUrl(item)}
                            className="nav-link fw-normal text-truncate fs-sm text-muted p-0 animate-underline animate-target"
                            target={item.openNewTab ? '_blank' : undefined}
                        >
                            {item.name}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
