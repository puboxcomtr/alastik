// B2B header — yer tutucu iskelet; B2B tasarımı gelince burada kurulacak.
import { SITES } from '@src/config/siteConfig';

const B2BHeader = () => {
    const site = SITES.b2b;

    return (
        <header
            style={{
                background: site.theme.secondary,
                borderBottom: `2px solid ${site.theme.primary}`,
                padding: '12px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}
        >
            <img src={site.theme.logo} alt={site.name} style={{ height: 36 }} />
            <span style={{ color: site.theme.primary, fontWeight: 700, fontSize: 14 }}>
                B2B Toptan
            </span>
        </header>
    );
};

export default B2BHeader;
