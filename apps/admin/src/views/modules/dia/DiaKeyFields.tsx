'use client'

import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'

export interface DiaKeyOption {
  key: number
  label: string
}

export interface DiaSiparisOptions {
  subeler: DiaKeyOption[]
  depolar: DiaKeyOption[]
  kargoFirmalari: DiaKeyOption[]
  hizmetKartlari: DiaKeyOption[]
  satisElemanlari: DiaKeyOption[]
  odemePlanlari: DiaKeyOption[]
  cariOzelKodlari: DiaKeyOption[]
  cariYetkiKodlari: DiaKeyOption[]
  siparisYetkiKodlari: DiaKeyOption[]
  faturaYetkiKodlari: DiaKeyOption[]
}

interface DiaKeySelectProps {
  label: string
  value: number
  options?: DiaKeyOption[]
  loading?: boolean
  onChange: (key: number) => void
}

export const DiaKeySelect = ({ label, value, options, loading, onChange }: DiaKeySelectProps) => {
  const list = options || []
  const selected = list.find(o => o.key === value) || (value ? { key: value, label: String(value) } : null)

  return (
    <Autocomplete
      size='small'
      options={list}
      value={selected}
      loading={loading}
      onChange={(_, option) => onChange(option ? option.key : 0)}
      getOptionLabel={o => `${o.label} — ${o.key}`}
      isOptionEqualToValue={(o, v) => o.key === v.key}
      noOptionsText='Kayıt bulunamadı'
      loadingText='DIA listesi yükleniyor...'
      renderInput={params => <TextField {...params} label={label} />}
    />
  )
}

interface DiaKeyMultiSelectProps {
  label: string
  value: string
  options?: DiaKeyOption[]
  loading?: boolean
  onChange: (keys: string) => void
}

export const DiaKeyMultiSelect = ({ label, value, options, loading, onChange }: DiaKeyMultiSelectProps) => {
  const list = options || []
  const keys = String(value || '').split(',').map(v => parseInt(v.trim())).filter(Boolean)
  const selected = keys.map(k => list.find(o => o.key === k) || { key: k, label: String(k) })

  return (
    <Autocomplete
      multiple
      size='small'
      options={list}
      value={selected}
      loading={loading}
      onChange={(_, items) => onChange(items.map(o => o.key).join(','))}
      getOptionLabel={o => `${o.label} — ${o.key}`}
      isOptionEqualToValue={(o, v) => o.key === v.key}
      noOptionsText='Kayıt bulunamadı'
      loadingText='DIA listesi yükleniyor...'
      renderInput={params => <TextField {...params} label={label} placeholder='Öncelik sırasıyla seçin' />}
    />
  )
}
