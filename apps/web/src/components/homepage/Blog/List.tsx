import React from 'react';
import Link from 'next/link'

/* Components */
import { Container, Row, Col } from 'react-bootstrap';

/* Library */
import Title from '@components/homepage/Blog/Title'
import Content from '@components/homepage/Blog/Content'

export default function HomeBlog() {
    return (
        <Container>
            <Row className="row-fluid">
                <Title />
            </Row>
            <Row className="row-fluid pt-4">
                <Content />               
            </Row>
        </Container>
    );
}