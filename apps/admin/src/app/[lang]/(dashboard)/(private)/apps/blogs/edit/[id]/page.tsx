'use client'

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import { getBlogById } from '@/utils/api/blogs'
import BlogForm from '@/views/blogs/add/BlogForm'

type Props = {
    params: { id: string }
}

/**
 * Veri tarayıcı tarafında çekilir: admin API'si oturum anahtarı ister,
 * sunucu bileşeninde bu anahtar bulunmadığı için istek yetkisiz kalıyordu.
 */
const BlogEdit = ({ params }: Props) => {
    const [blog, setBlog] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const yukle = async () => {
            try {
                setLoading(true)
                setBlog(await getBlogById(params.id))
            } catch (err: any) {
                setError(err?.message || 'Blog yüklenemedi')
            } finally {
                setLoading(false)
            }
        }

        yukle()
    }, [params.id])

    if (loading) {
        return (
            <Box display='flex' justifyContent='center' alignItems='center' minHeight='400px'>
                <CircularProgress />
            </Box>
        )
    }

    if (error || !blog) {
        return (
            <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center' minHeight='400px' gap={1}>
                <Typography variant='h6'>Blog yazısı açılamadı</Typography>
                <Typography color='text.secondary'>{error || 'Kayıt bulunamadı'}</Typography>
            </Box>
        )
    }

    return <BlogForm blog={blog} isEdit={true} />
}

export default BlogEdit
