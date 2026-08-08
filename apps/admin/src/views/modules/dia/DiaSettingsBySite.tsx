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

  return site === 'lastikjantavm' ? <SettingsLastikJantAvm /> : <Settings />
}

export default DiaSettingsBySite
