import React from 'react';

interface AdressProps {
    company: any;
    emailInfo: any;
    loading: boolean;
}

export default function Adress({ company, emailInfo, loading }: AdressProps) {
    if (loading) {
        return <p className="text-muted small">Yükleniyor...</p>;
    }

    return (
        <section className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-4 pt-5 pb-3 pb-md-4 pb-lg-3">
            <div className="col text-center pt-1 pt-sm-2 pt-md-3">
                <div className="position-relative d-inline-block bg-body-tertiary text-dark-emphasis fs-xl rounded-circle p-4 mb-3">
                    <i className="ri-phone-line position-absolute top-50 start-50 translate-middle"></i>
                </div>
                <h3 className="h6">Bizi Arayın</h3>
                <ul className="list-unstyled m-0">
                    {company?.phone2 && (
                        <li className="nav animate-underline justify-content-center">
                            <a className="nav-link animate-target fs-base ms-1 p-0" href={`tel:${company.phone2.replace(/\s/g, '')}`}>
                                {company.phone2}
                            </a>
                        </li>
                    )}
                    {company?.phone && (
                        <li className="nav animate-underline justify-content-center">
                            <a className="nav-link animate-target fs-base ms-1 p-0" href={`https://wa.me/9${company.phone.replace(/\s/g, '').replace(/^0/, '')}`}>
                                {company.phone}
                            </a>
                        </li>
                    )}
                </ul>
            </div>

            <div className="col text-center pt-1 pt-sm-2 pt-md-3">
                <div className="position-relative d-inline-block bg-body-tertiary text-dark-emphasis fs-xl rounded-circle p-4 mb-3">
                    <i className="ri-mail-line position-absolute top-50 start-50 translate-middle"></i>
                </div>
                <h3 className="h6">E-posta Gönderin</h3>
                <ul className="list-unstyled m-0">
                    {emailInfo?.email && (
                        <li className="nav animate-underline justify-content-center">
                            <a className="nav-link animate-target fs-base ms-1 p-0" href={`mailto:${emailInfo.email}`}>
                                {emailInfo.email}
                            </a>
                        </li>
                    )}
                    {emailInfo?.orderEmail && (
                        <li className="nav animate-underline justify-content-center">
                            <a className="nav-link animate-target fs-base ms-1 p-0" href={`mailto:${emailInfo.orderEmail}`}>
                                {emailInfo.orderEmail}
                            </a>
                        </li>
                    )}
                </ul>
            </div>

            <div className="col text-center pt-1 pt-sm-2 pt-md-3">
                <div className="position-relative d-inline-block bg-body-tertiary text-dark-emphasis fs-xl rounded-circle p-4 mb-3">
                    <i className="ri-map-pin-line position-absolute top-50 start-50 translate-middle"></i>
                </div>
                <h3 className="h6">Adres</h3>
                <ul className="list-unstyled m-0">
                    {company?.city && (
                        <li>{company.district && `${company.district}, `}{company.city}</li>
                    )}
                    {company?.address && company.address !== '-' && (
                        <li>{company.address}</li>
                    )}
                </ul>
            </div>

            <div className="col text-center pt-1 pt-sm-2 pt-md-3">
                <div className="position-relative d-inline-block bg-body-tertiary text-dark-emphasis fs-xl rounded-circle p-4 mb-3">
                    <i className="ri-time-line position-absolute top-50 start-50 translate-middle"></i>
                </div>
                <h3 className="h6">Çalışma Saatleri</h3>
                <ul className="list-unstyled m-0">
                    <li>Pzt - Cum: 09:00 - 18:00</li>
                    <li>Cumartesi: 09:00 - 14:00</li>
                </ul>
            </div>
        </section>
    );
}