import { Metadata } from 'next';
import MyVehiclesView from '@/src/views/vehicle/list/MyVehiclesView';

export const metadata: Metadata = {
    title: 'Araçlarım | ALastik.com',
    description: 'Araçlarınızı yönetin, lastik ve jant önerilerini görün.'
};

export default function AraclarimPage() {
    return <MyVehiclesView />;
}