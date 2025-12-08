'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

/* Components */
import PageForm from '@/views/pages/edit/[id]/PageForm'

/* API */
import { getPageById, type PageType } from '@/utils/api/pages' 

/* MUI */
import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'

const EditPage = () => {
    const params = useParams()
    const pageId = params.id as string

    const [page, setPage] = useState<PageType | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadPage = async () => {
            try {
                setLoading(true)
                const data = await getPageById(pageId)
                setPage(data)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Sayfa yüklenemedi')
            } finally {
                setLoading(false)
            }
        }

        if (pageId) {
            loadPage()
        }
    }, [pageId])

    if (loading) {
        return (
            <Box display='flex' justifyContent='center' alignItems='center' minHeight='400px'>
                <CircularProgress />
            </Box>
        )
    }

    if (error) {
        return (
            <Alert severity='error' sx={{ mb: 4 }}>
                {error}
            </Alert>
        )
    }

    if (!page) {
        return (
            <Alert severity='warning' sx={{ mb: 4 }}>
                Sayfa bulunamadı
            </Alert>
        )
    }

    return <PageForm page={page} isEdit={true} />
}

export default EditPage