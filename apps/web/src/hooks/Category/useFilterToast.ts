"use client";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

const FILTER_KEYS = ['marka', 'fiyatMin', 'fiyatMax', 'mevsim', 'ozellik',
    'genislik', 'yukseklik', 'cap', 'hizEndeksi', 'yukEndeksi', 'uretim', 'oem', 'jantCap', 'bijon'];

export function useFilterToast() {
    const searchParams = useSearchParams();
    const prev = useRef(searchParams.toString());
    const isFirst = useRef(true);

    useEffect(() => {
        if (isFirst.current) {
            isFirst.current = false;
            prev.current = searchParams.toString();
            return;
        }
        const curr = searchParams.toString();
        if (curr === prev.current) return;

        const prevObj = new URLSearchParams(prev.current);
        const currObj = new URLSearchParams(curr);
        const changed = FILTER_KEYS.some(k => prevObj.get(k) !== currObj.get(k));

        if (changed) {
            toast.success('Seçiminiz başarıyla uygulandı.', {
                position: 'bottom-right',
                autoClose: 2000,
                hideProgressBar: true,
            });
        }
        prev.current = curr;
    }, [searchParams]);
}