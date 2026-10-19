'use client';

import React, { useState } from 'react';
import { toast } from 'react-toastify';
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

    const handleSubmit = async (): Promise<void> => {
        if (!formData.name || !formData.email || !formData.message) return;
        setSending(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Mesajınız iletildi');
                setFormData({ name: '', surname: '', email: '', phone: '', subject: '', message: '' });
            } else {
                toast.error(data.message || 'Bir hata oluştu');
            }
        } catch {
            toast.error('Bağlantı hatası');
        } finally {
            setSending(false);
        }
    };

    return (
        <>
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
            <section id="breadcumb">
                <Container>
                    <div className='row-fluid'>
                        <Row>
                            <Col lg={12}>
                                <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3007.6651501938386!2d28.99315467642768!3d41.07631151523231!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14cab7a65d413159%3A0xd315e651e897ac47!2sA%20Lastik!5e0!3m2!1str!2str!4v1782396532939!5m2!1str!2str" width="100%" height="450" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin"></iframe>
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