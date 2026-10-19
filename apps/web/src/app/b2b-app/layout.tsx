import './b2b-theme.css';
import { DisableContextMenu } from '@components/b2b-theme/disable-context-menu';

export const metadata = {
    title: 'LastikJantAVM B2B | Bayi Paneli',
    robots: { index: false, follow: false },
};

export default function B2BAppLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <DisableContextMenu />
            {children}
        </>
    );
}
