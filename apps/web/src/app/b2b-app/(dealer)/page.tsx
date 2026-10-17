import { HomeBanner } from "@components/b2b-theme/home-banner";
import { WelcomeHeading } from "@components/b2b-theme/welcome-heading";
import { DealerDashboard } from "@components/b2b-theme/dealer-dashboard";
import { PageHeadActions } from "@components/b2b-theme/page-head-actions";
import { AccountNotices } from "@components/b2b-theme/account-notices";

/**
 * Bayi anasayfası: karşılama + banner + cari/vade özet kartları.
 * Banner, admin Tema > Slider Ayarları'nda seçilen slider'dan gelir (HomeBanner client-side çeker).
 */
export default function DealerHome() {
  return (
    <>
      <div className="page-head">
        <WelcomeHeading />
        <PageHeadActions />
      </div>

      <AccountNotices />

      <HomeBanner />

      <DealerDashboard />
    </>
  );
}
