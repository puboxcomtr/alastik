'use client';

import React from "react";
import { Row, Col } from "react-bootstrap";
import Link from "next/link";
import { getImageUrl } from "@/src/config/api";
import { buildBlogUrl } from "@/src/config/routes";

type Blog = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  viewCount?: number;
  featuredImage?: string;
  tags?: string[];
}

type Props = {
  blogs: Blog[];
}

const getTimeAgo = (dateStr?: string): string => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return 'Bugün';
  if (diffDays < 7) return `${diffDays} gün önce`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} ay önce`;
  return `${Math.floor(diffDays / 365)} yıl önce`;
};

const defaultImage = '/assets/img/blog/continental-lastik.jpg';

export default function BlogSection({ blogs }: Props) {
  if (!blogs || blogs.length === 0) return null;

  const featured = blogs[0];
  const sideBlogs = blogs.slice(1, 4);

  return (
    <Row>
      <Col lg={5} className="mb-4 mb-lg-0">
        <div className="d-flex flex-column gap-1 gap-md-2">
          {sideBlogs.map((blog) => (
            <div
              className="position-relative d-flex align-items-start align-items-sm-center mb-4"
              key={blog._id}
            >
              <div
                style={{
                  ["--cz-aspect-ratio" as any]: "calc(140 / 196 * 100%)",
                  maxWidth: "196px",
                } as React.CSSProperties}
              >
                <img
                  src={blog.featuredImage ? getImageUrl(blog.featuredImage) : defaultImage}
                  className="rounded"
                  alt={blog.title}
                />
              </div>
              <div className="ps-3 ps-xl-4">
                {blog.tags && blog.tags[0] && (
                  <span className="badge bg-body-secondary text-body-emphasis rounded-pill mb-3">
                    {blog.tags[0]}
                  </span>
                )}
                <h3 className="fs-base fw-medium lh-base mb-2 mb-xl-3">
                  <Link
                    href={buildBlogUrl(blog.slug)}
                    className="hover-effect-underline stretched-link"
                  >
                    {blog.title}
                  </Link>
                </h3>
                <div className="d-flex gap-3 gap-xl-4 fs-sm text-body-secondary">
                  <div className="d-flex align-items-center text-nowrap">
                    <i className="ci-clock fs-base me-2"></i>
                    {getTimeAgo(blog.publishedAt)}
                  </div>
                  <div className="d-flex align-items-center text-nowrap">
                    <i className="ci-bookmark fs-base me-2"></i>
                    {blog.viewCount || 0} okunma
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
              href={buildBlogUrl(featured.slug)}
              className="d-block w-100 mb-4 mb-sm-0"
              style={{ maxWidth: "286px" }}
            >
              <img
                src={featured.featuredImage ? getImageUrl(featured.featuredImage) : defaultImage}
                className="rounded-4"
                alt={featured.title}
              />
            </Link>
            <div className="w-100 ps-sm-4 ms-md-2 ms-lg-0 ms-xl-2 ms-xxl-3">
              {featured.tags && featured.tags[0] && (
                <span className="badge bg-body-secondary text-body-emphasis rounded-pill mb-3">
                  {featured.tags[0]}
                </span>
              )}
              <h3 className="h4 mb-2">{featured.title}</h3>
              {featured.excerpt && (
                <p className="fs-sm pb-1 pb-xl-3">
                  {featured.excerpt}
                </p>
              )}
              <Link href={buildBlogUrl(featured.slug)} className="btn btn-dark rounded-pill">
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