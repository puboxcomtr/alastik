import fs from 'fs-extra'
import { consola } from 'consola'

export const updateAuthGuard = async () => {
  consola.start('Updating AuthGard file...')

  let AuthGuardFileContent = await fs.promises.readFile('src/hocs/AuthGuard.tsx', 'utf8')

  AuthGuardFileContent = AuthGuardFileContent.replace(/(ChildrenType) & { locale: Locale }/, '$1')
    .replace(/\{ children, locale \}/, '{ children }')
    .replace(/lang={locale}/, '')

  await fs.promises.writeFile('src/hocs/AuthGuard.tsx', AuthGuardFileContent)
  consola.success('Auth Guard file updated successfully\n')
}

export const updateGuestOnlyRoutes = async () => {
  consola.start('Updating AuthGard file...')

  let GuestOnlyRouteFileContent = await fs.promises.readFile('src/hocs/GuestOnlyRoute.tsx', 'utf8')

  GuestOnlyRouteFileContent = GuestOnlyRouteFileContent.replace(/(ChildrenType) & { lang: Locale }/, '$1')
    .replace(/\{ children, lang \}/, '{ children }')
    .replace(/lang={locale}/, '')

  await fs.promises.writeFile('src/hocs/GuestOnlyRoute.tsx', GuestOnlyRouteFileContent)
  consola.success('Guest Guard file updated successfully\n')
}
