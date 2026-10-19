import type { CSSProperties } from 'react';
import type { ProductButton } from '@src/types/products';

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const validColor = (value?: string) => (value && HEX_COLOR.test(value) ? value : '');

function buttonStyle(button: ProductButton): CSSProperties | undefined {
    const from = validColor(button.colorFrom);
    const to = validColor(button.colorTo) || from;
    const text = validColor(button.textColor);

    if (!from && !text) return undefined;

    return {
        ...(from ? { background: from === to ? from : `linear-gradient(90deg, ${from}, ${to})` } : {}),
        ...(text ? { color: text } : {})
    };
}

interface ProductButtonsProps {
    buttons?: ProductButton[];
    className?: string;
}

export default function ProductButtons({ buttons, className = '' }: ProductButtonsProps) {
    if (!buttons || buttons.length === 0) return null;

    return (
        <div className={`d-flex flex-column gap-1 ${className}`}>
            {buttons.map(button => (
                <span key={button.key} className="product-button" style={buttonStyle(button)}>
                    {button.icon ? <i className={button.icon} aria-hidden="true"></i> : null}
                    {button.label}
                </span>
            ))}
        </div>
    );
}
