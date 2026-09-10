'use client'

import { useEffect, useState } from 'react'

import Settings from '@/views/modules/dia/Settings'
import SettingsLastikJantAvm from '@/views/modules/dia/SettingsLastikJantAvm'
import { getActiveSite } from '@/utils/activeSite'

// Ust bardaki SiteSelector'a gore ekran secer; site degisiminde sayfa zaten reload olur.
const DiaSettingsBySite = () => {
  const [site, setSite] = useState<string | null>(null)

  useEffect(() => {
    setSite(getActiveSite())
  }, [])

  if (!site) return null

  // B2B, LJA ile aynı ekranı kullanır (firma 1 senkron yapısı ortak) — kayıtlar
  // aktif sitenin X-Site başlığıyla site bazlı tutulur
  return site === 'lastikjantavm' || site === 'b2b' ? <SettingsLastikJantAvm /> : <Settings />
}

export default DiaSettingsBySite
