'use client';
import React from 'react';

import TireSearchModal from "@components/layout/Modals/TireSearch";

export default function Modal() {
    return (
        <>
            <div className="modal fade" id="tireSize" tabIndex={-1} aria-labelledby="tireSizeLabel" aria-hidden="true">
                <div className="modal-dialog modal-lg modal-dialog-scrollable">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="tireSizeLabel">Lastik Ebatımı Nasıl Öğrenebilirim?</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <div className="row">
                                <div className="col-md-6">
                                    <h6>Lastik Yan Duvarından Okuma</h6>
                                    <p>Lastik ebatı genellikle lastik yan duvarında yazmaktadır. Örnek: 205/55R16</p>
                                    <ul>
                                        <li><strong>205</strong> - Lastik genişliği (mm)</li>
                                        <li><strong>55</strong> - Yükseklik oranı (%)</li>
                                        <li><strong>R</strong> - Radyal yapı</li>
                                        <li><strong>16</strong> - Jant çapı (inç)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </>
    );
}