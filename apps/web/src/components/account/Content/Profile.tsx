'use client';

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/src/hooks/Theme/useAuth';

interface ProfileProps {
    email: string;
    profile: {
        firstName?: string;
        lastName?: string;
        phone?: string;
    };
    onProfileChange: (profile: { firstName?: string; lastName?: string; phone?: string }) => void;
}

export default function ProfileContent({ email, profile, onProfileChange }: ProfileProps) {
    const { getToken } = useAuth();
    const [saving, setSaving] = useState(false);

    return (
        <div className="border-bottom py-4">
            <div className="nav flex-nowrap align-items-center justify-content-between pb-1 mb-3">
                <h2 className="h6 mb-0 text-primary">Kişisel Bilgiler</h2>
                <a className="nav-link text-decoration-underline p-0" href="#" onClick={(e) => e.preventDefault()}>Düzenle</a>
            </div>
            <ul className="list-unstyled fs-sm m-0">
                <li>{profile.firstName || profile.lastName ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '-'}</li>
                <li>{email || '-'}</li>
                <li>{profile.phone || '-'}</li>
            </ul>
        </div>
    );
}