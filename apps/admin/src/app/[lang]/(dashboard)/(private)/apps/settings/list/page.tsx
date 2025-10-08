'use client'

import { useRouter } from 'next/navigation'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'

const SettingsList = () => {
    const router = useRouter()

    const settings = [
        {
            icon: 'ri-settings-3-line',
            title: 'Ek Ayarlar',
            description: 'Site temel ayarlarınızı yönetin.',
            href: '/tr/apps/settings/general',
            color: '#EA5455'
        },
        {
            icon: 'ri-search-line',
            title: 'SEO Ayarları',
            description: 'Arama motoru ayarlarınızı ve takip kodlarınızı düzenleyin.',
            href: '/tr/apps/settings/seo',
            color: '#EA5455'
        },
        {
            icon: 'ri-bank-card-line',
            title: 'Ödeme Ayarları',
            description: 'Ödeme yöntemlerinizi seçin ve ödeme ayarlarınızı yönetin.',
            href: '/tr/apps/settings/payment',
            color: '#EA5455'
        },
        {
            icon: 'ri-translate-2',
            title: 'Dil Ayarları',
            description: 'Sitenizde yer alan içeriklerinizi düzenleyin.',
            href: '/tr/apps/settings/language',
            color: '#EA5455'
        },
        {
            icon: 'ri-building-line',
            title: 'Tanımlamalar',
            description: 'Kurumsal bilgilerinizi satış sözleşmelerini düzenleyin.',
            href: '/tr/apps/settings/definitions',
            color: '#EA5455'
        },
        {
            icon: 'ri-file-text-line',
            title: 'Dosya Yönetimi',
            description: 'Özel dosya ve klasörlerinizi yönetin.',
            href: '/tr/apps/settings/files',
            color: '#EA5455'
        }
    ]

    return (
        <div>
            <div className='mb-6'>
                <Typography variant='h4' className='mb-1'>
                    Genel Ayarlar
                </Typography>
            </div>

            <Card>
                <div className='p-6'>
                    <Grid container spacing={6}>
                        {settings.map((setting, index) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                                <div
                                    className='flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-all'
                                    onClick={() => router.push(setting.href)}
                                >
                                    <div
                                        className='flex items-center justify-center w-12 h-12 rounded-lg'
                                        style={{ backgroundColor: `${setting.color}15` }}
                                    >
                                        <i
                                            className={`${setting.icon} text-2xl`}
                                            style={{ color: setting.color }}
                                        />
                                    </div>
                                    <div className='flex-1'>
                                        <Typography
                                            variant='h6'
                                            className='mb-1'
                                            style={{ color: setting.color }}
                                        >
                                            {setting.title}
                                        </Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                            {setting.description}
                                        </Typography>
                                    </div>
                                </div>
                            </Grid>
                        ))}
                    </Grid>
                </div>
            </Card>
        </div>
    )
}

export default SettingsList