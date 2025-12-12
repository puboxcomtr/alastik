import React from 'react';

interface TabHeaderProps {
    activeTab: 'tire' | 'rim' | 'chain';
    setActiveTab: (tab: 'tire' | 'rim' | 'chain') => void;
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
            <span
                className="search_icon"
                onClick={() => setActiveTab('chain')}
                style={{ cursor: 'pointer', ...(activeTab === 'chain' ? activeStyle : {}) }}
            >
                <i className="ri-snowflake-line"></i>
                Kar Paleti ve Zincir
            </span>
        </div>
    );
}