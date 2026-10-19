'use client'

import { forwardRef } from 'react'
import type { ComponentProps, ForwardedRef, MouseEvent } from 'react'

import NextLink from 'next/link'

type Props = Omit<ComponentProps<typeof NextLink>, 'href' | 'onClick'> & {
  href?: string
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}

const Link = (props: Props, ref: ForwardedRef<HTMLAnchorElement>) => {
  const { href, onClick, ...rest } = props

  return (
    <NextLink
      ref={ref}
      {...rest}
      href={href || '/'}
      onClick={onClick ? e => onClick(e) : !href ? e => e.preventDefault() : undefined}
    />
  )
}

export default forwardRef(Link)
