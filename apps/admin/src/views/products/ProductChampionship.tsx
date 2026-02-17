'use client'

import { useState, useEffect } from 'react'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import { toast } from 'react-toastify'

import type { ProductType } from '@/types/apps/productTypes'
import { API_ENDPOINTS, fetchAPI } from '@/libs/api'

export interface ProductChampionshipProps {
    product: ProductType
}

interface Championship {
    _id: string
    productKey: string
    name: string
    rank: number
}

const ProductChampionship = ({ product }: ProductChampionshipProps) => {
    const [allChampionships, setAllChampionships] = useState<Championship[]>([])
    const [assignedChampionships, setAssignedChampionships] = useState<Championship[]>([])
    const [loading, setLoading] = useState(false)

    const productKey = product.id || ''

    useEffect(() => {
        loadData()
    }, [productKey])

    const loadData = async () => {
        try {
            const allRes = await fetchAPI(API_ENDPOINTS.championships.list())
            setAllChampionships(allRes?.data || [])

            if (productKey) {
                const assignedRes = await fetchAPI(API_ENDPOINTS.championships.product(productKey))
                setAssignedChampionships(assignedRes?.data || [])
            }
        } catch (err) {
            console.error('Championship yükleme hatası:', err)
        }
    }

    const availableChampionships = allChampionships.filter(
        c => !c.productKey || c.productKey === productKey
    )

    const handleAssign = async (championshipId: string) => {
        if (!championshipId) return
        setLoading(true)
        try {
            const res = await fetchAPI(API_ENDPOINTS.championships.assign(championshipId), {
                method: 'PUT',
                body: JSON.stringify({ productKey })
            })
            if (res?.success) {
                toast.success('Lastik ödülü bağlantısı ürüne eklendi')
                loadData()
            }
        } catch (err) {
            toast.error('Bir hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const handleUnassign = async (championshipId: string) => {
        setLoading(true)
        try {
            const res = await fetchAPI(API_ENDPOINTS.championships.unassign(championshipId), {
                method: 'PUT'
            })
            if (res?.success) {
                toast.success('Lastik ödülü bağlantısı üründen kaldırıldı')
                loadData()
            }
        } catch (err) {
            toast.error('Bir hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader title='Lastik Ödülleri' />
            <CardContent>
                <div className='flex flex-col gap-4'>
                    <FormControl fullWidth>
                        <InputLabel>Ödül Ekle</InputLabel>
                        <Select
                            label='Ödül Ekle'
                            value=''
                            onChange={(e) => handleAssign(e.target.value)}
                            disabled={loading || availableChampionships.length === 0}
                        >
                            {availableChampionships
                                .filter(c => !assignedChampionships.find(a => a._id === c._id))
                                .map(c => (
                                    <MenuItem key={c._id} value={c._id}>
                                        {c.name}
                                    </MenuItem>
                                ))}
                        </Select>
                    </FormControl>
                    {assignedChampionships.length > 0 && (
                        <Box display="flex" flexWrap="wrap" gap={1}>
                            {assignedChampionships.map(c => (
                                <Chip
                                    key={c._id}
                                    label={`${c.name}`}
                                    onDelete={() => handleUnassign(c._id)}
                                    disabled={loading}
                                />
                            ))}
                        </Box>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default ProductChampionship