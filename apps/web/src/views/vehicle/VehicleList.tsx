// apps/web/src/components/user/Vehicle/VehicleList.tsx
'use client';

import { useState } from 'react';
import type { Vehicle } from '@/src/types/vehicle';
import VehicleCard from './vehicleCard';
import VehicleFormModal from '@components/user/vehicle/VehicleFormModal';


/* Config */
import { ROUTES } from '@/src/config/routes';

interface VehicleListProps {
    vehicles: Vehicle[];
    onRefresh: () => void;
}

export default function VehicleList({ vehicles, onRefresh }: VehicleListProps) {
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

    return (
        <>
            {vehicles.map((vehicle) => (
                <div key={vehicle._id} className="col">
                    <VehicleCard
                        vehicle={vehicle}
                        onEdit={() => setEditingVehicle(vehicle)}
                        onRefresh={onRefresh}
                    />
                </div>
            ))}

            {editingVehicle && (
                <VehicleFormModal
                    isOpen={!!editingVehicle}
                    vehicle={editingVehicle}
                    onClose={() => setEditingVehicle(null)}
                    onSuccess={() => {
                        setEditingVehicle(null);
                        onRefresh();
                    }}
                />
            )}
        </>
    );
}