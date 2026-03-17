import { Metadata } from 'next';
import LoginView from '@/src/views/account/LoginView';

export const metadata: Metadata = {
    title: 'Giriş Yap | ALastik.com',
    description: 'ALastik.com üye girişi',
    robots: { index: false, follow: false }
};

export default function LoginPage() {
    return <LoginView />;
}