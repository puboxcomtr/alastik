// Footer'da görünmeyen (display:none) bağlantı — LastikJantAVM ve ALastik footer'larında kullanılır (14 Eki 2026 isteği).
const HIDDEN_LINK_URL = 'https://www.scent.com.tr/sayfa/muadil-parfum-listesi';
const HIDDEN_LINK_TEXT = 'muadil parfüm';

export default function HiddenFooterLink() {
    return (
        <div style={{ display: 'none' }}>
            <a href={HIDDEN_LINK_URL}>{HIDDEN_LINK_TEXT}</a>
        </div>
    );
}
