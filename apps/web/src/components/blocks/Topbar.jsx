'use client';

import { Container, Row } from "react-bootstrap";

export default function Topbar({ data }) {
    if (!data) return null;

    return (
        <Container className="position-relative rounded-0 bg-light">
            <div className="row-fluid">
                <Row>
                    <div dangerouslySetInnerHTML={{ __html: data }} />
                </Row>
            </div>
        </Container>
    );
}