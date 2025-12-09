import React from 'react';
interface TabHeaderProps {
    activeTab: 'tire' | 'rim';
    setActiveTab: (tab: 'tire' | 'rim') => void;
}

export default function TabHeader({ activeTab, setActiveTab }: TabHeaderProps) {
    const activeStyle = {
        backgroundColor: 'var(--cz-primary)',
        color: '#fff',
    };

    return (
        <div className="search_tabheader">
            <span
                className="search_icon"
                onClick={() => setActiveTab('tire')}
                style={{ cursor: 'pointer', ...(activeTab === 'tire' ? activeStyle : {}) }}
            >
                <i className="ri-car-line"></i>
                Araç Lastiği
            </span>
            <span
                className="search_icon"
                onClick={() => setActiveTab('rim')}
                style={{ cursor: 'pointer', ...(activeTab === 'rim' ? activeStyle : {}) }}
            >
                <i className="ri-steering-2-fill"></i>
                Jant
            </span>
            <a className="d-none d-md-flex d-lg-flex search_icon" href="/kategori/kar-zinciri">
                <i className="ri-snowflake-line"></i>
                Kar Paleti ve Zincir
            </a>
            <a className="d-none d-md-flex d-lg-flex search_icon" href="/kategori/set-lastikler">
                <i className="ri-box-3-fill"></i>
                Set Lastikler
            </a>
        </div>
    );
}