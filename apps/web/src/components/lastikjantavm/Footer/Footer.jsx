'use client';
import React from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import FooterTop from "@components/lastikjantavm/Footer/Top/Main";
import FooterBottom from "@components/lastikjantavm/Footer/Bottom/Main";
import HiddenFooterLink from "@components/shared/HiddenFooterLink";

export default function Footer() {
    return (
        <>
            <FooterTop />
            <FooterBottom />
            <HiddenFooterLink />
        </>
    );
}