'use client'

import Link from 'next/link'

import classnames from 'classnames'

import useVerticalNav from '@menu/hooks/useVerticalNav'

import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const FooterContent = () => {
  const { isBreakpointReached } = useVerticalNav()

  return (
    <div
      className={classnames(verticalLayoutClasses.footerContent, 'flex items-center justify-between flex-wrap gap-4')}
    >
      <p>
        <span>{`© ${new Date().getFullYear()}, Tüm Hakları Saklıdır `}</span>
        <span>{`❤️`}</span>
        <Link href='https://alastik.com' target='_blank' className='text-primary'>
          ALastik.com
        </Link>
      </p>
    </div>
  )
}

export default FooterContent
