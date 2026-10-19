'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface Brand {
  slug: string;
  name: string;
  name_en: string;
  logo: string;
}

interface BrandSelectorProps {
  brands: Brand[];
  selectedBrand: string | null;
  onBrandSelect: (brand: Brand) => void;
  placeholder?: string;
}

export default function BrandSelector({ brands, selectedBrand, onBrandSelect, placeholder = "Marka Seçiniz" }: BrandSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.name_en.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedBrandData = brands.find(b => b.slug === selectedBrand);

  return (
    <div className="position-relative" ref={dropdownRef}>
      <div 
        className="form-select cursor-pointer d-flex align-items-center justify-content-between"
        onClick={() => setIsOpen(!isOpen)}
        style={{ minHeight: '48px', cursor: 'pointer' }}
      >
        {selectedBrandData ? (
          <div className="d-flex align-items-center">
            <Image 
              src={selectedBrandData.logo} 
              alt={selectedBrandData.name}
              width={24}
              height={24}
              className="me-2"
              style={{ objectFit: 'contain' }}
              onError={() => {
              }}
            />
            <span>{selectedBrandData.name}</span>
          </div>
        ) : (
          <span className="text-muted">{placeholder}</span>
        )}
        <i className={`ci-chevron-${isOpen ? 'up' : 'down'} ms-auto`}></i>
      </div>

      {isOpen && (
        <div 
          className="position-absolute w-100 bg-white border rounded-bottom shadow-lg"
          style={{ 
            top: '100%', 
            left: 0, 
            maxHeight: '400px', 
            overflowY: 'auto',
            zIndex: 1050 
          }}
        >
          <div className="p-2 border-bottom sticky-top bg-white">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Marka ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="p-1">
            {filteredBrands.length > 0 ? (
              filteredBrands.map((brand) => (
                <div
                  key={brand.slug}
                  className="d-flex align-items-center p-2 rounded hover-bg-light cursor-pointer"
                  onClick={() => {
                    onBrandSelect(brand);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Image 
                    src={brand.logo} 
                    alt={brand.name}
                    width={64}
                    height={32}
                    className="me-3"
                    style={{ 
                      objectFit: 'contain',
                      backgroundColor: '#f8f9fa',
                      padding: '4px',
                      borderRadius: '4px'
                    }}
                    onError={() => {
                    }}
                  />
                  <div>
                    <div className="fw-medium">{brand.name}</div>
                    {brand.name !== brand.name_en && (
                      <small className="text-muted">{brand.name_en}</small>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted p-3">
                Marka bulunamadı
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 