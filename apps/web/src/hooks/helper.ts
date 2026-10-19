export const formatPhoneNumber = (value: string): string => {
    const numbers = value.replace(/\D/g, '');

    const limited = numbers.slice(0, 10);

    if (limited.length === 0) return '';
    if (limited.length <= 3) return limited;
    if (limited.length <= 6) return `${limited.slice(0, 3)} ${limited.slice(3)}`;
    if (limited.length <= 8) return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
    return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6, 8)} ${limited.slice(8)}`;
};

export const parsePhoneNumber = (formatted: string): string => {
    const numbers = formatted.replace(/\D/g, '');
    return numbers ? `+90${numbers}` : '';
};

export const displayPhoneNumber = (dbValue: string): string => {
    const withoutPrefix = dbValue?.replace('+90', '') || '';
    return formatPhoneNumber(withoutPrefix);
};