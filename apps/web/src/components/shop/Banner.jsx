import React from 'react';
import Link from 'next/link'

export default function Banner() {
    return (
        <>
            <section className="py-3 py-md-5">
                <div className="container">
                    <div className="row-fluid">
                        <div className="row">
                            <div className="col-md-6 pe-2">
                                <img
                                    className="w-100 rounded mb-3"
                                    src="/assets/img/slider/banner-3.png"
                                    alt="Banner Adı - Site Adı"
                                />
                            </div>
                            <div className="col-md-6">
                                <img
                                    className="w-100 rounded mb-3"
                                    src="/assets/img/slider/banner-4.png"
                                    alt="Banner Adı - Site Adı"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}