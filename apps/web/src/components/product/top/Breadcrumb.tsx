// apps/web/src/components/product/top/Breadcrumb.tsx
"use client";

import Link from "next/link";
import { ROUTES } from '@/src/config/routes';

/* Internal Imports */
import { useTranslations } from '@/src/hooks/Theme/useTranslations';
interface ProductBreadcrumbProps {
  productName: string;
  categoryName?: string;
  categorySlug?: string;
  subCategoryName?: string;
  subCategorySlug?: string;
}

export default function ProductBreadcrumb({
  productName,
  categoryName,
  categorySlug,
  subCategoryName,
  subCategorySlug
}: ProductBreadcrumbProps) {
  const { t } = useTranslations('general');

  return (
    <nav className="container pt-1 my-1 my-md-3" aria-label="breadcrumb">
      <ol className="breadcrumb">
        <li className="breadcrumb-item">
          <Link href={ROUTES.HOME}>
            {t('home')}
          </Link>
        </li>
        {categoryName && categorySlug && (
          <li className="breadcrumb-item">
            <Link
              href={`${ROUTES.CATEGORY}/${categorySlug}`}
            >
              {categoryName}
            </Link>
          </li>
        )}
        {subCategoryName && subCategorySlug && (
          <li className="breadcrumb-item">
            <Link
              href={`${ROUTES.CATEGORY}/${subCategorySlug}`}
            >
              {subCategoryName}
            </Link>
          </li>
        )}
        <li className="breadcrumb-item active" aria-current="page">
          {productName}
        </li>
      </ol>
    </nav>
  );
}