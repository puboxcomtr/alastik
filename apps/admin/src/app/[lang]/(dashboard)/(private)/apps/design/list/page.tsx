'use client'

import { useRouter } from 'next/navigation'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'

const DesignSettings = () => {
    const router = useRouter()

    const design = [
        {
            icon: 'ri-settings-3-line',
            title: 'Tema Ayarları',
            description: 'Site temel ayarlarınızı yönetin.',
            href: '/tr/apps/design/theme',
            color: '#2e263db3'
        },
        {
            icon: 'ri-search-line',
            title: 'Slider',
            description: 'Sliderları düzenleyin.',
            href: '/tr/apps/design/slider',
            color: '#2e263db3'
        },
        {
            icon: 'ri-bank-card-line',
            title: 'Menü Yönetimi',
            description: 'Menüleri düzenleyin.',
            href: '/tr/apps/design/menu',
            color: '#2e263db3'
        },
        {
            icon: 'ri-translate-2',
            title: 'Banner',
            description: 'Bannerları yönetin.',
            href: '/tr/apps/design/banner',
            color: '#2e263db3'
        },
        {
            icon: 'ri-building-line',
            title: 'Popup ve Bar',
            description: 'Popup ve Bar tasarımlarını yönetin.',
            href: '/tr/apps/design/popup',
            color: '#2e263db3'
        },
        {
            icon: 'ri-file-text-line',
            title: 'Vitrin Blokları',
            description: 'Vitrin bloklarını yönetin.',
            href: '/tr/apps/design/showcase/list',
            color: '#2e263db3'
        }
    ]

    return (
        <div>

            <Grid container spacing={6} justifyContent="center">
                <Grid size={{ xs: 12, md: 8 }}>
                    <div className='mb-6'>
                        <Typography variant='h4' className='mb-1'>
                            Tasarım Ayarları
                        </Typography>
                    </div>
                    <Card>
                        <Grid container>
                            {design.map((design, index) => (
                                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                                    <div
                                        className='flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-all'
                                        onClick={() => router.push(design.href)}
                                    >
                                        <div
                                            className='flex items-center justify-center w-12 h-12 rounded-lg'
                                            style={{ backgroundColor: `${design.color}15` }}
                                        >
                                            <i
                                                className={`${design.icon} text-2xl`}
                                                style={{ color: design.color }}
                                            />
                                        </div>
                                        <div className='flex-1'>
                                            <Typography
                                                variant='h6'
                                                className='mb-1'
                                                style={{ color: design.color }}
                                            >
                                                {design.title}
                                            </Typography>
                                            <Typography variant='body2' color='text.secondary'>
                                                {design.description}
                                            </Typography>
                                        </div>
                                    </div>
                                </Grid>
                            ))}
                        </Grid>
                    </Card>
                </Grid>
            </Grid>
        </div>
    )
}

export default DesignSettings