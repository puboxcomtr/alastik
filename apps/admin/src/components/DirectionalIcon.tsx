'use client'

import { useTheme } from '@mui/material/styles'

import classnames from 'classnames'

type Props = {
  ltrIconClass: string
  rtlIconClass: string
  className?: string
}

const DirectionalIcon = (props: Props) => {
  const { ltrIconClass, rtlIconClass, className } = props

  const theme = useTheme()

  return (
    <i
      className={classnames(
        {
          [ltrIconClass]: theme.direction === 'ltr',
          [rtlIconClass]: theme.direction === 'rtl'
        },
        className
      )}
    />
  )
}

export default DirectionalIcon
