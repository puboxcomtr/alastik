'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import List from '@mui/material/List'
import Divider from '@mui/material/Divider'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'

interface Payment {
    method: string
    methodText: string
    status: string
    statusText: string
    gateway?: string
    installment?: number
    referenceCode?: string
}

interface PaymentInformationProps {
    payment: Payment
    isGuest: boolean
    ipAddress?: string
    shippingMethod?: string
}

const listItemSx = {
    display: 'flex',
    flexDirection: 'row',
    gap: 2,
    '& .MuiListItemText-primary': { minWidth: 150, flex: 'none' },
    '& .MuiListItemText-secondary': { fontWeight: 'normal', color: 'black' }
}

const PaymentInformation = ({ payment, isGuest, ipAddress, shippingMethod }: PaymentInformationProps) => {
    return (
        <Card className='mt-5'>
            <CardHeader title='Ödeme Bilgileri' />
            <CardContent>
                <List component='nav'>
                    <ListItem>
                        <ListItemText
                            primary='Ödeme Türü:'
                            secondary={
                                [
                                    payment?.methodText,
                                    payment?.gateway ? `(${payment.gateway.charAt(0).toUpperCase() + payment.gateway.slice(1)})` : null,
                                    payment?.installment && payment.installment > 1 ? `- ${payment.installment} Taksit` : null
                                ].filter(Boolean).join(' ') || '-'
                            }
                            sx={listItemSx}
                        />
                    </ListItem>
                    <Divider />
                    <ListItem>
                        <ListItemText
                            primary='Ödeme Durumu:'
                            secondary={payment?.statusText || '-'}
                            sx={listItemSx}
                        />
                    </ListItem>
                    {ipAddress && (
                        <>
                            <Divider />
                            <ListItem>
                                <ListItemText
                                    primary='IP Adresi:'
                                    secondary={ipAddress}
                                    sx={listItemSx}
                                />
                            </ListItem>
                        </>
                    )}
                    <Divider />
                    <ListItem>
                        <ListItemText
                            primary='Üye Grubu:'
                            secondary={isGuest ? 'Misafir' : 'Üye'}
                            sx={listItemSx}
                        />
                    </ListItem>
                    {shippingMethod && (
                        <>
                            <Divider />
                            <ListItem>
                                <ListItemText
                                    primary='Kargo Firması:'
                                    secondary={shippingMethod}
                                    sx={listItemSx}
                                />
                            </ListItem>
                        </>
                    )}
                </List>
            </CardContent>
        </Card>
    )
}

export default PaymentInformation