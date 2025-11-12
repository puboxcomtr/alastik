// apps/web/src/components/user/Vehicle/VehicleList.tsx
'use client';

import { useState } from 'react';
import type { Vehicle } from '@/src/types/vehicle';
import VehicleCard from './vehicleCard';
import VehicleFormModal from '@components/user/vehicle/VehicleFormModal';

interface VehicleListProps {
    vehicles: Vehicle[];
    onRefresh: () => void;
}

export default function VehicleList({ vehicles, onRefresh }: VehicleListProps) {
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

    return (
        <>
            <div className="row g-3">
                {vehicles.map((vehicle) => (
                    <div key={vehicle._id} className="col-md-6 col-lg-4">
                        <VehicleCard
                            vehicle={vehicle}
                            onEdit={() => setEditingVehicle(vehicle)}
                            onRefresh={onRefresh}
                        />
                    </div>
                ))}
            </div>

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