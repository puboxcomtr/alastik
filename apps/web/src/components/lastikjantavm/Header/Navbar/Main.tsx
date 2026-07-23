'use client';
import React from 'react';
import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';
import MainMenu from '@components/lastikjantavm/Header/Navbar/Partials/MainMenu';

export default function NavbarMain() {
    return (
        <Container className="bg-black navbar navbar-expand-lg d-none d-md-block p-0 main__menu">
            <div className="row-fluid w-100">
                <Navbar expand="lg" className="p-2 w-100">
                    <div className="collapse navbar-collapse p-2 w-100" id="stuckNav">
                        <MainMenu />
                    </div>
                </Navbar>
            </div>
        </Container>
    );
}