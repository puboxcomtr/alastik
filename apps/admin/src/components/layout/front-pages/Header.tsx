'use client'

import { useState } from 'react'

import Link from 'next/link'

import IconButton from '@mui/material/IconButton'
import useMediaQuery from '@mui/material/useMediaQuery'
import useScrollTrigger from '@mui/material/useScrollTrigger'
import type { Theme } from '@mui/material/styles'

import classnames from 'classnames'

import type { Mode } from '@core/types'

import Logo from '@components/layout/shared/Logo'

import { frontLayoutClasses } from '@layouts/utils/layoutClasses'


const Header = ({ mode }: { mode: Mode }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const isBelowLgScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'))

  const trigger = useScrollTrigger({
    threshold: 0,
    disableHysteresis: true
  })

  return (
    <header className={classnames(frontLayoutClasses.header, styles.header)}>
      <div className={classnames(frontLayoutClasses.navbar, styles.navbar, { [styles.headerScrolled]: trigger })}>
        <div className={classnames(frontLayoutClasses.navbarContent, styles.navbarContent)}>
          {isBelowLgScreen ? (
            <div className='flex items-center gap-2 sm:gap-4'>
              <IconButton onClick={() => setIsDrawerOpen(true)} className='-mis-2'>
                <i className='ri-menu-line text-textPrimary' />
              </IconButton>
              <Link href='/front-pages/landing-page'>
                <Logo />
              </Link>
              <FrontMenu mode={mode} isDrawerOpen={isDrawerOpen} setIsDrawerOpen={setIsDrawerOpen} />
            </div>
          ) : (
            <div className='flex items-center gap-10'>
              <Link href='/front-pages/landing-page'>
                <Logo />
              </Link>
              <FrontMenu mode={mode} isDrawerOpen={isDrawerOpen} setIsDrawerOpen={setIsDrawerOpen} />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
