'use client'

// Bayi Formları: lastikjantavm.com/bayi-formu adresindeki ortak formdan gelen cevapların listesi.
// Montaj Noktaları ekranından ve sitedeki fiyatlardan bağımsızdır; yalnızca toplanan veriyi gösterir.

// React Imports
import { useCallback, useEffect, useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import TablePagination from '@mui/material/TablePagination'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

// Third-party Imports
import { toast } from 'react-toastify'

// API Imports
import { API_ENDPOINTS, fetchAPI } from '@libs/api'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

const FORM_LINK = 'https://lastikjantavm.com/bayi-formu'
const BASE = `${API_ENDPOINTS.montage.list()}/dealer-forms`

// Bayinin yüklediği dosya: yalnızca panel oturumuyla okunur (sitede yayınlanmaz). Fotoğraf küçük resim, PDF düğme olarak görünür;
// tıklanınca yeni sekmede tam boy açılır.
const FileThumb = ({ ad }: { ad: string }) => {
  const [src, setSrc] = useState<string | null>(null)
  const [hata, setHata] = useState(false)

  useEffect(() => {
    let iptal = false

    fetchAPI(`${BASE}/dosya/${ad}`)
      .then((r: any) => { if (!iptal) setSrc(`data:${r.data.tur};base64,${r.data.base64}`) })
      .catch(() => { if (!iptal) setHata(true) })

    return () => { iptal = true }
  }, [ad])

  const ac = async () => {
    if (!src) return
    const blob = await (await fetch(src)).blob()

    window.open(URL.createObjectURL(blob), '_blank')
  }

  if (hata) return <Typography variant='caption' color='error'>Dosya açılamadı</Typography>
  if (!src) return <CircularProgress size={18} />

  if (ad.endsWith('.pdf')) return <Button size='small' variant='outlined' onClick={ac} startIcon={<i className='ri-file-pdf-2-line' />}>PDF aç</Button>

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt='' onClick={ac} style={{ width: 132, height: 99, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--mui-palette-divider)' }} />
  )
}

type Row = { _id: string; bayiAdi: string; cityName: string; districtName: string; telefon1: string; telefon2?: string; ilkGonderim: string; sonGuncelleme: string; gonderimSayisi: number }
type City = { cityId: string; cityName: string; adet: number }

const tarih = (d?: string) => (d ? new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-')

const DealerFormsTable = () => {
  const [rows, setRows] = useState<Row[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(50)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [cityId, setCityId] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [toDelete, setToDelete] = useState<Row | null>(null)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const q = new URLSearchParams({ page: String(page + 1), limit: String(limit) })

      if (query) q.set('search', query)
      if (cityId) q.set('cityId', cityId)
      const res = await fetchAPI(`${BASE}?${q}`)

      setRows(res.data || [])
      setTotal(res.toplam || 0)
      setCities(res.iller || [])
    } catch (error: any) {
      toast.error(error?.message || 'Bayi formları alınamadı')
    } finally {
      setLoading(false)
    }
  }, [page, limit, query, cityId])

  useEffect(() => { load() }, [load])

  // Arama kutusu: yazma bitince sorgula
  useEffect(() => {
    const t = setTimeout(() => { setPage(0); setQuery(search.trim()) }, 400)

    return () => clearTimeout(t)
  }, [search])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(FORM_LINK)
      toast.success('Form linki kopyalandı')
    } catch {
      toast.info(FORM_LINK)
    }
  }

  const exportExcel = async () => {
    setExporting(true)

    try {
      const q = new URLSearchParams()

      if (query) q.set('search', query)
      if (cityId) q.set('cityId', cityId)
      const res = await fetchAPI(`${BASE}/export?${q}`)

      if (!res.success) throw new Error(res.message)
      const binary = atob(res.data.base64)
      const bytes = new Uint8Array(binary.length)

      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = res.data.filename || 'bayi-formlari.xlsx'
      link.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      toast.error(error?.message || 'Excel indirilemedi')
    } finally {
      setExporting(false)
    }
  }

  const openDetail = async (row: Row) => {
    setDetailLoading(true)
    setDetail({ data: row })

    try {
      const res = await fetchAPI(`${BASE}/${row._id}`)

      setDetail(res)
    } catch (error: any) {
      toast.error(error?.message || 'Kayıt alınamadı')
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return

    try {
      await fetchAPI(`${BASE}/${toDelete._id}`, { method: 'DELETE' })
      toast.success('Kayıt silindi')
      setToDelete(null)
      load()
    } catch (error: any) {
      toast.error(error?.message || 'Kayıt silinemedi')
    }
  }

  const d = detail?.data
  const t = detail?.tanim
  const fiyat = (v: any) => (v === t?.vermiyorum ? t?.vermiyorumEtiket : typeof v === 'number' ? `${v.toLocaleString('tr-TR')} TL` : '-')

  const Line = ({ label, value }: { label: string; value: any }) => (
    <div className='flex justify-between gap-4 border-be py-1.5'>
      <Typography variant='body2' color='text.secondary'>{label}</Typography>
      <Typography variant='body2' className='font-medium text-right'>{value === undefined || value === null || value === '' ? '-' : String(value)}</Typography>
    </div>
  )

  return (
    <>
      <Card>
        <CardHeader
          title='Bayi Formları'
          subheader={`Montaj noktası bilgi ve fiyat formundan gelen cevaplar — ${total} bayi`}
          action={
            <div className='flex flex-wrap gap-2'>
              <Button variant='outlined' color='secondary' startIcon={<i className='ri-file-copy-line' />} onClick={copyLink}>Form Linkini Kopyala</Button>
              <Button variant='contained' startIcon={<i className='ri-file-excel-2-line' />} onClick={exportExcel} disabled={exporting || total === 0}>
                {exporting ? 'Hazırlanıyor...' : 'Excel İndir'}
              </Button>
            </div>
          }
        />
        <Divider />
        <div className='flex flex-wrap items-center gap-4 p-5'>
          <TextField size='small' label='Ara (bayi adı, il, ilçe, telefon)' value={search} onChange={e => setSearch(e.target.value)} className='min-is-[280px]' />
          <TextField size='small' select label='İl' value={cityId} onChange={e => { setPage(0); setCityId(e.target.value) }} className='min-is-[200px]'>
            <MenuItem value=''>Tüm iller</MenuItem>
            {cities.map(c => <MenuItem key={c.cityId} value={c.cityId}>{c.cityName} ({c.adet})</MenuItem>)}
          </TextField>
          <Typography variant='body2' color='text.secondary'>Form adresi: {FORM_LINK}</Typography>
        </div>
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Bayi Adı</th>
                <th>İl / İlçe</th>
                <th>Telefon</th>
                <th>İlk Gönderim</th>
                <th>Son Güncelleme</th>
                <th>Gönderim</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className='text-center'><CircularProgress size={24} /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className='text-center'>Henüz form dolduran bayi yok</td></tr>
              ) : rows.map(row => (
                <tr key={row._id} style={(row.gonderimSayisi || 1) > 1 ? { background: '#fff8ec' } : undefined}>
                  <td>
                    <Typography className='font-medium' color='text.primary'>{row.bayiAdi}</Typography>
                    {(row.gonderimSayisi || 1) > 1 && (
                      <span style={{ display: 'inline-block', marginTop: 2, padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#ffb547', color: '#3d2600' }}>
                        Yeniden gönderdi
                      </span>
                    )}
                  </td>
                  <td>{row.cityName} / {row.districtName}</td>
                  <td>{row.telefon1}{row.telefon2 ? <><br />{row.telefon2}</> : null}</td>
                  <td>{tarih(row.ilkGonderim)}</td>
                  <td>{tarih(row.sonGuncelleme)}</td>
                  <td>{row.gonderimSayisi || 1}</td>
                  <td>
                    <Tooltip title='Cevapları görüntüle'><IconButton size='small' onClick={() => openDetail(row)}><i className='ri-eye-line' /></IconButton></Tooltip>
                    <Tooltip title='Sil'><IconButton size='small' onClick={() => setToDelete(row)}><i className='ri-delete-bin-7-line' /></IconButton></Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          component='div'
          count={total}
          page={page}
          rowsPerPage={limit}
          rowsPerPageOptions={[25, 50, 100, 200]}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setPage(0); setLimit(parseInt(e.target.value, 10)) }}
          labelRowsPerPage='Sayfa başına'
        />
      </Card>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth='md' fullWidth>
        <DialogTitle>{d?.bayiAdi || 'Bayi formu'}</DialogTitle>
        <DialogContent dividers>
          {detailLoading || !t ? <div className='flex justify-center p-6'><CircularProgress size={28} /></div> : (
            <div className='flex flex-col gap-5'>
              <div>
                <Typography variant='h6' className='mbe-2'>Bayi Bilgileri</Typography>
                <Line label='İl / İlçe' value={`${d.cityName} / ${d.districtName}`} />
                <Line label='Açık adres' value={d.adres} />
                <Line label='Telefon' value={d.telefon1} />
                <Line label='İkinci telefon' value={d.telefon2} />
                <Line label='İlk gönderim' value={tarih(d.ilkGonderim)} />
                <Line label='Son güncelleme' value={`${tarih(d.sonGuncelleme)} (${d.gonderimSayisi || 1}. gönderim)`} />
              </div>
              <div>
                <Typography variant='h6' className='mbe-2'>Çalışma Saatleri</Typography>
                {t.saatAlanlari.map((a: any) => <Line key={a.key} label={a.etiket} value={d.saatler?.[a.key]} />)}
              </div>
              <div>
                <Typography variant='h6' className='mbe-2'>Hizmet Fiyatları (KDV dahil)</Typography>
                {t.fiyatGruplari.map((g: any) => (
                  <div key={g.ad} className='mbe-3'>
                    <Typography variant='subtitle2' color='primary' className='mbs-2'>{g.ad}</Typography>
                    {g.satirlar.map((r: any) => <Line key={r.kod} label={`${r.kod} – ${r.ad} (${r.birim})`} value={fiyat(d.fiyatlar?.[r.anahtar])} />)}
                  </div>
                ))}
              </div>
              <div>
                <Typography variant='h6' className='mbe-2'>Tesis Bilgileri</Typography>
                {t.tesisEvetHayir.map((a: any) => <Line key={a.key} label={a.kisa} value={d.tesis?.[a.key]} />)}
                <Line label='Çalışan sayısı' value={d.tesis?.calisanSayisi} />
                <Line label='Marka bayiliği' value={(d.tesis?.markalar || []).join(', ')} />
                <Line label='İş yeri' value={d.tesis?.metrekare ? `${d.tesis.metrekare} m²` : ''} />
                <Line label='Lastik oteli kapasitesi' value={d.tesis?.lastikOteliKapasite === t.lastikOteliYok ? t.lastikOteliYokEtiket : d.tesis?.lastikOteliKapasite ? `${d.tesis.lastikOteliKapasite} adet` : ''} />
                <Line label='Ek hizmetler' value={d.ekHizmetler} />
              </div>
              <div>
                <Typography variant='h6' className='mbe-2'>Görseller</Typography>
                {(t.gorselAlanlari || []).map((a: any) => {
                  const liste: string[] = d.gorseller?.[a.key] || []

                  return (
                    <div key={a.key} className='mbe-3'>
                      <Typography variant='subtitle2' className='mbe-1'>{a.etiket}</Typography>
                      {liste.length
                        ? <div className='flex flex-wrap gap-2 items-center'>{liste.map(ad => <FileThumb key={ad} ad={ad} />)}</div>
                        : <Typography variant='body2' color='text.disabled'>Yüklenmedi</Typography>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetail(null)}>Kapat</Button></DialogActions>
      </Dialog>

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)}>
        <DialogTitle>Kaydı sil</DialogTitle>
        <DialogContent>
          <DialogContentText>“{toDelete?.bayiAdi}” bayisinin form cevapları silinecek. Bu işlem geri alınamaz.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)}>Vazgeç</Button>
          <Button color='error' variant='contained' onClick={confirmDelete}>Sil</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default DealerFormsTable
