'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import List from '@mui/material/List'
import Divider from '@mui/material/Divider'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'

interface AddressSnapshot {
    addressName?: string
    invoiceType?: string
    fullName?: string
    tcNo?: string
    companyName?: string
    taxOffice?: string
    taxNo?: string
    authorizedPerson?: string
    email?: string
    phone?: string
    cityName?: string
    districtName?: string
    neighborhoodName?: string
    street?: string
    buildingNo?: string
    floor?: string
    apartmentNo?: string
    addressNote?: string
}

import { getSiteLabel } from '@/utils/activeSite'

const listItemSx = {
    display: 'flex',
    flexDirection: 'row',
    gap: 2,
    '& .MuiListItemText-primary': { minWidth: 150, flex: 'none' },
    '& .MuiListItemText-secondary': { fontWeight: 'normal', color: 'black' }
}

const CustomerInformation = ({ shippingAddress, billingAddress, customerNote, site }: CustomerInformationProps) => {

    const formatAddress = (address: AddressSnapshot) => {
        if (!address) return '-'
        const parts = [
            address.street,
            address.buildingNo ? `No: ${address.buildingNo}` : null,
            address.floor ? `Kat: ${address.floor}` : null,
            address.apartmentNo ? `Daire: ${address.apartmentNo}` : null,
            address.neighborhoodName,
            address.districtName,
            address.cityName
        ].filter(Boolean)
        return parts.join(', ') || '-'
    }

    return (
        <>
            <Card className='mt-5' style={{ backgroundColor: '#f6f7fb' }}>
                <CardHeader title='Teslimat Bilgileri' />
                <CardContent>
                    <List component='nav'>
                        <ListItem>
                            <ListItemIcon>
                                <i className="ri-user-line text-xl"></i>
                            </ListItemIcon>
                            <ListItemText
                                primary='Adı Soyadı:'
                                secondary={shippingAddress?.fullName || shippingAddress?.authorizedPerson || '-'}
                                sx={listItemSx}
                            />
                        </ListItem>
                        {shippingAddress?.email && (
                            <>
                                <Divider />
                                <ListItem>
                                    <ListItemIcon>
                                        <i className="ri-mail-line text-xl"></i>
                                    </ListItemIcon>
                                    <ListItemText
                                        primary='Email Adresi:'
                                        secondary={shippingAddress.email}
                                        sx={listItemSx}
                                    />
                                </ListItem>
                            </>
                        )}
                        <Divider />
                        <ListItem>
                            <ListItemIcon>
                                <i className="ri-phone-line text-xl"></i>
                            </ListItemIcon>
                            <ListItemText
                                primary='Telefon:'
                                secondary={shippingAddress?.phone || '-'}
                                sx={listItemSx}
                            />
                        </ListItem>
                        <Divider />
                        <ListItem>
                            <ListItemIcon>
                                <i className="ri-map-pin-2-line text-xl"></i>
                            </ListItemIcon>
                            <ListItemText
                                primary='Teslimat Adresi:'
                                secondary={formatAddress(shippingAddress)}
                                sx={listItemSx}
                            />
                        </ListItem>
                        {shippingAddress?.addressNote && (
                            <>
                                <Divider />
                                <ListItem>
                                    <ListItemIcon>
                                        <i className="ri-sticky-note-line text-xl"></i>
                                    </ListItemIcon>
                                    <ListItemText
                                        primary='Adres Notu:'
                                        secondary={shippingAddress.addressNote}
                                        sx={listItemSx}
                                    />
                                </ListItem>
                            </>
                        )}
                        {customerNote && (
                            <>
                                <Divider />
                                <ListItem>
                                    <ListItemIcon>
                                        <i className="ri-information-line text-xl"></i>
                                    </ListItemIcon>
                                    <ListItemText
                                        primary='Sipariş Notu:'
                                        secondary={customerNote}
                                        sx={listItemSx}
                                    />
                                </ListItem>
                            </>
                        )}
                        {site && (
                            <>
                                <Divider />
                                <ListItem>
                                    <ListItemIcon>
                                        <i className="ri-global-line text-xl"></i>
                                    </ListItemIcon>
                                    <ListItemText
                                        primary='Kaynak:'
                                        secondary={getSiteLabel(site)}
                                        sx={listItemSx}
                                    />
                                </ListItem>
                            </>
                        )}
                    </List>
                </CardContent>
            </Card>
            <Card className='mt-5' style={{ backgroundColor: '#f6f7fb' }}>
                <CardHeader title='Fatura Bilgileri' />
                <CardContent>
                    <List component='nav'>
                        <ListItem>
                            <ListItemText
                                primary='Fatura Tipi:'
                                secondary={billingAddress?.invoiceType === 'corporate' ? 'Kurumsal' : 'Bireysel'}
                                sx={listItemSx}
                            />
                        </ListItem>

                        {billingAddress?.invoiceType === 'individual' ? (
                            <>
                                <Divider />
                                <ListItem>
                                    <ListItemText
                                        primary='Adı Soyadı:'
                                        secondary={billingAddress?.fullName || '-'}
                                        sx={listItemSx}
                                    />
                                </ListItem>
                                {billingAddress?.tcNo && (
                                    <>
                                        <Divider />
                                        <ListItem>
                                            <ListItemText
                                                primary='TC Kimlik No:'
                                                secondary={billingAddress.tcNo}
                                                sx={listItemSx}
                                            />
                                        </ListItem>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <Divider />
                                <ListItem>
                                    <ListItemText
                                        primary='Şirket Ünvanı:'
                                        secondary={billingAddress?.companyName || '-'}
                                        sx={listItemSx}
                                    />
                                </ListItem>
                                <Divider />
                                <ListItem>
                                    <ListItemText
                                        primary='Vergi Dairesi:'
                                        secondary={billingAddress?.taxOffice || '-'}
                                        sx={listItemSx}
                                    />
                                </ListItem>
                                <Divider />
                                <ListItem>
                                    <ListItemText
                                        primary='Vergi Numarası:'
                                        secondary={billingAddress?.taxNo || '-'}
                                        sx={listItemSx}
                                    />
                                </ListItem>
                                {billingAddress?.authorizedPerson && (
                                    <>
                                        <Divider />
                                        <ListItem>
                                            <ListItemText
                                                primary='Yetkili Kişi:'
                                                secondary={billingAddress.authorizedPerson}
                                                sx={listItemSx}
                                            />
                                        </ListItem>
                                    </>
                                )}
                            </>
                        )}

                        <Divider />
                        <ListItem>
                            <ListItemText
                                primary='Email:'
                                secondary={billingAddress?.email || '-'}
                                sx={listItemSx}
                            />
                        </ListItem>
                        <Divider />
                        <ListItem>
                            <ListItemText
                                primary='Telefon:'
                                secondary={billingAddress?.phone || '-'}
                                sx={listItemSx}
                            />
                        </ListItem>
                        <Divider />
                        <ListItem>
                            <ListItemText
                                primary='Fatura Adresi:'
                                secondary={formatAddress(billingAddress)}
                                sx={listItemSx}
                            />
                        </ListItem>
                    </List>
                </CardContent>
            </Card>
        </>
    )
}

export default CustomerInformation