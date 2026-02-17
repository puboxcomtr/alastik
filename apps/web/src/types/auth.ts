export interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthSuccess?: (user: any) => void;
    initialMode?: 'login' | 'register';
}

export interface LoginForm {
    identifier: string;
    password: string;
}

export interface RegisterForm {
    username: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
}