'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col } from "react-bootstrap";

// Component
import TireProductSlider from '@components/homepage/TireSearch/TireProductSlider';
import TabHeader from '@components/homepage/TireSearch/Tabs/TabHeader';
import TabContent from '@components/homepage/TireSearch/Tabs/TabContent';
import RimTabContent from '@components/homepage/TireSearch/Tabs/RimTabContent';

/* Hooks */
import { useTireSearch } from "@src/hooks/WheelSize/useTireSearch";
import { useRimSearch } from "@src/hooks/WheelSize/useRimSearch";


export default function MainTireSearch() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'tire' | 'rim'>('tire');

  // Lastik hook
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
  } = useTireSearch();

  // Jant hook
  const {
    jantCaplari: rimCaplari,
    bijonAraliklari,
    selectedCap: rimSelectedCap,
    setSelectedCap: setRimSelectedCap,
    selectedBijon,
    setSelectedBijon,
    handleJantArama,
  } = useRimSearch();

  return (
    <>
      <section id="main_tire_search" className="container position-relative p-0 pb-5">
        <div className="w-100 h-100 position-absolute top-3">
          <Container className="container">
            <div className="row-fluid">
              <Row className="row">
                <Col md={9}>
                  <div className="search_box">
                    <TabHeader activeTab={activeTab} setActiveTab={setActiveTab} />

                    {activeTab === 'tire' && (
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
                    )}

                    {activeTab === 'rim' && (
                      <RimTabContent
                        selectedCap={rimSelectedCap}
                        setSelectedCap={setRimSelectedCap}
                        selectedBijon={selectedBijon}
                        setSelectedBijon={setSelectedBijon}
                        jantCaplari={rimCaplari}
                        bijonAraliklari={bijonAraliklari}
                        handleJantArama={handleJantArama}
                      />
                    )}
                  </div>
                </Col>
                <Col md={3}>
                  <TireProductSlider showcaseKey="first" />
                </Col>
              </Row>
            </div>
          </Container>
        </div>
      </section>
    </>
  );
}