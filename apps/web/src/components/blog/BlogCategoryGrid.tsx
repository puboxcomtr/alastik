import Link from 'next/link';
import { Container, Row, Col } from 'react-bootstrap';
import { getImageUrl } from '@/src/config/api';

type BlogItem = {
    _id: string;
    title: string;
    slug: string;
    excerpt?: string;
    publishedAt?: string;
    featuredImage?: string;
};

type CardImageRatio = 'square' | 'portrait' | 'landscape';

type CategoryInfo = {
    name: string;
    slug: string;
    description?: string;
    cardImageRatio?: CardImageRatio;
};

const CARD_IMAGE_ASPECT: Record<CardImageRatio, string> = {
    square: '1 / 1',
    portrait: '2 / 3',
    landscape: '16 / 9',
};

const defaultImage = '/alastik/assets/img/blog/continental-lastik.jpg';

function formatDate(d?: string): string {
    if (!d) return '';
    try {
        return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return '';
    }
}

export default function BlogCategoryGrid({ category, blogs }: { category: CategoryInfo; blogs: BlogItem[] }) {
    const imageAspect = CARD_IMAGE_ASPECT[category.cardImageRatio ?? 'square'] ?? CARD_IMAGE_ASPECT.square;

    return (
        <Container className="pt-2 pt-lg-3 pb-4 pb-lg-5">
          <div className="row-fluid">
            <Row>
                <Col lg={12}>
                    <nav aria-label="breadcrumb" className="mb-2">
                        <ol className="breadcrumb mb-0">
                            <li className="breadcrumb-item">
                                <Link href="/" className="text-decoration-none text-body-secondary">Ana Sayfa</Link>
                            </li>
                            <li className="breadcrumb-item active" aria-current="page">{category.name}</li>
                        </ol>
                    </nav>

                    <h1 className="h3 fw-bold mb-1">{category.name}</h1>
                    {category.description && (
                        <p className="text-body-secondary mb-2">{category.description}</p>
                    )}
                </Col>
            </Row>

            {blogs.length === 0 ? (
                <div className="text-center py-5">
                    <p className="text-body-secondary mb-0">Bu kategoride henüz içerik bulunmuyor.</p>
                </div>
            ) : (
                <Row className="g-4 mt-1">
                    {blogs.map((blog) => (
                        <Col key={blog._id} xs={12} sm={6} lg={3}>
                            <div className="blog-cat-card d-flex flex-column h-100">
                                <Link href={`/blog/${blog.slug}`} className="d-block rounded-3 overflow-hidden mb-3">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={blog.featuredImage ? getImageUrl(blog.featuredImage) : defaultImage}
                                        alt={blog.title}
                                        className="w-100"
                                        style={{ aspectRatio: imageAspect, objectFit: 'cover' }}
                                        loading="lazy"
                                    />
                                </Link>
                                <h2 className="fs-6 fw-semibold mb-2 lh-sm">
                                    <Link href={`/blog/${blog.slug}`} className="text-decoration-none text-body">
                                        {blog.title}
                                    </Link>
                                </h2>
                                {blog.publishedAt && (
                                    <p className="fs-sm text-body-secondary mb-3">
                                        Yayın Tarihi: <span className="fw-semibold text-body">{formatDate(blog.publishedAt)}</span>
                                    </p>
                                )}
                                <Link
                                    href={`/blog/${blog.slug}`}
                                    className="btn btn-dark w-100 mt-auto rounded-2"
                                >
                                    Şimdi Keşfet
                                </Link>
                            </div>
                        </Col>
                    ))}
                </Row>
            )}
          </div>
        </Container>
    );
}
