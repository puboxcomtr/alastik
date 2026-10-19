'use client'

import { useEffect, useState } from 'react'

import Settings from '@/views/modules/dia/Settings'
import SettingsLastikJantAvm from '@/views/modules/dia/SettingsLastikJantAvm'
import { getActiveSite } from '@/utils/activeSite'

const DiaSettingsBySite = () => {
  const [site, setSite] = useState<string | null>(null)

  useEffect(() => {
    setSite(getActiveSite())
  }, [])

  if (!site) return null

  return site === 'lastikjantavm' || site === 'b2b' ? <SettingsLastikJantAvm /> : <Settings />
}

export default DiaSettingsBySite
