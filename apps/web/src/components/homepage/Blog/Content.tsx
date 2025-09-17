'use client';

import React from "react";
import { Row, Col } from "react-bootstrap";
import Link from "next/link";

export default function BlogSection() {
  return (
    <Row>
      <Col lg={5} className="mb-4 mb-lg-0">
        <div className="d-flex flex-column gap-1 gap-md-2">
          {[...Array(3)].map((_, i) => (
            <div
              className="position-relative d-flex align-items-start align-items-sm-center mb-4"
              key={i}
            >
              <div
                style={{
                  ["--cz-aspect-ratio" as any]: "calc(140 / 196 * 100%)",
                  maxWidth: "196px",
                } as React.CSSProperties}
              >
                <img
                  src={`/assets/img/blog/${
                    i % 2 === 0
                      ? "continental-lastik-test-araci-2.jpg"
                      : "continental-lastik.jpg"
                  }`}
                  className="rounded"
                  alt="Continental Lastik"
                />
              </div>
              <div className="ps-3 ps-xl-4">
                <span className="badge bg-body-secondary text-body-emphasis rounded-pill mb-3">
                  Lastik Değerlendirmeleri
                </span>
                <h3 className="fs-base fw-medium lh-base mb-2 mb-xl-3">
                  <Link
                    href="#"
                    className="hover-effect-underline stretched-link"
                  >
                    Continental 'in Sürücüsüz Lastik Fren Test Aracı
                  </Link>
                </h3>
                <div className="d-flex gap-3 gap-xl-4 fs-sm text-body-secondary">
                  <div className="d-flex align-items-center text-nowrap">
                    <i className="ci-clock fs-base me-2"></i>
                    2 hafta önce
                  </div>
                  <div className="d-flex align-items-center text-nowrap">
                    <i className="ci-bookmark fs-base me-2"></i>
                    23 okunma
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Col>
      <Col lg={7}>
        <div className="border rounded-5 p-4">
          <div className="d-sm-flex align-items-start align-items-md-center align-items-lg-start align-items-xl-center p-md-2 p-lg-0 p-xl-2 p-xxl-3">
            <Link
              href="#"
              className="d-block w-100 mb-4 mb-sm-0"
              style={{ maxWidth: "286px" }}
            >
              <img
                src="/assets/img/blog/lastik-fiyatlari.jpg"
                className="rounded-4"
                alt="Book cover"
              />
            </Link>
            <div className="w-100 ps-sm-4 ms-md-2 ms-lg-0 ms-xl-2 ms-xxl-3">
              <span className="badge bg-body-secondary text-body-emphasis rounded-pill mb-3">
                Kategori Adı
              </span>
              <h3 className="h4 mb-2">Lastik Fiyatları Neden Hızla Artıyor?</h3>
              <p className="fs-sm pb-1 pb-xl-3">
                Lastik piyasasında 2020 de başlayan fiyat artışları 2021 yılında
                da devam ediyor. www.alastik.com olarak lastik e-ticaretinde son
                1 yıldır en çok karşılaştığımız...
              </p>
              <Link href="#" className="btn btn-dark rounded-pill">
                Devamını Oku
                <i className="ci-chevron-right fs-base ms-1 me-n1"></i>
              </Link>
            </div>
          </div>
        </div>
      </Col>
    </Row>
  );
}
