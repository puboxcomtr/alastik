'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Offcanvas } from 'react-bootstrap';
import { ROUTES } from '@/src/config/routes';

const blogCategories = [
  { name: 'Lastik Testleri', slug: '#' },
  { name: 'Lastik Rehberi', slug: '#' },
  { name: 'Mevsimsel Bakım', slug: '#' },
  { name: 'Güvenli Sürüş', slug: '#' },
  { name: 'Araç Bakımı', slug: '#' },
];

const productCategories = [
  { name: 'Lastik Testleri', slug: '#' },
  { name: 'Lastik Rehberi', slug: '#' },
  { name: 'Mevsimsel Bakım', slug: '#' },
  { name: 'Güvenli Sürüş', slug: '#' },
  { name: 'Araç Bakımı', slug: '#' },
];

function SidebarContent() {
  return (
    <>
      {/* Blog Kategorileri */}
      <div className="bg-white rounded p-3 pt-0 mb-3">
        <h6 className="fw-bold pb-2 border-bottom">Blog Kategorileri</h6>
        <ul className="list-unstyled mb-0">
          {blogCategories.map((cat) => (
            <li key={cat.name} className="mb-2">
              <Link
                href={`${ROUTES.BLOG}?category=#`}
                className="text-decoration-none text-dark d-flex align-items-center gap-2"
                style={{ fontSize: '0.9rem' }}
              >
                <i className="ri-arrow-right-s-line" style={{ fontSize: '0.75rem' }}></i>
                <span className="animate-underline animate-target">{cat.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Ürün Kategorileri */}
      <div className="bg-white rounded p-3 pt-0 mb-3">
        <h6 className="fw-bold pb-2 border-bottom">Ürün Kategorileri</h6>
        <ul className="list-unstyled mb-0">
          {productCategories.map((cat) => (
            <li key={cat.name} className="mb-2">
              <Link
                href={`${ROUTES.BLOG}?category=#`}
                className="text-decoration-none text-dark d-flex align-items-center gap-2"
                style={{ fontSize: '0.9rem' }}
              >
                <i className="ri-arrow-right-s-line" style={{ fontSize: '0.75rem' }}></i>
                <span className="animate-underline animate-target">{cat.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Popüler İçerikler */}
      <div className="bg-white rounded p-3">
        <h6 className="fw-bold pb-2 border-bottom">Popüler İçerikler</h6>
        <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
          Yakında eklenecek...
        </p>
      </div>
    </>
  );
}

export default function Sidebar() {
  const [show, setShow] = useState(false);

  return (
    <>
      {/* Mobil Buton */}
      <div className="d-lg-none my-3">
        <button
          className="btn btn-outline-dark btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
          onClick={() => setShow(true)}
        >
          <i className="ri-menu-2-line"></i>
          Blog Kategorileri
        </button>
      </div>

      {/* Mobil Offcanvas */}
      <Offcanvas show={show} onHide={() => setShow(false)} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menü</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <SidebarContent />
        </Offcanvas.Body>
      </Offcanvas>

      {/* Desktop Sidebar */}
      <div className="d-none d-lg-block">
        <SidebarContent />
      </div>
    </>
  );
}