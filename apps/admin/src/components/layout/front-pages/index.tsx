import type { ChildrenType } from '@core/types'

import Footer from '@components/layout/front-pages/Footer'
import Header from '@components/layout/front-pages/Header'

import { getServerMode } from '@core/utils/serverHelpers'

import { frontLayoutClasses } from '@layouts/utils/layoutClasses'

const FrontLayout = async ({ children }: ChildrenType) => {
  const mode = await getServerMode()

  return (
    <div className={frontLayoutClasses.root}>
      <Header mode={mode} />
      {children}
      <Footer />
    </div>
  )
}

export default FrontLayout
