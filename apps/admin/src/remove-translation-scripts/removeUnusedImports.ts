import { exec as execCallback } from 'child_process'
import { promisify } from 'util'

import fs from 'fs-extra'
import { consola } from 'consola'

const exec = promisify(execCallback)

export const updateEslintConfig = async () => {
  const eslintConfigPath = '../../.eslintrc.js'

  const eslintConfigModule = await import(eslintConfigPath)
  const eslintConfig = eslintConfigModule.default

  eslintConfig.plugins = eslintConfig.plugins || []

  if (!eslintConfig.plugins.includes('unused-imports')) {
    eslintConfig.plugins.push('unused-imports')
  }

  eslintConfig.rules = eslintConfig.rules || {}
  eslintConfig.rules['@typescript-eslint/no-unused-vars'] = 'off'
  eslintConfig.rules['unused-imports/no-unused-imports'] = 'error'

  fs.writeFileSync('.eslintrc.js', `module.exports = ${JSON.stringify(eslintConfig, null, 2)}`)
  console.log('Updated .eslintrc.js successfully.')
}

export const reverseEslintConfig = async () => {
  consola.log('Reverse the eslint-plugin-unused-imports...')

  const packageManager = fs.existsSync('yarn.lock')
    ? 'yarn uninstall eslint-plugin-unused-imports'
    : fs.existsSync('pnpm-lock.yaml')
      ? 'pnpm uninstall eslint-plugin-unused-imports'
      : 'npm run uninstall eslint-plugin-unused-imports'

  await exec(packageManager).then(() => {
    consola.success('eslint-plugin-unused-imports uninstalled successfully\n')
  })

  const eslintConfigPath = '../../.eslintrc.js'

  const eslintConfigModule = await import(eslintConfigPath)
  const eslintConfig = eslintConfigModule.default

  eslintConfig.plugins = eslintConfig.plugins || []

  if (eslintConfig.plugins.includes('unused-imports')) {
    eslintConfig.plugins = eslintConfig.plugins.filter((plugin: string) => plugin !== 'unused-imports')
  }

  eslintConfig.rules = eslintConfig.rules || {}

  eslintConfig.rules['@typescript-eslint/no-unused-vars'] = 'error'

  if (eslintConfig.rules['unused-imports/no-unused-imports']) {
    delete eslintConfig.rules['unused-imports/no-unused-imports']
  }

  fs.writeFileSync('.eslintrc.js', `module.exports = ${JSON.stringify(eslintConfig, null, 2)}`)
  console.log('Updated .eslintrc.js successfully.')
}
