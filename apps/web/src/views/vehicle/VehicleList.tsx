'use client';

import { useState } from 'react';
import type { Vehicle } from '@/src/types/vehicle';
import VehicleCard from './vehicleCard';
import VehicleFormModal from '@/src/components/layout/Modals/VehicleForm';

interface VehicleListProps {
    vehicles: Vehicle[];
    onRefresh: () => void;
}

export default function VehicleList({ vehicles, onRefresh }: VehicleListProps) {
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

    return (
        <>
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
                {vehicles.map((vehicle) => (
                    <div key={vehicle._id} className="col">
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