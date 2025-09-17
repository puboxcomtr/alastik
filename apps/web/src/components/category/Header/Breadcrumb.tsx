"use client";

import Link from "next/link";

interface BreadcrumbProps {
  categorySlug?: string;
}

export default function Breadcrumb({ categorySlug }: BreadcrumbProps) {
  // Fake JSON data
  const categories = [
    { slug: "lastikler", name: "Lastikler", parent: null },
    { slug: "yaz-lastigi", name: "Yaz Lastiği", parent: "lastikler" },
    { slug: "kis-lastigi", name: "Kış Lastiği", parent: "lastikler" },
    { slug: "4-mevsim", name: "4 Mevsim Lastiği", parent: "lastikler" },
  ];

  const category = categories.find((c) => c.slug === categorySlug);
  const parentCategory = category
    ? categories.find((c) => c.slug === category.parent)
    : null;

  return (
    <nav className="container pt-1 my-1 my-md-3" aria-label="breadcrumb">
      <ol className="breadcrumb">
        <li className="breadcrumb-item">
          <Link href="/" className="text-decoration-none">
            Anasayfa
          </Link>
        </li>
        {parentCategory && (
          <li className="breadcrumb-item">
            <Link
              href={`/category/${parentCategory.slug}`}
              className="text-decoration-none"
            >
              {parentCategory.name}
            </Link>
          </li>
        )}
        {category && (
          <li className="breadcrumb-item active" aria-current="page">
            {category.name}
          </li>
        )}
      </ol>
    </nav>
  );
}
