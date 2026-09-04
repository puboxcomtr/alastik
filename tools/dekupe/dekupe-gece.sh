#!/bin/bash
# 2.El urun gorselleri gece dekupesi: yayindaki urunlerin islenmemis gorsellerini bulur ve isler.
# Full sync (05:00 TR) bittikten sonra calisir. Elle calisan dekupe varsa dokunmaz.
set -e
cd /var/www/alastik/tools/dekupe
systemctl -q is-active dekupe-2el && { echo "elle dekupe calisiyor, atlandi"; exit 0; }
export NODE_PATH=/var/www/alastik/node_modules:/var/www/alastik/apps/api/node_modules
node collect-2el.js
rm -f 2el-progress.json
node run-2el-bg.js
# yeni guvenlik kilidi hatalarini kalici listeye ekle (tekrar denenmesin)
if [ -f 2el-failed.jsonl ]; then
  node -e "
const fs=require('fs');
const locked=new Set(fs.existsSync('2el-kilitli.txt')?fs.readFileSync('2el-kilitli.txt','utf8').split('\n').filter(Boolean):[]);
for(const l of fs.readFileSync('2el-failed.jsonl','utf8').split('\n').filter(Boolean)){const e=JSON.parse(l);if(/Ön plan|Arka plan bulunamadı/.test(e.error))locked.add(e.file);}
fs.writeFileSync('2el-kilitli.txt',[...locked].sort().join('\n'));console.log('kilitli:',locked.size);"
  mv 2el-failed.jsonl "2el-failed.$(date +%Y%m%d).jsonl"
fi
