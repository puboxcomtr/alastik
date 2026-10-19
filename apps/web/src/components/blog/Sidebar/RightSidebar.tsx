'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Offcanvas } from 'react-bootstrap';
import { API_ENDPOINTS } from '@/src/config/api';

type MenuItemType = {
  _id: string;
  name: string;
  menuType: 'link' | 'category' | 'page' | 'blog' | 'product' | 'tag' | 'brand' | 'heading';
  linkData?: {
    url?: string;
    categoryUrl?: string; categoryId?: string;
    pageUrl?: string; pageId?: string;
    blogUrl?: string; blogId?: string;
    productUrl?: string; productId?: string;
    tagUrl?: string; tagId?: string;
    brandUrl?: string; brandId?: string;
  };
  openNewTab?: boolean;
};

type MenuGroupType = { _id: string; name: string; items: MenuItemType[] };

function itemUrl(item: MenuItemType): string {
  if (item.menuType === 'link') return item.linkData?.url || '#';
  if (item.menuType === 'category') return `/kategori/${item.linkData?.categoryUrl || item.linkData?.categoryId}`;
  if (item.menuType === 'page') return `/sayfa/${item.linkData?.pageUrl || item.linkData?.pageId}`;
  if (item.menuType === 'blog') return `/blog/${item.linkData?.blogUrl || item.linkData?.blogId}`;
  if (item.menuType === 'product') return `/urun/${item.linkData?.productUrl || item.linkData?.productId}`;
  if (item.menuType === 'tag') return `/etiket/${item.linkData?.tagUrl || item.linkData?.tagId}`;
  if (item.menuType === 'brand') return `/marka/${item.linkData?.brandUrl || item.linkData?.brandId}`;

  return '#';
}

function MenuGroups({ groups }: { groups: MenuGroupType[] }) {
  if (!groups.length) return null;

  return (
    <>
      {groups.map((group) => (
        <div key={group._id} className="bg-white rounded p-3 pt-0 mb-3">
          <h6 className="fw-bold pb-2 border-bottom">{group.name}</h6>
          <ul className="list-unstyled mb-0">
            {group.items.map((item) => (
              <li key={item._id} className="mb-2">
                <Link
                  href={itemUrl(item)}
                  target={item.openNewTab ? '_blank' : undefined}
                  className="text-decoration-none text-dark d-flex align-items-center gap-2"
                  style={{ fontSize: '0.9rem' }}
                >
                  <i className="ri-arrow-right-s-line" style={{ fontSize: '0.75rem' }}></i>
                  <span className="animate-underline animate-target">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function SidebarContent({ groups }: { groups: MenuGroupType[] }) {
  return <MenuGroups groups={groups} />;
}

export default function Sidebar() {
  const [show, setShow] = useState(false);
  const [groups, setGroups] = useState<MenuGroupType[]>([]);

  useEffect(() => {
    let iptal = false;

    fetch(API_ENDPOINTS.menus.area('blog'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!iptal && data?.success) setGroups(data.data || []);
      })
      .catch(() => {  });

    return () => { iptal = true; };
  }, []);

  if (groups.length === 0) return null;

  return (
    <>
      <div className="d-lg-none my-3">
        <button
          className="btn btn-outline-dark btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
          onClick={() => setShow(true)}
        >
          <i className="ri-menu-2-line"></i>
          {groups.length === 1 ? groups[0].name : 'Menü'}
        </button>
      </div>

      <Offcanvas show={show} onHide={() => setShow(false)} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>{groups.length === 1 ? groups[0].name : 'Menü'}</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <SidebarContent groups={groups} />
        </Offcanvas.Body>
      </Offcanvas>

      <div className="d-none d-lg-block">
        <SidebarContent groups={groups} />
      </div>
    </>
  );
}