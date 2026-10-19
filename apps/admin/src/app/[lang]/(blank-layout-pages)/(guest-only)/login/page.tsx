import type { Metadata } from 'next'

import Login from '@views/Login'

import { getServerMode } from '@/@core/utils/serverHelpers'

export const metadata: Metadata = {
  title: 'Yönetici Paneli - ALastik.com',
  description: 'Yönetici Paneli Giriş - ALastik.com'
}

const LoginPage = async () => {
  const mode = await getServerMode()

  return <Login mode={mode} />
}

export default LoginPage
