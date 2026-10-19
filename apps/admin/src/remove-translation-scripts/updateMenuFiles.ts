import fs from 'fs-extra'
import { consola } from 'consola'

const staticMenuFiles = [
  'src/components/layout/vertical/VerticalMenu.tsx',
  'src/components/layout/horizontal/HorizontalMenu.tsx'
]

const menuDataFiles = ['src/data/navigation/verticalMenuData.tsx', 'src/data/navigation/horizontalMenuData.tsx']

const removeTranslationInNavigation = async (path: string) => {
  consola.start('Removing translation in navigation files...')
  let fileContent = await fs.readFile(path, 'utf8')

  fileContent = fileContent.replace(/href={`\/\$\{locale\}\/(.*?)`}/g, (match: string, p1: string) => {
    if (p1.includes('${')) {
      return `href={\`/${p1}\`}`
    } else {
      return `href='/${p1}'`
    }
  })

  fileContent = fileContent
    .replace(/label=\{dictionary\['navigation'\]\.(\w+)\}/g, "label='$1'")
    .replace(/\{dictionary\['navigation'\]\.(\w+)\}/g, '$1')
    .replace(/\${locale}\//g, '')
    .replace(/const params\s.*/, '')
    .replace(/const {.*=\sparams/, '')

  await fs.writeFile(path, fileContent)
  consola.success('Removed translation in navigation files successfully\n')
}

const removeFromMenuData = async (path: string) => {
  consola.start('Removing translation in menu data files...')

  let fileContent = await fs.readFile(path, 'utf8')

  fileContent = fileContent.replace(/label: dictionary\['navigation'\]\.(\w+)/g, "label: '$1'")

  await fs.writeFile(path, fileContent)

  consola.success('Removed translation in menu data files successfully\n')
}

export const updateMenuFiles = async () => {
  for (const path of staticMenuFiles) {
    await removeTranslationInNavigation(path)
  }

  for (const path of menuDataFiles) {
    await removeFromMenuData(path)
  }
}
