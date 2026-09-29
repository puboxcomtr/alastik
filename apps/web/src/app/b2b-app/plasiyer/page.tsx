import { redirect } from 'next/navigation';

// Eski /plasiyer bağlantıları/önbelleği için: plasiyer akışı artık normal panelde (/) yürüyor.
export default function PlasiyerRedirect() {
    redirect('/');
}
