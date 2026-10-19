import classnames from 'classnames'

import type { ChildrenType } from '@core/types'

import { horizontalLayoutClasses } from '@layouts/utils/layoutClasses'

const Navbar = ({ children }: ChildrenType) => {
  return (
    <div className={classnames(horizontalLayoutClasses.navbar, 'flex items-center justify-between is-full')}>
      {children}
    </div>
  )
}

export default Navbar
