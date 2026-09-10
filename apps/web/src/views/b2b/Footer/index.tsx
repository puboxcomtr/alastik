// B2B footer — yer tutucu iskelet; B2B tasarımı gelince burada kurulacak.
import { SITES } from '@src/config/siteConfig';

const B2BFooter = () => {
    const site = SITES.b2b;

    return (
        <footer
            style={{
                background: site.theme.secondary,
                borderTop: `2px solid ${site.theme.primary}`,
                padding: '16px 24px',
                textAlign: 'center',
                color: '#c9c9c9',
                fontSize: 13,
            }}
        >
            © {new Date().getFullYear()} {site.brandTitle}
        </footer>
    );
};

export default B2BFooter;
