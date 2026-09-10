#!/bin/bash
# Günlük ürün eksiklik raporu: görselsiz / açıklamasız / fiyatsız / kargo dahil
# fiyatı eksik XML ürünler (ALastik + LastikJantAVM). Haftalık denetimin AĞIR kod
# taraması YOKTUR — yalnız hızlı DB kontrolleri. Cron'dan her gün çalışır.
set -u
export HOME=/root
export PATH="/root/.local/bin:/usr/local/bin:/usr/bin:/bin"

TARIH=$(date +%F)
RAPOR_DIZIN=/var/www/alastik/apps/docs/gunluk-urun-raporlari
RAPOR="$RAPOR_DIZIN/urun-eksik-$TARIH.md"
LOG=/var/log/gunluk-urun-eksik.log
ALICI="emir.bahcecioglu@artlastik.com,yagiz.yenen@artlastik.com,salih.nar@artlastik.com"

mkdir -p "$RAPOR_DIZIN"
{
  echo "# Günlük Ürün Eksiklik Raporu — $TARIH"
  echo
  echo "Görselsiz, açıklamasız, fiyatsız ve kargo dahil fiyatı eksik XML ürünler."
  echo
} > "$RAPOR"

echo "[$(date)] Günlük ürün kontrolü başladı" >> "$LOG"

echo "# ALastik" >> "$RAPOR"
if ! node /var/www/alastik/apps/api/scripts/denetim/alastik-veri-kontrol.js >> "$RAPOR" 2>> "$LOG"; then
  echo "## ALastik veri kontrolü çalıştırılamadı (log: $LOG)" >> "$RAPOR"
fi

echo >> "$RAPOR"
echo "# LastikJantAVM" >> "$RAPOR"
if ! node /var/www/alastik/apps/api/scripts/denetim/lastikjantavm-veri-kontrol.js >> "$RAPOR" 2>> "$LOG"; then
  echo "## LastikJantAVM veri kontrolü çalıştırılamadı (log: $LOG)" >> "$RAPOR"
fi

# Raporu e-posta ile gönder (LJA SMTP ayarıyla)
if node /var/www/alastik/apps/api/scripts/denetim/denetim-mail.js "$RAPOR" "Günlük Ürün Eksiklik Raporu ($TARIH)" "$ALICI" lastikjantavm >> "$LOG" 2>&1; then
  echo "[$(date)] Rapor gönderildi: $RAPOR -> $ALICI" >> "$LOG"
else
  echo "[$(date)] HATA: rapor e-postası gönderilemedi ($RAPOR)" >> "$LOG"
fi
