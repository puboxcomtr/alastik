'use client';

import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useDefinition } from '@/src/hooks/Theme/useDefinition';
import Breadcumb from './Content/Top/Breadcumb';
import ContactForm from './Content/Left/ContactForm';
import Adress from './Content/Right/Adress';

export default function Contact() {
    const { definition, loading } = useDefinition();
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });
    const [sending, setSending] = useState(false);

    const company = definition?.companyInfo;
    const emailInfo = definition?.emailInfo;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.email || !formData.message) return;
        setSending(true);
        setTimeout(() => {
            setSending(false);
            setFormData({ name: '', surname: '', email: '', phone: '', subject: '', message: '' });
        }, 1000);
    };

    return (
        <>
            {/* Breadcrumb */}
            <section id="breadcumb">
                <Container>
                    <div className='row-fluid'>
                        <Row>
                            <Col lg={12}>
                                <Breadcumb />
                            </Col>
                        </Row>
                    </div>
                </Container>
            </section>
            <section id="contact">
                <Container>
                    <div className='row-fluid'>
                        <Row>
                            <Col lg={12}>
                                <ContactForm formData={formData} sending={sending} handleChange={handleChange} handleSubmit={handleSubmit} />
                            </Col>
                            <Col lg={12}>
                                <Adress company={company} emailInfo={emailInfo} loading={loading} />
                            </Col>
                        </Row>
                    </div>
                </Container>
            </section>
        </>
    );
}