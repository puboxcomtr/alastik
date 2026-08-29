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

const defaultImage = '/lastikjantavm/assets/img/blog/continental-lastik.jpg';
const EXCERPT_MAX_LENGTH = 90;

const truncate = (text: string, maxLength: number): string => {
  const clean = text.trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:]+$/, '')}...`;
};

type BlogItemProps = {
  blog: Blog;
  imageMaxWidth: string;
}

const BlogItem = ({ blog, imageMaxWidth }: BlogItemProps) => (
  <div className="position-relative d-flex align-items-start align-items-sm-center mb-3">
    <div
      style={{
        ["--cz-aspect-ratio" as any]: "calc(140 / 196 * 100%)",
        maxWidth: imageMaxWidth,
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
      {blog.excerpt && (
        <p className="fs-sm text-body-secondary mb-2 mb-xl-3">
          {truncate(blog.excerpt, EXCERPT_MAX_LENGTH)}
        </p>
      )}
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
);

export default function BlogSection({ blogs }: Props) {
  if (!blogs || blogs.length === 0) return null;

  const featuredBlogs = blogs.slice(0, 2);
  const sideBlogs = blogs.slice(2, 5);

  return (
    <Row className="align-items-center">
      <Col lg={5} className="mb-4 mb-lg-0 pe-lg-4 pe-xl-5 lja-blog-divider">
        <div className="d-flex flex-column gap-1 gap-md-2">
          {sideBlogs.map((blog) => (
            <BlogItem key={blog._id} blog={blog} imageMaxWidth="196px" />
          ))}
        </div>
      </Col>
      <Col lg={7} className="ps-lg-4 ps-xl-5">
        <div className="d-flex flex-column gap-1 gap-md-2">
          {featuredBlogs.map((blog) => (
            <BlogItem key={blog._id} blog={blog} imageMaxWidth="286px" />
          ))}
        </div>
      </Col>
    </Row>
  );
}
