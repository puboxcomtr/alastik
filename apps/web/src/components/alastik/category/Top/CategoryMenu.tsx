import Link from 'next/link';

interface MenuItemType {
    _id: string;
    name: string;
    menuType: 'link' | 'category' | 'page' | 'blog' | 'product' | 'tag' | 'brand' | 'heading';
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
        tagUrl?: string;
        tagId?: string;
        brandUrl?: string;
        brandId?: string;
    };
    openNewTab?: boolean;
    children?: MenuItemType[];
}

interface CategoryMenuProps {
    menu: {
        _id: string;
        name: string;
        menuType?: MenuItemType['menuType'];
        linkData?: MenuItemType['linkData'];
        items: MenuItemType[];
    } | null;
}

function itemUrl(item: MenuItemType): string {
    if (item.menuType === 'link') return item.linkData?.url || '#';
    if (item.menuType === 'category') return `/kategori/${item.linkData?.categoryUrl || item.linkData?.categoryId}`;
    if (item.menuType === 'page') return `/sayfa/${item.linkData?.pageUrl || item.linkData?.pageId}`;
    if (item.menuType === 'blog') return `/blog/${item.linkData?.blogUrl || item.linkData?.blogId}`;
    if (item.menuType === 'product') return `/urun/${item.linkData?.productUrl || item.linkData?.productId}`;
  if (item.menuType === 'tag') return `/etiket/${item.linkData?.tagUrl || item.linkData?.tagId}`;
  if (item.menuType === 'brand') return `/marka/${item.linkData?.brandUrl || item.linkData?.brandId}`;
    return '#';
}

export default function CategoryMenu({ menu }: CategoryMenuProps) {
    if (!menu || !menu.items || menu.items.length === 0) return null;

    const links = menu.items.flatMap(item =>
        item.menuType === 'heading' ? (item.children || []) : [item, ...(item.children || [])]
    );

    if (links.length === 0) return null;

    const baslikAdresi = menu.menuType && menu.menuType !== 'heading'
        ? itemUrl({ _id: menu._id, name: menu.name, menuType: menu.menuType, linkData: menu.linkData })
        : null;

    return (
        <div className="category-menu mb-4 pe-lg-4">
            {baslikAdresi ? (
                <Link href={baslikAdresi} className="h6 mb-2 d-block text-dark text-decoration-none animate-underline animate-target">
                    {menu.name}
                </Link>
            ) : (
                <div className="h6 mb-2">{menu.name}</div>
            )}
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
