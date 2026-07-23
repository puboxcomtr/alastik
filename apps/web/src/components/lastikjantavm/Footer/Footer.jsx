'use client';
import React from 'react';

// Bootstrap
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

// Components
import FooterTop from "@components/lastikjantavm/Footer/Top/Main";
import FooterBottom from "@components/lastikjantavm/Footer/Bottom/Main";

export default function Footer() {
    return (
        <>
            <FooterTop />
            <FooterBottom />
        </>
    );
}