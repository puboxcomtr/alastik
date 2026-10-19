'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'react-toastify'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import type { SelectChangeEvent } from '@mui/material/Select'
import ListItemIcon from '@mui/material/ListItemIcon'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import { getActiveSite, setActiveSite, ADMIN_SITES, getSiteLabel } from '@/utils/activeSite'
import { fetchAPI } from '@libs/api'

const SITE_LOCKED_PATHS = [/\/order\/detail\//]

const SiteSelector = () => {
  const [site, setSite] = useState<string>('alastik')
  const [pending, setPending] = useState<string | null>(null)
  const [allowedSites, setAllowedSites] = useState<string[] | null>(null)
  const pathname = usePathname()

  const isSiteLocked = SITE_LOCKED_PATHS.some(pattern => pattern.test(pathname || ''))

  useEffect(() => {
    const current = getActiveSite()
    setSite(current)

    const loadAllowedSites = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
        const result = await fetchAPI(`${base}/admin/user/auth/me`)
        const sites: string[] | undefined = result?.data?.admin?.sites || result?.data?.sites
        if (Array.isArray(sites) && sites.length > 0) {
          setAllowedSites(sites)
          if (!sites.includes(current)) {
            toast.warning(`${getSiteLabel(current)} yetkiniz kısıtlıdır`)
            setActiveSite(sites[0])
            setSite(sites[0])
            window.location.reload()
          }
        }
      } catch {
      }
    }
    loadAllowedSites()
  }, [])

  const handleChange = (event: SelectChangeEvent) => {
    const value = event.target.value
    if (value === site) return
    if (isSiteLocked) {
      toast.warning('Bu sayfada site kaynağı değiştirilemez')
      return
    }
    if (allowedSites && !allowedSites.includes(value)) {
      toast.warning(`${getSiteLabel(value)} yetkiniz kısıtlıdır`)
      return
    }
    setPending(value)
  }

  const handleConfirm = () => {
    if (!pending) return
    setActiveSite(pending)
    setSite(pending)
    setPending(null)
    window.location.reload()
  }

  const handleCancel = () => {
    setPending(null)
  }

  return (
    <>
      <Select
        value={site}
        onChange={handleChange}
        size='small'
        sx={{ minWidth: 180 }}
        renderValue={selected => (
          <span className='flex items-center gap-2'>
            <i className='ri-global-line text-[18px]' />
            {getSiteLabel(selected)}
          </span>
        )}
      >
        {ADMIN_SITES.map(slug => {
          const restricted = allowedSites ? !allowedSites.includes(slug) : false
          return (
            <MenuItem key={slug} value={slug} selected={slug === site} disabled={restricted}>
              {getSiteLabel(slug)}
            </MenuItem>
          )
        })}
      </Select>

      <Dialog open={Boolean(pending)} onClose={handleCancel}>
        <DialogTitle>Site Değişikliği</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pending ? `${getSiteLabel(pending)} sitesine geçiş yapmak istediğinize emin misiniz?` : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color='secondary'>Vazgeç</Button>
          <Button onClick={handleConfirm} variant='contained'>Evet, geçiş yap</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default SiteSelector
