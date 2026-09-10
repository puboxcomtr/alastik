import { KatalogJant } from "@components/b2b-tema/katalog-jant";

export default function JantPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Jant</h1>
          <p className="sub">
            Sıfır ve 2. el jantlar. Çap, bijon aralığı ve ET ile
            süzebilirsiniz.
          </p>
        </div>
      </div>
      <KatalogJant />
    </>
  );
}
