"use client";
import { useEffect, useState } from 'react';
import { Col, Container, Row, Button } from 'react-bootstrap';
import MobileFilterOffcanvas from '@components/alastik/category/Filter/Mobile/MobileFilterOffcanvas';
import MobileSortOffcanvas from '@components/alastik/category/Filter/Mobile/MobileSortOffcanvas';

interface MobileFilterSortProps {
    hideEbatFilters?: boolean;
    hiddenFilters?: string[];
    categorySlug?: string;
    tagSlug?: string;
    tagType?: string;
    brandSlug?: string;
}

export default function MobileFilterSort({ hideEbatFilters = false, categorySlug, tagSlug, tagType, brandSlug, hiddenFilters = [] }: MobileFilterSortProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    if (!isMobile) return null;

    return (
        <>
            <Container className="border-bottom mb-4 pb-3 px-0">
                <Row className='align-items-center'>
                    <Col xs={6}>
                        <Button variant="outline-dark" size="sm" className="w-100" style={{ height: '37px' }} onClick={() => setFilterOpen(true)}>
                            <i className="ri-filter-line me-2"></i>
                            Filtrele
                        </Button>
                    </Col>
                    <Col xs={6}>
                        <MobileSortOffcanvas />
                    </Col>
                </Row>
            </Container>

            <MobileFilterOffcanvas
                isOpen={filterOpen}
                onClose={() => setFilterOpen(false)}
                hideEbatFilters={hideEbatFilters}
                hiddenFilters={hiddenFilters}
                categorySlug={categorySlug}
                tagSlug={tagSlug}
                tagType={tagType}
                brandSlug={brandSlug}
            />
        </>
    );
}