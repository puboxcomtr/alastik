// apps/web/src/components/category/Pagination/MainPagination.tsx
'use client';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalProducts: number;
}
export default function Pagination({ currentPage: propCurrentPage, totalPages, totalProducts }: PaginationProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [currentPage, setCurrentPage] = useState(propCurrentPage);

    useEffect(() => {
        setCurrentPage(propCurrentPage);
    }, [propCurrentPage]);

    const createPageUrl = (page: number) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', page.toString());
        return `${pathname}?${params.toString()}`;
    };

    const handlePageClick = (page: number) => {
        setCurrentPage(page);
        router.push(createPageUrl(page));
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
                    <button
                        onClick={() => currentPage > 1 && handlePageClick(currentPage - 1)}
                        className="page-link"
                        disabled={currentPage === 1}
                    >
                        <i className="ri-arrow-left-s-line"></i>
                    </button>
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
                            <button
                                onClick={() => handlePageClick(page as number)}
                                className="page-link"
                            >
                                {page}
                            </button>
                        </li>
                    );
                })}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                        onClick={() => currentPage < totalPages && handlePageClick(currentPage + 1)}
                        className="page-link"
                        disabled={currentPage === totalPages}
                    >
                        <i className="ri-arrow-right-s-line"></i>
                    </button>
                </li>
            </ul>
        </nav>
    );
}