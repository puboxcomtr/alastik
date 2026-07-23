'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface LazyImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export default function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  style = {},
  placeholder = '/alastik/assets/img/shop/tire-placeholder.jpg',
  priority = false,
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const isValidUrl = (url: string) => {
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
  };

  const validSrc = isValidUrl(src) ? src : placeholder;
  const finalSrc = hasError ? placeholder : validSrc;

  return (
    <div 
      ref={imgRef}
      className={className}
      style={{ width, height, position: 'relative', backgroundColor: '#f8f9fa', ...style }}
    >
      {!isInView && (
        <div className="d-flex align-items-center justify-content-center h-100" style={{ color: '#dee2e6' }}>
          <i className="fas fa-image fa-2x"></i>
        </div>
      )}

      {isInView && (
        <Image
          src={finalSrc}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          style={{ objectFit: 'cover', width: '100%', height: '100%', opacity: isLoaded ? 1 : 0.5 }}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
        />
      )}
    </div>
  );
}