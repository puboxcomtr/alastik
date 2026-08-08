import { Suspense } from 'react'

import Grid from '@mui/material/Grid2'
import 'server-only'

import MenuTable from '@views/design/menu/MenuTable'

const MenuPage = () => {
    return (
        <Grid container spacing={6}>
            <Grid size={{ xs: 12 }}>
                {/* useSearchParams kullanan client bileşen Suspense ister */}
                <Suspense>
                    <MenuTable />
                </Suspense>
            </Grid>
        </Grid>
    )
}

export default MenuPage