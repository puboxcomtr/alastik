'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'

// Type Imports
import type { ReportSource } from '../types'

// Util Imports
import { formatNumber } from '@/views/analytics/reports/format'

type SetupCardProps = {
    source: ReportSource
    onSync: (days: number) => void
    syncing: boolean
}

// Search Console bağlı değilse kurulum adımları; bağlı ama veri yoksa ilk çekim düğmesi
const SetupCard = ({ source, onSync, syncing }: SetupCardProps) => {
    const sync = source.sync

    if (!source.available) {
        return (
            <Card>
                <CardHeader
                    title='Search Console bağlantısı kurulmadı'
                    subheader='Rapor, Google Search Console verisiyle dolar. Aşağıdaki iki adım Google hesabının sahibi tarafından bir kez yapılır; kod değişikliği gerektirmez.'
                />
                <CardContent className='flex flex-col gap-4'>
                    {source.setup ? (
                        <>
                            <div className='flex flex-col gap-3'>
                                {source.setup.steps.map((step, index) => (
                                    <div key={index} className='flex items-start gap-3'>
                                        <Chip label={index + 1} size='small' color='primary' variant='tonal' />
                                        <Typography>{step}</Typography>
                                    </div>
                                ))}
                            </div>
                            <div className='flex flex-col gap-1'>
                                <Typography variant='body2' color='text.secondary'>Eklenecek servis hesabı</Typography>
                                <Typography className='font-medium' sx={{ fontFamily: 'monospace' }}>{source.setup.serviceAccount || 'Servis hesabı dosyası bulunamadı'}</Typography>
                            </div>
                        </>
                    ) : null}
                    {source.reason ? (
                        <Typography variant='body2' color='error.main' className='flex items-start gap-2'>
                            <i className='ri-error-warning-line text-lg' />
                            {source.reason}
                        </Typography>
                    ) : null}
                    <div>
                        <Button variant='outlined' color='primary' startIcon={<i className='ri-refresh-line' />} onClick={() => onSync(365)} disabled={syncing}>
                            Bağlantıyı yeniden dene
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader
                title='Veri henüz çekilmedi'
                subheader='Bağlantı hazır. İlk çekim son 1 yılı aylık dilimlerle alır; sonrasında her gece son 7 gün kendiliğinden yenilenir.'
            />
            <CardContent className='flex flex-col gap-4'>
                {sync?.running ? (
                    <div className='flex flex-col gap-2'>
                        <Typography variant='body2' color='text.secondary'>
                            {sync.startDate} - {sync.endDate} aralığı çekiliyor: {sync.done}/{sync.total} dilim, {formatNumber(sync.rows)} satır
                        </Typography>
                        <LinearProgress variant='determinate' value={sync.total ? (sync.done / sync.total) * 100 : 0} />
                    </div>
                ) : null}
                {sync && !sync.running && sync.error ? (
                    <Typography variant='body2' color='error.main'>Son çekim hatası: {sync.error}</Typography>
                ) : null}
                <div className='flex flex-wrap gap-2'>
                    <Button variant='contained' color='primary' startIcon={<i className='ri-download-cloud-2-line' />} onClick={() => onSync(365)} disabled={syncing || Boolean(sync?.running)}>
                        Son 1 yılı çek
                    </Button>
                    <Button variant='outlined' color='primary' onClick={() => onSync(90)} disabled={syncing || Boolean(sync?.running)}>
                        Son 3 ayı çek
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

export default SetupCard
