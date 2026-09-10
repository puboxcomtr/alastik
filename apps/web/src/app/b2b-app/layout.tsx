// B2B bayi paneli kökü — tema stilleri YALNIZ bu route ağacında yüklenir
// (middleware, b2b alan adındaki istekleri /b2b-app altına rewrite eder).
import './b2b-tema.css';

export const metadata = {
    title: 'LastikJantAVM B2B | Bayi Paneli',
    robots: { index: false, follow: false },
};

export default function B2BAppLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
