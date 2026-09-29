import Image from "next/image";
import { ILETISIM } from "@/lib/ornek-veri";

/**
 * "Bayimiz Olun" — kayıt formu DEĞİLDİR. Hesap açılışını ekip yapar; bu
 * sayfa yalnızca iletişim bilgisi verir.
 */
export default function BayimizOlunPage() {
  return (
    <div className="login-wrap">
      <div className="login-box">
        <Image
          className="logo"
          src="/lastikjant-logo.png"
          alt="LastikJantAVM"
          width={230}
          height={46}
          priority
        />
        <h2>Bayimiz Olun</h2>
        <p className="sub">
          Bayilik hesapları güvenlik gereği yalnızca ekibimiz tarafından
          açılır — çevrimiçi kayıt formu yoktur. Bize ulaşın; cari kaydınızı
          oluşturup e-posta adresinize tek kullanımlık bir davet bağlantısı
          gönderelim. Parolanızı o bağlantıdan kendiniz belirlersiniz.
        </p>
        <div className="actions-row" style={{ flexWrap: "wrap", gap: "0.6rem" }}>
          <a className="btn-ghost" href={`tel:${ILETISIM.telefon.replace(/\s/g, "")}`}>
            ☎ {ILETISIM.telefon}
          </a>
          <a
            className="btn-ghost"
            href={`https://wa.me/${ILETISIM.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp&apos;tan yazın
          </a>
        </div>
        <p className="sub" style={{ marginTop: "1.2rem" }}>
          <a href="/login">← Girişe dön</a>
        </p>
      </div>
    </div>
  );
}
