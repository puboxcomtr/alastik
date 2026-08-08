import Grid from '@mui/material/Grid2'
import 'server-only'

import MediaGallery from '@views/media/MediaGallery'

const MediaPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                <MediaGallery />
            </Grid>
        </Grid>
    )
}

export default MediaPage
