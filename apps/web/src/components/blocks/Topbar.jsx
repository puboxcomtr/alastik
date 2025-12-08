'use client';

import { Container, Row } from "react-bootstrap";

export default function Topbar({ data }) {
    if (!data) return null;

    return (
        <Container fluid className="position-relative rounded-0">
            <Row className="row-fluid">
                <div dangerouslySetInnerHTML={{ __html: data }} />
            </Row>
        </Container>
    );
}