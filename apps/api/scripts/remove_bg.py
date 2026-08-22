#!/usr/bin/env python3
"""
Arka plan temizleme isleyicisi (rembg / ISNet). Node tarafindan spawn edilir.
stdin: her satir bir JSON is -> {"input": "<kaynak>", "output": "<hedef>"}
stdout: her is icin bir JSON satir -> {"ok": true|false, "input": ..., "error": ...}
Cikti: arka plan BEYAZ, kaynak formati korunur (JPEG/PNG/WEBP). Model bir kez yuklenir.
Guvenlik: on plan kapsami REMBG_MIN_COVERAGE yuzdesinin altindaysa (model nesneyi arka plan sandiysa)
dosya DEGISTIRILMEZ ve hata doner. Varsayilan model birefnet-general-lite: isnet-general-use hizli ama
kadraji dolduran koyu lastikleri ve beyaz etiketleri arka plan sanip siliyordu (21 Agu 2026 testi).
"""
import sys
import json
import os

os.environ.setdefault("OMP_NUM_THREADS", os.environ.get("REMBG_THREADS", "4"))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402
import onnxruntime as ort  # noqa: E402
from rembg import remove  # noqa: E402
from rembg.sessions import sessions_class  # noqa: E402

MODEL = os.environ.get("REMBG_MODEL", "birefnet-general-lite")
MIN_COVERAGE = float(os.environ.get("REMBG_MIN_COVERAGE", "8"))
MAX_COVERAGE = float(os.environ.get("REMBG_MAX_COVERAGE", "99.5"))
# Maske bu uzun kenara kucultulmus kopyada hesaplanir, orijinal boyuta olceklenir (model girdisi zaten 1024 px;
# tam cozunurlukte islemek 4 MP fotoda ~10 GB RAM ve 3 kat sure istiyordu)
MAX_SIDE = int(os.environ.get("REMBG_MAX_SIDE", "1600"))
BG_COLOR = (255, 255, 255, 255)


def emit(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def process(session, src, dst):
    global coverage
    with Image.open(src) as im:
        fmt = (im.format or "JPEG").upper()
        rgba = im.convert("RGBA")
    w, h = rgba.size
    scale = MAX_SIDE / float(max(w, h))
    if scale < 1.0:
        small = rgba.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
        cut_small = remove(small, session=session, post_process_mask=True)
        alpha_img = cut_small.getchannel("A").resize((w, h), Image.LANCZOS)
        del small, cut_small
    else:
        alpha_img = remove(rgba, session=session, post_process_mask=True).getchannel("A")
    alpha = np.asarray(alpha_img)
    coverage = float((alpha > 128).mean() * 100.0)
    if coverage < MIN_COVERAGE:
        raise RuntimeError(f"Ön plan algılanamadı (kapsam %{coverage:.1f}), görsel değiştirilmedi")
    if coverage > MAX_COVERAGE:
        raise RuntimeError(f"Arka plan bulunamadı (kapsam %{coverage:.1f}), görsel değiştirilmedi")
    cut = rgba.copy()
    cut.putalpha(alpha_img)
    canvas = Image.new("RGBA", cut.size, BG_COLOR)
    canvas.alpha_composite(cut)
    out = canvas.convert("RGB")
    if fmt == "PNG":
        out.save(dst, "PNG", optimize=True)
    elif fmt == "WEBP":
        out.save(dst, "WEBP", quality=90, method=4)
    else:
        out.save(dst, "JPEG", quality=92, subsampling=0, progressive=True, optimize=True)


def build_session():
    """onnxruntime oturumu: bellek deseni kapali + arena 'kSameAsRequested' → birefnet-general-lite
    11 GB yerine ~6,8 GB RAM kullanir, hiz ayni (21 Agu 2026 olcumu). Thread sayisi REMBG_THREADS."""
    threads = int(os.environ.get("OMP_NUM_THREADS", "4"))
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = threads
    opts.inter_op_num_threads = threads
    opts.enable_mem_pattern = False
    providers = [("CPUExecutionProvider", {"arena_extend_strategy": "kSameAsRequested"})]
    cls = next((c for c in sessions_class if c.name() == MODEL), None)
    if cls is None:
        raise RuntimeError(f"Bilinmeyen model: {MODEL}")
    return cls(MODEL, opts, providers)


def main():
    session = build_session()
    emit({"ready": True, "model": MODEL})
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            job = json.loads(line)
            process(session, job["input"], job["output"])
            emit({"ok": True, "input": job["input"], "coverage": round(coverage, 1)})
        except Exception as exc:  # tek dosya hatasi kuyrugu durdurmaz
            emit({"ok": False, "input": job.get("input") if isinstance(job, dict) else None, "error": str(exc)})


if __name__ == "__main__":
    main()
