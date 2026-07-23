'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col } from "react-bootstrap";

import TireProductSlider from '@components/lastikjantavm/homepage/TireSearch/TireProductSlider';
import TabHeader from '@components/lastikjantavm/homepage/TireSearch/Tabs/TabHeader';
import TabContent from '@components/lastikjantavm/homepage/TireSearch/Tabs/TabContent';
import RimTabContent from '@components/lastikjantavm/homepage/TireSearch/Tabs/RimTabContent';
import ChainTabContent from '@components/lastikjantavm/homepage/TireSearch/Tabs/ChainTabContent';

import { useTireSearch } from "@src/hooks/WheelSize/useTireSearch";
import { useRimSearch } from "@src/hooks/WheelSize/useRimSearch";
import { useChainSearch } from "@src/hooks/WheelSize/useChainSearch";

export default function MainTireSearch() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'tire' | 'rim' | 'chain'>('tire');

  const {
    mevsim, setMevsim, genislikler, yanakOranlari, jantCaplari,
    selectedGenislik, setSelectedGenislik, selectedYukseklik, setSelectedYukseklik,
    selectedCap, setSelectedCap, handleJantaGoreArama,
  } = useTireSearch();

  const {
    jantCaplari: rimCaplari, bijonAraliklari,
    selectedCap: rimSelectedCap, setSelectedCap: setRimSelectedCap,
    selectedBijon, setSelectedBijon, handleJantArama,
  } = useRimSearch();

  const {
    genislikler: chainGenislikler, yanakOranlari: chainYanakOranlari, jantCaplari: chainJantCaplari,
    selectedGenislik: chainSelectedGenislik, setSelectedGenislik: setChainSelectedGenislik,
    selectedYukseklik: chainSelectedYukseklik, setSelectedYukseklik: setChainSelectedYukseklik,
    selectedCap: chainSelectedCap, setSelectedCap: setChainSelectedCap, handleKarPaletiArama,
  } = useChainSearch();

  return (
    <>
      <section id="main_tire_search" className="container position-relative">
        <Container>
          <div className="row-fluid">
            <Row>
              <Col md={9}>
                <div className="search_box">
                  <TabHeader activeTab={activeTab} setActiveTab={setActiveTab} />

                  {activeTab === 'tire' && (
                    <TabContent
                      mevsim={mevsim} setMevsim={setMevsim}
                      selectedGenislik={selectedGenislik} setSelectedGenislik={setSelectedGenislik}
                      selectedYukseklik={selectedYukseklik} setSelectedYukseklik={setSelectedYukseklik}
                      selectedCap={selectedCap} setSelectedCap={setSelectedCap}
                      genislikler={genislikler} yanakOranlari={yanakOranlari} jantCaplari={jantCaplari}
                      handleJantaGoreArama={handleJantaGoreArama}
                    />
                  )}

                  {activeTab === 'rim' && (
                    <RimTabContent
                      selectedCap={rimSelectedCap} setSelectedCap={setRimSelectedCap}
                      selectedBijon={selectedBijon} setSelectedBijon={setSelectedBijon}
                      jantCaplari={rimCaplari} bijonAraliklari={bijonAraliklari}
                      handleJantArama={handleJantArama}
                    />
                  )}

                  {activeTab === 'chain' && (
                    <ChainTabContent
                      selectedGenislik={chainSelectedGenislik} setSelectedGenislik={setChainSelectedGenislik}
                      selectedYukseklik={chainSelectedYukseklik} setSelectedYukseklik={setChainSelectedYukseklik}
                      selectedCap={chainSelectedCap} setSelectedCap={setChainSelectedCap}
                      genislikler={chainGenislikler} yanakOranlari={chainYanakOranlari} jantCaplari={chainJantCaplari}
                      handleKarPaletiArama={handleKarPaletiArama}
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
      </section>
    </>
  );
}
