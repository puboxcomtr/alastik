'use client'

import { useState } from 'react'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid2'
import FormControl from '@mui/material/FormControl'
import Divider from '@mui/material/Divider'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'

const menuItems = [
    { id: 'tab1', label: 'Genel Ayarlar' },
    { id: 'tab2', label: 'Footer' },
    { id: 'tab3', label: 'Sosyal Ağlar' },
    { id: 'tab4', label: 'Slider Ayarları' },
    { id: 'tab5', label: 'Vitrin Ayarları' }
]

const ThemeSettings = () => {
    const [activeMenu, setActiveMenu] = useState('tab1')
    const [brandDisplayType, setBrandDisplayType] = useState('name')
    const [showcaseDisplayCount, setshowcaseDisplayCount] = useState('4')
    const [blogDisplayCount, setblogDisplayCount] = useState('4')
    const [isActive, setIsActive] = useState(true)
    const [isBrand, setIsBrand] = useState(true)
    const [isTax, setIsTax] = useState(false)
    const [isFacebook, setIsFacebook] = useState(false)
    const [isGoogle, setIsGoogle] = useState(true)
    const [isLazyLoad, setIsLazyLoad] = useState(true)

    /* Footer */
    const [footerMobile, setFooterMobile] = useState('accordion')
    const [seoTitle, setSeoTitle] = useState('Copyright © ALastik.com - Tüm Hakları Saklıdır.')
    const [newsletterTitle, setNewsletterTitle] = useState('HABERLER VE ÖZEL FIRSATLAR İÇİN E-POSTA ADRESİNİ KAYDET!')
    const [newsletterContent, setNewsletterContent] = useState('E-posta adresiniz')

    /* Sosyal Ağ */
    const [facebook, setFacebook] = useState('https://facebook.com/alastik')
    const [instagram, setInstagram] = useState('https://instagram.com/alastik')
    const [twitter, setTwitter] = useState('https://twitter.com/alastik')
    const [youtube, setYoutube] = useState('https://youtube.com/alastik')
    const [linkedin, setLinkedin] = useState('https://linkedin.com/alastik')
    const [whatsapp, setWhatsapp] = useState('(0505) 111 123 32 32')

    /* Stores */
    const [trendyol, setTrendyol] = useState('https://trendyol.com/alastik')
    const [hepsiburada, setHepsiburada] = useState('https://hepsiburada.com/alastik')
    const [pttavm, setPttavm] = useState('https://pttavm.com/alastik')
    const [pazarama, setPazarama] = useState('https://pazarama.com/alastik')
    const [n11, setN11] = useState('https://n11.com/alastik')
    const [idefix, setIdefix] = useState('https://idefix.com/alastik')

    /* Slider */
    const [homepage, setHomepage] = useState(true)
    const [sliderSelect, setSliderSelect] = useState('1')
    const [mobileSelect, setMobileSelect] = useState('2')
    const [autostart, setAutoStart] = useState(false)

    /* Showcase */
    const [showcaseFirst, setShowcaseFirst] = useState('1')
    const [showcasenameFirst, setShowcasenameFirst] = useState('Yaz Oto Lastikleri')
    const [showcasesubFirst, setShowcasesubFirst] = useState('A Lastikle Serin Sürüş')
    
    const [showcaseSecond, setShowcaseSecond] = useState('2')
    const [showcasenameSecond, setShowcasenameSecond] = useState('Kış Oto Lastikleri')
    const [showcasesubSecond, setShowcasesubSecond] = useState('A Lastikle Serin Sürüş')
    
    const [showcaseThird, setShowcaseThird] = useState('3')
    const [showcasenameThird, setShowcasenameThird] = useState('4 Mevsim Oto Lastikleri')
    const [showcasesubThird, setShowcasesubThird] = useState('A Lastikle Serin Sürüş')


    const renderContent = () => {
        switch (activeMenu) {
            case 'tab1':
                return (
                    <>
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <Typography variant='body2' className='text-base font-semibold'>
                                    Logo
                                </Typography>
                                <div className='w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 flex-shrink-0'>
                                    <Button variant='text' component='label' className='text-sm'>
                                        Yükle
                                        <input type='file' hidden accept='image/*' />
                                    </Button>
                                </div>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Varsayılan Katalog Görseli
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Resmi yüklenmemiş ürünler, kategoriler ve markalar için kullanabileceğiniz varsayılan görsel.

                                    </Typography>
                                </div>
                                <div className='w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 flex-shrink-0'>
                                    <Button variant='text' component='label' className='text-sm'>
                                        Yükle
                                        <input type='file' hidden accept='image/*' />
                                    </Button>
                                </div>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Marka Gösterim Tipi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Seçilen kategorilere bağlı olan markalar, buradaki seçiminize göre gösterilecektir.
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <Select
                                        value={brandDisplayType}
                                        onChange={(e) => setBrandDisplayType(e.target.value)}
                                    >
                                        <MenuItem value='name'>İsim</MenuItem>
                                        <MenuItem value='image'>Görsel</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Vitrinde Ürün Gösterim Adeti
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <Select
                                        value={showcaseDisplayCount}
                                        onChange={(e) => setshowcaseDisplayCount(e.target.value)}
                                    >
                                        <MenuItem value='4'>4</MenuItem>
                                        <MenuItem value='5'>5</MenuItem>
                                        <MenuItem value='6'>6</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Blog Sayfasında Gösterim Adeti
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <Select
                                        value={blogDisplayCount}
                                        onChange={(e) => setblogDisplayCount(e.target.value)}
                                    >
                                        <MenuItem value='4'>4</MenuItem>
                                        <MenuItem value='5'>5</MenuItem>
                                        <MenuItem value='6'>6</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Kategori Logolarının Gösterimi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Açık olduğunda kategori listelenen yerlerde, kategori logosu gösterilir.
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={isActive}
                                                onChange={(e) => setIsActive(e.target.checked)}
                                            />
                                        }
                                        label={isActive ? 'Aktif' : 'Pasif'}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Kategorideki Markaların Gösterimi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Bir kategoride ürünleri yer alan markalar, o kategorinin ürünleri listelenirken üst kısımda gösterilir.
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={isBrand}
                                                onChange={(e) => setIsBrand(e.target.checked)}
                                            />
                                        }
                                        label={isBrand ? 'Aktif' : 'Pasif'}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Sipariş aşamalarında KDV Gösterimi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Eğer seçenek aktifleştirilirse tüm ürünler KDV Dahil gösterilir.
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={isTax}
                                                onChange={(e) => setIsTax(e.target.checked)}
                                            />
                                        }
                                        label={isTax ? 'Aktif' : 'Pasif'}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Facebook Login Sistemi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Facebook üyeliği üzerinden sisteme üye olma özelliğidir.

                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={isFacebook}
                                                onChange={(e) => setIsFacebook(e.target.checked)}
                                            />
                                        }
                                        label={isFacebook ? 'Aktif' : 'Pasif'}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Google Hesabı ile Login Sistemi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Google hesabı üzerinden sisteme üye olma özelliğidir.
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={isGoogle}
                                                onChange={(e) => setIsGoogle(e.target.checked)}
                                            />
                                        }
                                        label={isGoogle ? 'Aktif' : 'Pasif'}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Jquery Lazy Load Eklentisi Kullanımı
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Siteniz üzerinde bulunan resim dosyalarını ziyaretçilerinize ilk yükleme anında göstermek yerine gezinti sırasında yüklenmesini sağlayarak sitenizin ilk açılış performansını artıran bir özelliktir.
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={isLazyLoad}
                                                onChange={(e) => setIsLazyLoad(e.target.checked)}
                                            />
                                        }
                                        label={isLazyLoad ? 'Aktif' : 'Pasif'}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>

                    </>
                )
            case 'tab2':
                return (
                    <>
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <Typography variant='body2' className='text-base font-semibold'>
                                    Footer Logo
                                </Typography>
                                <div className='w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 flex-shrink-0'>
                                    <Button variant='text' component='label' className='text-sm'>
                                        Yükle
                                        <input type='file' hidden accept='image/*' />
                                    </Button>
                                </div>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Footer SSL Resmi
                                    </Typography>
                                </div>
                                <div className='w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 flex-shrink-0'>
                                    <Button variant='text' component='label' className='text-sm'>
                                        Yükle
                                        <input type='file' hidden accept='image/*' />
                                    </Button>
                                </div>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Footer menülerinin mobil görünümü
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <Select
                                        value={footerMobile}
                                        onChange={(e) => setFooterMobile(e.target.value)}
                                    >
                                        <MenuItem value='accordion'>Akordiyon</MenuItem>
                                        <MenuItem value='list'>Liste</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        E-Bülten Başlığı
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={newsletterTitle}
                                        onChange={(e) => setNewsletterTitle(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        E-Bülten Metni
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={newsletterContent}
                                        onChange={(e) => setNewsletterContent(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Copyright Yazısı
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={seoTitle}
                                        onChange={(e) => setSeoTitle(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>

                    </>
                )
            case 'tab3':
                return (
                    <>
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Facebook Adresi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Bu alan boş bırakıldığında ikonu görünmeyecektir
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={facebook}
                                        onChange={(e) => setFacebook(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Instagram Adresi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Bu alan boş bırakıldığında ikonu görünmeyecektir
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={instagram}
                                        onChange={(e) => setInstagram(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Twitter Adresi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Bu alan boş bırakıldığında ikonu görünmeyecektir
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={twitter}
                                        onChange={(e) => setTwitter(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Youtube Adresi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Bu alan boş bırakıldığında ikonu görünmeyecektir
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={youtube}
                                        onChange={(e) => setYoutube(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Linkedin  Adresi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Bu alan boş bırakıldığında ikonu görünmeyecektir
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={linkedin}
                                        onChange={(e) => setLinkedin(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Whatsapp Adresi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Bu alan boş bırakıldığında ikonu görünmeyecektir
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-10 mt-10' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Trendyol Mağaza Adresi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Bu alan boş bırakıldığında linki gözükmeyecektir
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={trendyol}
                                        onChange={(e) => setTrendyol(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Hepsiburada Mağaza Adresi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Bu alan boş bırakıldığında linki gözükmeyecektir
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={hepsiburada}
                                        onChange={(e) => setHepsiburada(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        PTTAVM Mağaza Adresi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Bu alan boş bırakıldığında linki gözükmeyecektir
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={pttavm}
                                        onChange={(e) => setPttavm(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />

                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Pazarama Mağaza Adresi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Bu alan boş bırakıldığında linki gözükmeyecektir
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={pazarama}
                                        onChange={(e) => setPazarama(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        N11 Mağaza Adresi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Bu alan boş bırakıldığında linki gözükmeyecektir
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={n11}
                                        onChange={(e) => setN11(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>

                        <Divider className='mb-4' />

                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        İdefix Mağaza Adresi
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Bu alan boş bırakıldığında linki gözükmeyecektir
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={idefix}
                                        onChange={(e) => setIdefix(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                    </>
                )
            case 'tab4':
                return (
                    <>
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Varsayılan Masaüstü Slider
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Anasayfa slider alanında 'Tema Slider' yerine Tasarım Ayarları - Slider Yönetimi sayfasındaki 'default' sliderı kullanmak için 'Slider Yönetimi'ni seçebilirsiniz.
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={homepage}
                                                onChange={(e) => setHomepage(e.target.checked)}
                                            />
                                        }
                                        label={homepage ? 'Aktif' : 'Pasif'}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Slider Durumu
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Anasayfadaki slider seçim durumunu belirleyiniz.
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <Select
                                        value={sliderSelect}
                                        onChange={(e) => setSliderSelect(e.target.value)}
                                    >
                                        <MenuItem value='1'>Anasayfa Slider</MenuItem>
                                        <MenuItem value='2'>Mobile Slider</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Mobil Slider Durumu
                                    </Typography>
                                    <Typography variant='body2' color='text.secondary' className='font-light'>
                                        Anasayfadaki mobil slider seçim durumunu belirleyiniz.
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <Select
                                        value={mobileSelect}
                                        onChange={(e) => setMobileSelect(e.target.value)}
                                    >
                                        <MenuItem value='1'>Anasayfa Slider</MenuItem>
                                        <MenuItem value='2'>Mobile Slider</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Otomatik Başlasın mı?
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={autostart}
                                                onChange={(e) => setAutoStart(e.target.checked)}
                                            />
                                        }
                                        label={autostart ? 'Aktif' : 'Pasif'}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                    </>
                )
            case 'tab5':
                return (
                    <>
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Vitrin 1 Üst Başlık
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={showcasenameFirst}
                                        onChange={(e) => setShowcasenameFirst(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Vitrin 1 Üst Başlık
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={showcasesubFirst}
                                        onChange={(e) => setShowcasesubFirst(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Vitrin 1 Ürün Seçimi
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <Select
                                        value={showcaseFirst}
                                        onChange={(e) => setShowcaseFirst(e.target.value)}
                                    >
                                        <MenuItem value='1'>Anasayfa Vitrin1</MenuItem>
                                        <MenuItem value='2'>Ürün Vitrin2</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />

                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Vitrin 2 Üst Başlık
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={showcasenameSecond}
                                        onChange={(e) => setShowcasenameSecond(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Vitrin 2 Üst Başlık
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={showcasesubSecond}
                                        onChange={(e) => setShowcasesubSecond(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Vitrin 2 Ürün Seçimi
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <Select
                                        value={showcaseSecond}
                                        onChange={(e) => setShowcaseSecond(e.target.value)}
                                    >
                                        <MenuItem value='1'>Anasayfa Vitrin1</MenuItem>
                                        <MenuItem value='2'>Ürün Vitrin2</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                        </FormControl>
                        <Divider className='mb-4' />
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Vitrin 3 Üst Başlık
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={showcasenameThird}
                                        onChange={(e) => setShowcasenameThird(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Vitrin 3 Üst Başlık
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <TextField
                                        fullWidth
                                        value={showcasesubThird}
                                        onChange={(e) => setShowcasesubThird(e.target.value)}
                                    />
                                </FormControl>
                            </div>
                        </FormControl>
                        <FormControl fullWidth className='mb-4'>
                            <div className='flex justify-between items-center gap-4'>
                                <div className='flex flex-col'>
                                    <Typography variant='body2' className='text-base font-semibold'>
                                        Vitrin 3 Ürün Seçimi
                                    </Typography>
                                </div>
                                <FormControl className='w-1/2 flex-shrink-0'>
                                    <Select
                                        value={showcaseThird}
                                        onChange={(e) => setShowcaseThird(e.target.value)}
                                    >
                                        <MenuItem value='1'>Anasayfa Vitrin1</MenuItem>
                                        <MenuItem value='2'>Ürün Vitrin2</MenuItem>
                                        <MenuItem value='3'>Özel Vitrin2</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                        </FormControl>
                    </>
                )
        }
    }

    return (
        <Grid container spacing={6} justifyContent="center">
            <Grid size={{ xs: 12, md: 8 }}>
                <Grid container spacing={6}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <Card className='p-4'>
                            <Typography variant='h6' className='mb-4'>Tema Ayarları</Typography>
                            <div className='flex flex-col gap-2'>
                                {menuItems.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => setActiveMenu(item.id)}
                                        className={`p-3 rounded cursor-pointer transition-all ${activeMenu === item.id
                                            ? 'bg-pink-50 text-pink-600'
                                            : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        {item.label}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Card className='p-6'>
                            {renderContent()}
                            <Divider className='mb-4' />
                            <Button
                                type='submit'
                                variant='contained'
                            >
                                Ayarları Kaydet
                            </Button>
                        </Card>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    )
}

export default ThemeSettings