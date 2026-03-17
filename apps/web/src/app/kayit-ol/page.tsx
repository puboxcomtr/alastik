import { Metadata } from 'next';
import RegisterView from '@/src/views/account/RegisterView';

export const metadata: Metadata = {
    title: 'Üye Ol | ALastik.com',
    description: 'ALastik.com üye olun, özel fırsatlardan yararlanın.',
    robots: { index: false, follow: false }
};

export default function RegisterPage() {
    return <RegisterView />;
}