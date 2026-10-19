'use client';

import React, { useState } from 'react';
import { Collapse } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useAuth } from '@/src/hooks/Theme/useAuth';
import { formatPhoneNumber, parsePhoneNumber, displayPhoneNumber } from '@/src/hooks/helper';

interface ProfileProps {
    email: string;
    profile: {
        firstName?: string;
        lastName?: string;
        phone?: string;
    };
    marketingConsent?: boolean;
    onProfileChange: (profile: { firstName?: string; lastName?: string; phone?: string }) => void;
    onMarketingChange?: (value: boolean) => void;
}

export default function ProfileContent({ email, profile, marketingConsent = false, onProfileChange, onMarketingChange }: ProfileProps) {
    const { getToken } = useAuth();

    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: displayPhoneNumber(profile.phone || ''),
        marketingConsent: marketingConsent
    });
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        console.log('marketingConsent prop:', marketingConsent);
        setForm(prev => ({ ...prev, marketingConsent }));
    }, [marketingConsent]);
    const [passwordMode, setPasswordMode] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        newPasswordConfirm: ''
    });
    const [savingPassword, setSavingPassword] = useState(false);

    const handleEdit = (e: React.MouseEvent) => {
        e.preventDefault();
        setForm({
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            phone: displayPhoneNumber(profile.phone || ''),
            marketingConsent: marketingConsent
        });
        setEditMode(!editMode);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.firstName.trim() || !form.lastName.trim()) {
            toast.error('Ad ve soyad zorunludur.');
            return;
        }
        if (!form.phone.trim()) {
            toast.error('Telefon numarası zorunludur.');
            return;
        }

        setSaving(true);
        try {
            const token = getToken();
            const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    firstName: form.firstName.trim(),
                    lastName: form.lastName.trim(),
                    phone: parsePhoneNumber(form.phone),
                    marketingConsent: form.marketingConsent
                })
            });
            const data = await resp.json();
            if (data.success) {
                toast.success('Profil güncellendi.');
                onProfileChange({
                    firstName: form.firstName.trim(),
                    lastName: form.lastName.trim(),
                    phone: parsePhoneNumber(form.phone)
                });
                onMarketingChange?.(form.marketingConsent);
                setEditMode(false);
            } else {
                toast.error(data.message || 'Güncelleme başarısız.');
            }
        } catch {
            toast.error('Bir hata oluştu.');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.newPasswordConfirm) {
            toast.error('Tüm alanları doldurunuz.');
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            toast.error('Yeni şifre en az 6 karakter olmalıdır.');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.newPasswordConfirm) {
            toast.error('Yeni şifreler eşleşmiyor.');
            return;
        }

        setSavingPassword(true);
        try {
            const token = getToken();
            const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/change-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(passwordForm)
            });
            const data = await resp.json();
            if (data.success) {
                toast.success('Şifreniz değiştirildi.');
                setPasswordForm({ currentPassword: '', newPassword: '', newPasswordConfirm: '' });
                setPasswordMode(false);
            } else {
                toast.error(data.message || 'Şifre değiştirilemedi.');
            }
        } catch {
            toast.error('Bir hata oluştu.');
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <>
            <div className="py-4">
                <div className="nav flex-nowrap align-items-center justify-content-between pb-1 mb-3">
                    <h2 className="h6 mb-0">Kişisel Bilgiler</h2>
                    <a className="nav-link text-decoration-underline p-0" href="#" onClick={handleEdit}>
                        {editMode ? 'Kapat' : 'Düzenle'}
                    </a>
                </div>

                <Collapse in={!editMode}>
                    <div>
                        <ul className="list-unstyled fs-sm m-0">
                            <li>{profile.firstName || profile.lastName ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '-'}</li>
                            <li>{email || '-'}</li>
                            <li>{profile.phone || '-'}</li>
                        </ul>
                    </div>
                </Collapse>

                <Collapse in={editMode}>
                    <div>
                        <form className="row g-3 g-sm-4" onSubmit={handleSave}>
                            <div className="col-sm-6">
                                <label className="form-label">Ad</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.firstName}
                                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="col-sm-6">
                                <label className="form-label">Soyad</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.lastName}
                                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="col-sm-6">
                                <label className="form-label">E-posta</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={email}
                                    disabled
                                />
                                <div className="form-text">E-posta adresi değiştirilemez.</div>
                            </div>
                            <div className="col-sm-6">
                                <label className="form-label">Telefon</label>
                                <div className="input-group">
                                    <span className="input-group-text">+90</span>
                                    <input
                                        type="tel"
                                        className="form-control"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: formatPhoneNumber(e.target.value) })}
                                        placeholder="5XX XXX XX XX"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="col-12">
                                <div className="form-check">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        id="marketingConsent"
                                        checked={form.marketingConsent}
                                        onChange={(e) => setForm({ ...form, marketingConsent: e.target.checked })}
                                    />
                                    <label className="form-check-label fs-sm" htmlFor="marketingConsent">
                                        Kampanya ve duyurulardan haberdar olmak istiyorum.
                                    </label>
                                </div>
                            </div>
                            <div className="col-12">
                                <div className="d-flex gap-3 pt-2 pt-sm-0">
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)}>
                                        Kapat
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </Collapse>
            </div>

            <div className="border-bottom py-4">
                <div className="nav flex-nowrap align-items-center justify-content-between pb-1 mb-3">
                    <h2 className="h6 mb-0">Şifre</h2>
                    <a className="nav-link text-decoration-underline p-0" href="#" onClick={(e) => { e.preventDefault(); setPasswordMode(!passwordMode); }}>
                        {passwordMode ? 'Kapat' : 'Değiştir'}
                    </a>
                </div>

                <Collapse in={!passwordMode}>
                    <div>
                        <ul className="list-unstyled fs-sm m-0">
                            <li>••••••••</li>
                        </ul>
                    </div>
                </Collapse>

                <Collapse in={passwordMode}>
                    <div>
                        <form className="row g-3 g-sm-4" onSubmit={handlePasswordChange}>
                            <div className="col-sm-12">
                                <label className="form-label">Mevcut Şifre</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={passwordForm.currentPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="col-sm-6">
                                <label className="form-label">Yeni Şifre</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="col-sm-6">
                                <label className="form-label">Yeni Şifre (Tekrar)</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={passwordForm.newPasswordConfirm}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, newPasswordConfirm: e.target.value })}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="col-12">
                                <div className="d-flex gap-3 pt-2 pt-sm-0">
                                    <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                                        {savingPassword ? 'Kaydediliyor...' : 'Şifreyi Değiştir'}
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setPasswordMode(false)}>
                                        Kapat
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </Collapse>
            </div>
        </>
    );
}