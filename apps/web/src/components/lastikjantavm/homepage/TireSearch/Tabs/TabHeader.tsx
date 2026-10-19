import React from 'react';

interface TabHeaderProps {
    activeTab: 'tire' | 'rim' | 'chain';
    setActiveTab: (tab: 'tire' | 'rim' | 'chain') => void;
}

export default function TabHeader({ activeTab, setActiveTab }: TabHeaderProps) {
    const activeStyle = {
        backgroundColor: 'var(--cz-primary)',
        color: '#313131',
    };

    return (
        <div className="search_tabheader">
            <span
                className="search_icon cursor-pointer"
                onClick={() => setActiveTab('tire')}
                style={{ ...(activeTab === 'tire' ? activeStyle : {}) }}
            >
                <i className="ri-car-line"></i>
                Araç Lastiği
            </span>
            <span
                className="search_icon cursor-pointer"
                onClick={() => setActiveTab('rim')}
                style={{  ...(activeTab === 'rim' ? activeStyle : {}) }}
            >
                <i className="ri-steering-2-fill"></i>
                Jant
            </span>
        </div>
    );
}