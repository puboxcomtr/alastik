'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalProducts: number;
}
export default function Pagination({ currentPage: propCurrentPage, totalPages, totalProducts }: PaginationProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [currentPage, setCurrentPage] = useState(propCurrentPage);

    useEffect(() => {
        setCurrentPage(propCurrentPage);
    }, [propCurrentPage]);

    const createPageUrl = (page: number) => {
        const params = new URLSearchParams(searchParams);
        if (page <= 1) {
            params.delete('page');
        } else {
            params.set('page', page.toString());
        }
        const query = params.toString();
        return query ? `${pathname}?${query}` : pathname;
    };

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const showPages = 5;

        if (totalPages <= showPages + 2) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);

            if (currentPage > 3) {
                pages.push('...');
            }
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            pages.push(totalPages);
        }

        return pages;
    };
    if (totalPages <= 1) return null;

    return (
        <nav aria-label="Sayfalama">
            <ul className="pagination justify-content-center mt-4">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    {currentPage > 1 ? (
                        <Link
                            href={createPageUrl(currentPage - 1)}
                            onClick={() => setCurrentPage(currentPage - 1)}
                            className="page-link"
                            rel="prev"
                            aria-label="Önceki sayfa"
                        >
                            <i className="ri-arrow-left-s-line"></i>
                        </Link>
                    ) : (
                        <span className="page-link" aria-hidden="true">
                            <i className="ri-arrow-left-s-line"></i>
                        </span>
                    )}
                </li>
                {getPageNumbers().map((page, index) => {
                    if (page === '...') {
                        return (
                            <li key={`ellipsis-${index}`} className="page-item disabled">
                                <span className="page-link">...</span>
                            </li>
                        );
                    }
                    return (
                        <li
                            key={page}
                            className={`page-item ${currentPage === page ? 'active' : ''}`}
                        >
                            <Link
                                href={createPageUrl(page as number)}
                                onClick={() => setCurrentPage(page as number)}
                                className="page-link"
                                aria-current={currentPage === page ? 'page' : undefined}
                            >
                                {page}
                            </Link>
                        </li>
                    );
                })}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    {currentPage < totalPages ? (
                        <Link
                            href={createPageUrl(currentPage + 1)}
                            onClick={() => setCurrentPage(currentPage + 1)}
                            className="page-link"
                            rel="next"
                            aria-label="Sonraki sayfa"
                        >
                            <i className="ri-arrow-right-s-line"></i>
                        </Link>
                    ) : (
                        <span className="page-link" aria-hidden="true">
                            <i className="ri-arrow-right-s-line"></i>
                        </span>
                    )}
                </li>
            </ul>
        </nav>
    );
}
