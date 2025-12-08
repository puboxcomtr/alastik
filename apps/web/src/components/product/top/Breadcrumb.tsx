"use client";

import Link from "next/link";

interface BreadcrumbProps {
  productName: string;
}

export default function ProductBreadcrumb({ productName }: BreadcrumbProps) {
  return (
    <nav className="container pt-1 my-1 my-md-3" aria-label="breadcrumb">
      <ol className="breadcrumb">
        <li className="breadcrumb-item">
          <Link href="/" className="text-decoration-none">
            Anasayfa
          </Link>
        </li>
        <li className="breadcrumb-item">
          <Link href="/category/asd" className="text-decoration-none">
            Lastik
          </Link>
        </li>
        <li className="breadcrumb-item">
          <Link href="/category/asd" className="text-decoration-none">
            Otomobil Lastiği
          </Link>
        </li>
        <li className="breadcrumb-item active" aria-current="page">
          {productName}
        </li>
      </ol>
    </nav>
  );
}
