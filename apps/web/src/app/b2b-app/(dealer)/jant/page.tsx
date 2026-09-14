import { RimCatalog } from "@components/b2b-theme/rim-catalog";

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
      <RimCatalog />
    </>
  );
}
