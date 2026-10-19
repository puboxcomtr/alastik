'use client';
import { useEffect, useState } from 'react';
import { CategoryCatalog } from '@components/b2b-theme/category-catalog';

export type CategoryTab = { slug: string; label: string };

export const CATEGORY_TAB_PARAM = 'tab';

export function CategoryTabs({ tabs }: { tabs: CategoryTab[] }) {
    const [active, setActive] = useState(tabs[0].slug);

    useEffect(() => {
        const sync = () => {
            const fromUrl = new URLSearchParams(window.location.search).get(CATEGORY_TAB_PARAM);
            setActive(tabs.some((t) => t.slug === fromUrl) ? (fromUrl as string) : tabs[0].slug);
        };
        sync();
        window.addEventListener('popstate', sync);
        return () => window.removeEventListener('popstate', sync);
    }, [tabs]);

    function select(slug: string) {
        if (slug === active) return;
        window.history.pushState(null, '', `${window.location.pathname}?${CATEGORY_TAB_PARAM}=${encodeURIComponent(slug)}`);
        setActive(slug);
    }

    return (
        <>
            <div className="catalog-tabs" role="tablist">
                {tabs.map((t) => (
                    <button
                        key={t.slug}
                        type="button"
                        role="tab"
                        aria-selected={t.slug === active}
                        className={t.slug === active ? 'aktif' : undefined}
                        onClick={() => select(t.slug)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            <CategoryCatalog key={active} kategori={active} />
        </>
    );
}
