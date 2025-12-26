'use client';

import { useState, useEffect } from 'react';

const menuItems = [
    { id: 'description', label: 'Ürün Açıklaması' },
    { id: 'manufacturer', label: 'Manufacturer information' },
    { id: 'eu-label', label: 'EU tyre label' },
    { id: 'reviews', label: 'Customer reviews' },
    { id: 'insurance', label: 'Tyre insurance' },
    { id: 'safety', label: 'Product Safety' },
    { id: 'compatible', label: 'Compatible items' }
];

export default function ProductDescription() {
    const [activeSection, setActiveSection] = useState('description');

    useEffect(() => {
        const observers = menuItems.map((item) => {
            const element = document.getElementById(item.id);
            if (!element) return null;

            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setActiveSection(item.id);
                    }
                },
                { threshold: 0.3, rootMargin: '-20% 0px -50% 0px' }
            );

            observer.observe(element);
            return observer;
        });

        return () => {
            observers.forEach((observer) => observer?.disconnect());
        };
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="container mx-auto py-8">
            <div className="row">
                <div className="col-md-3">
                    <div className="sticky top-24">
                        <div className="flex flex-col space-y-2">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => scrollToSection(item.id)}
                                    className=""
                                >
                                    {activeSection === item.id && (
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-red-600 font-bold">
                                            ›
                                        </span>
                                    )}
                                    <span className={activeSection === item.id ? 'ml-4' : ''}>
                                        {item.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-md-9">
                    <section id="description" className="mb-12 min-h-[400px]">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Description
                        </h2>
                        <div className="text-gray-700">
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                            <p>DescriptionDescriptionDescriptionDescriptionDescriptionDescription</p>
                        </div>
                    </section>

                    <section id="manufacturer" className="mb-12 min-h-[400px]">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Manufacturer information
                        </h2>
                        <div className="text-gray-700">
                            {/* İçerik buraya gelecek */}
                        </div>
                    </section>

                    <section id="eu-label" className="mb-12 min-h-[400px]">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            EU tyre label
                        </h2>
                        <div className="text-gray-700">
                            {/* İçerik buraya gelecek */}
                        </div>
                    </section>

                    <section id="reviews" className="mb-12 min-h-[400px]">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Customer reviews
                        </h2>
                        <div className="text-gray-700">
                            {/* İçerik buraya gelecek */}
                        </div>
                    </section>

                    <section id="insurance" className="mb-12 min-h-[400px]">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Tyre insurance
                        </h2>
                        <div className="text-gray-700">
                            {/* İçerik buraya gelecek */}
                        </div>
                    </section>

                    <section id="safety" className="mb-12 min-h-[400px]">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Product Safety
                        </h2>
                        <div className="text-gray-700">
                            {/* İçerik buraya gelecek */}
                        </div>
                    </section>

                    <section id="compatible" className="mb-12 min-h-[400px]">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Compatible items
                        </h2>
                        <div className="text-gray-700">
                            {/* İçerik buraya gelecek */}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}