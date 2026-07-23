'use client';

import React, { useEffect, useState } from 'react';
import { Container, Row } from 'react-bootstrap';
import { API_ENDPOINTS } from '@/src/config/api';

import Title from '@components/alastik/homepage/Blog/Title';
import Content from '@components/alastik/homepage/Blog/Content';

export default function HomeBlog() {
    const [blogs, setBlogs] = useState<any[]>([]);

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                const res = await fetch(API_ENDPOINTS.blogs.homepage());
                const result = await res.json();
                if (result.success && result.data) {
                    setBlogs(result.data);
                }
            } catch (error) {
                console.error('Blog yüklenemedi:', error);
            }
        };
        fetchBlogs();
    }, []);

    if (blogs.length === 0) return null;

    return (
        <Container>
            <Row className="row-fluid">
                <Title />
            </Row>
            <Row className="row-fluid pt-4">
                <Content blogs={blogs} />
            </Row>
        </Container>
    );
}