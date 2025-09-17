'use client';

import Link from "next/link";
import { useState } from "react";

/* Metarial IO */
import Tooltip from '@mui/material/Tooltip';
import Rating from '@mui/material/Rating';

/* Library */
import Dropdown from "react-bootstrap/Dropdown";
import Image from "react-bootstrap/Image";


export default function ProductCardFull() {
    const [value, setValue] = useState<number | null>(4);
    const [isFavorite, setIsFavorite] = useState(false);
    const toggleFavorite = () => {
        setIsFavorite((prev) => !prev);
    };

    return (
        <div className="product-card animate-underline hover-effect-opacity bg-body rounded">
            <div className="position-relative">
                <div className="position-absolute top-0 end-0 z-2 hover-effect-target opacity-0 mt-3 me-3">
                    <div className="d-flex flex-column gap-2">
                        <button
                            type="button"
                            onClick={toggleFavorite}
                            className="btn btn-icon btn-secondary animate-pulse d-none d-lg-inline-flex"
                            aria-label="Favorilere Ekle"
                        >
                            {isFavorite ? (
                                <i className="ri-heart-fill fs-base text-danger animate-target"></i>
                            ) : (
                                <i className="ri-heart-line fs-base animate-target"></i>
                            )}
                        </button>
                    </div>
                </div>
                <div className="d-lg-none position-absolute top-0 end-0 z-2 mt-2 me-2">
                    <Dropdown align="end">
                        <Dropdown.Toggle
                            variant="secondary"
                            size="sm"
                            className="btn btn-icon bg-body"
                            aria-label="More actions"
                        >
                            <i className="ri-more-2-fill fs-lg"></i>
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="fs-xs p-2" style={{ minWidth: "auto" }}>
                            <Dropdown.Item onClick={toggleFavorite}>
                                <i className="ri-heart-line fs-sm ms-n1 me-2"></i>
                                {isFavorite ? "Favorilerden Çıkar" : "Favorilere Ekle"}
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
                <Link
                    className="d-block rounded-top overflow-hidden p-3 p-sm-4"
                    href="/category-details/page"
                >
                    <span
                        className="position-absolute top-0 start-0 mt-2 ms-2 mt-lg-3 ms-lg-3"
                        style={{ zIndex: 1 }}
                    >
                        <Image
                            src="/assets/img/icons/new-icon-four-season.svg"
                            alt="Ürün Adı"
                        />
                    </span>
                    <div>
                        <Image src="/assets/img/shop/pirelli.jpg" alt="Ürün Adı" />
                    </div>
                </Link>
            </div>
            <div className="w-100 min-w-0 px-1 pb-2 px-sm-3 pb-sm-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                    <Rating
                        name="product-rating"
                        value={value}
                        precision={0.5}
                        size="small"
                        onChange={(event, newValue) => {
                            setValue(newValue);
                        }}
                    />
                    <span className="text-body-tertiary fs-xs">({value})</span>
                </div>
                <h3 className="pb-1 mb-2">
                    <Link
                        className="d-block fs-sm fw-medium text-truncate"
                        href="/product/page"
                    >
                        <span className="animate-target">
                            Michelin Primacy 1+ 205/55R16 91V
                        </span>
                    </Link>
                </h3>
                <div className="d-flex align-items-center justify-content-between">
                    <div className="h5 lh-1 mb-0">
                        3.350 TL{" "}
                        <del className="text-body-tertiary fs-sm fw-normal">5.300 TL</del>
                    </div>
                    <Tooltip title="Sepete Ekle">
                        <button
                            type="button"
                            className="product-card-button btn btn-icon btn-primary animate-slide-end ms-2 rounded-2"
                            aria-label="Sepete Ekle"
                        >
                            <i className="ri-shopping-cart-2-line fs-base animate-target"></i>
                        </button>
                    </Tooltip>

                </div>
            </div>
            <div className="product-card-details position-absolute top-100 start-0 w-100 bg-body rounded-bottom shadow mt-n2 p-3 pt-1">
                <span className="position-absolute top-0 start-0 w-100 bg-body mt-n2 py-2"></span>
                <ul className="list-unstyled d-flex flex-column gap-2 m-0">
                    <li className="d-flex align-items-center">
                        <span className="fs-xs">Ebat:</span>
                        <span className="d-block flex-grow-1 border-bottom border-dashed px-1 mt-2 mx-2"></span>
                        <span className="text-dark-emphasis fs-xs fw-medium text-end">
                            205/55R16
                        </span>
                    </li>
                    <li className="d-flex align-items-center">
                        <span className="fs-xs">Yük Endeksi:</span>
                        <span className="d-block flex-grow-1 border-bottom border-dashed px-1 mt-2 mx-2"></span>
                        <span className="text-dark-emphasis fs-xs fw-medium text-end">
                            91 (615 kg)
                        </span>
                    </li>
                    <li className="d-flex align-items-center">
                        <span className="fs-xs">Hız Endeksi:</span>
                        <span className="d-block flex-grow-1 border-bottom border-dashed px-1 mt-2 mx-2"></span>
                        <span className="text-dark-emphasis fs-xs fw-medium text-end">
                            V (240 km/s)
                        </span>
                    </li>
                    <li className="d-flex align-items-center">
                        <span className="fs-xs">Üretim Tarihi:</span>
                        <span className="d-block flex-grow-1 border-bottom border-dashed px-1 mt-2 mx-2"></span>
                        <span className="text-dark-emphasis fs-xs fw-medium text-end">
                            2024
                        </span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
