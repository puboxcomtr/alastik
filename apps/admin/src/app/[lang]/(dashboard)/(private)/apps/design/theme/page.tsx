import Grid from '@mui/material/Grid2'
import 'server-only'

import ThemeSettings from '@views/design/theme/ThemeSettings'

const ThemePage = () => {
  return (
    <Grid container spacing={6} justifyContent="center">
      <Grid size={{ xs: 12, md: 10 }}>
        <ThemeSettings />
      </Grid>
    </Grid>
  )
}

export default ThemePage