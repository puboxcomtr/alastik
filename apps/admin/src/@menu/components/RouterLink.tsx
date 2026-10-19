'use client'

import { forwardRef } from 'react'

import Link from 'next/link'
import type { LinkProps } from 'next/link'

import type { ChildrenType } from '../types'

type RouterLinkProps = LinkProps &
  Partial<ChildrenType> & {
    className?: string
  }

export const RouterLink = forwardRef((props: RouterLinkProps, ref: any) => {
  const { href, className, ...other } = props

  return (
    <Link ref={ref} href={href} className={className} {...other}>
      {props.children}
    </Link>
  )
})
