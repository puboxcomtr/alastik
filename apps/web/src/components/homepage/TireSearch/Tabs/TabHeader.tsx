
import React, { useRef } from 'react';
import Link from 'next/link';

export default function TabHeader() {
    return (
        <div className="search_tabheader">
            <span className="search_icon">
                <i className="ri-car-line"></i>
                Araç Lastiği
            </span>
            <Link className="d-none d-md-flex d-lg-flex" href="/category">
                <span className="search_icon">
                    <i className="ri-steering-2-fill"></i>
                    Jant
                </span>
            </Link>
            <Link className="d-none d-md-flex d-lg-flex" href="/category">
                <span className="search_icon">
                    <i className="ri-snowflake-line"></i>
                    Kar Paleti ve Zincir
                </span>
            </Link>
            <Link className="d-none d-md-flex d-lg-flex" href="/category">
                <span className="search_icon">
                    <i className="ri-box-3-fill"></i>
                    Set Lastikler
                </span>
            </Link>
        </div>
    );
}
