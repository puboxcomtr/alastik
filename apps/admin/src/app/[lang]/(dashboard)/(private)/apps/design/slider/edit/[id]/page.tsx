import { Suspense } from 'react'
import Grid from '@mui/material/Grid2'
import CircularProgress from '@mui/material/CircularProgress'
import EditSliderForm from '@views/design/slider/EditSliderForm'

const EditSliderPage = ({ params }: { params: { id: string } }) => {
    return (
        <Grid container spacing={6} justifyContent="center">
            <Grid size={{ xs: 12 }}>
                <Suspense fallback={
                    <div className="flex justify-center items-center p-10">
                        <CircularProgress />
                    </div>
                }>
                    <EditSliderForm sliderId={params.id} />
                </Suspense>
            </Grid>
        </Grid>
    )
}

export default EditSliderPage