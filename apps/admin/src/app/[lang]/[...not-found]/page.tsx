import type { Locale } from '@configs/i18n'
import { i18n } from '@configs/i18n'

const NotFoundPage = async (props: { params: Promise<{ lang: Locale }> }) => {
  const params = await props.params

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>404 - Sayfa Bulunamadı</h1>
    </div>
  )
}

export default NotFoundPage