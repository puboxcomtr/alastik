import { Katalog } from "@/components/katalog";

export default function LastikPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Lastik</h1>
          <p className="sub">
            Sıfır ve 2. el lastikler. Ebat, marka, mevsim ve üretim yılı ile
            süzebilirsiniz.
          </p>
        </div>
      </div>
      <Katalog />
    </>
  );
}
