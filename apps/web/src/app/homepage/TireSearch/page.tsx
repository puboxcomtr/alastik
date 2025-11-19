'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col } from "react-bootstrap";

// Component
import TireProductSlider from '@components/homepage/TireSearch/TireProductSlider';
import TabHeader from '@components/homepage/TireSearch/Tabs/TabHeader';
import TabContent from '@components/homepage/TireSearch/Tabs/TabContent';

/* Hooks */
import { useTireSearch } from "@src/hooks/WheelSize/useTireSearch";


export default function MainTireSearch() {
  const router = useRouter();
  const {
    mevsim,
    setMevsim,
    genislikler,
    yanakOranlari,
    jantCaplari,
    selectedGenislik,
    setSelectedGenislik,
    selectedYukseklik,
    setSelectedYukseklik,
    selectedCap,
    setSelectedCap,
    handleJantaGoreArama,
    handleAracaGoreArama,
  } = useTireSearch();
  return (
    <>
      <section id="main_tire_search" className="container position-relative p-0 pb-5">
        <div className="w-100 h-100 position-absolute top-3">
          <Container className="container">
            <div className="row-fluid">
              <Row className="row">
                <Col md={9}>
                  <div className="search_box">
                    <TabHeader />
                    <TabContent
                      mevsim={mevsim}
                      setMevsim={setMevsim}
                      selectedGenislik={selectedGenislik}
                      setSelectedGenislik={setSelectedGenislik}
                      selectedYukseklik={selectedYukseklik}
                      setSelectedYukseklik={setSelectedYukseklik}
                      selectedCap={selectedCap}
                      setSelectedCap={setSelectedCap}
                      genislikler={genislikler}
                      yanakOranlari={yanakOranlari}
                      jantCaplari={jantCaplari}
                      handleJantaGoreArama={handleJantaGoreArama}
                    />
                  </div>
                </Col>
                <Col md={3}>
                  {/* <TireProductSlider /> */}
                </Col>
              </Row>
            </div>
          </Container>
        </div>
      </section>
    </>
  );
}
