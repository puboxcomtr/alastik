// apps/web/src/components/category/Header/Breadcrumb.tsx
"use client";
import Link from "next/link";
import { ROUTES } from '@/src/config/routes';

/* Type */
import type { BreadcrumbProps } from '@/src/types/category';

/* * Internal Imports  */
import { useTranslations } from '@/src/hooks/Theme/useTranslations';

export default function Breadcrumb({
  categoryName,
  categorySlug,
  parentCategory,
  sizeInfo
}: BreadcrumbProps) {
  const { t } = useTranslations('general');

  return (
    <nav aria-label="breadcrumb">
      <ol className="breadcrumb">
        {/* Ana Sayfa */}
        <li className="breadcrumb-item">
          <Link href={ROUTES.HOME} className="text-decoration-none">
            {t('home')}
          </Link>
        </li>
        {/* Parent Kategori (varsa) */}
        {parentCategory && (
          <li className="breadcrumb-item">
            <Link
              href={`${ROUTES.CATEGORY}/${parentCategory.slug}`}
              className="text-decoration-none"
            >
              {parentCategory.name}
            </Link>
          </li>
        )}

        {/* Mevcut Kategori */}
        <li className={`breadcrumb-item ${!sizeInfo ? 'active' : ''}`} aria-current={!sizeInfo ? 'page' : undefined}>
          {sizeInfo ? (
            <Link href={`${ROUTES.CATEGORY}/${categorySlug}`} className="text-decoration-none">
              {categoryName}
            </Link>
          ) : (
            categoryName
          )}
        </li>

        {/* Lastik Ebadı (varsa) */}
        {sizeInfo && (
          <li className="breadcrumb-item active" aria-current="page">
            {sizeInfo.formatted}
          </li>
        )}
      </ol>
    </nav>
  );
}