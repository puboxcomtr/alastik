import type { ChangeEvent, ReactNode } from 'react'

import type { Grid2Props } from '@mui/material/Grid2'

import type { ThemeColor } from '@core/types'

export type CustomInputHorizontalData = {
  value: string
  content?: ReactNode
  isSelected?: boolean
} & (
  | {
      meta: ReactNode
      title: ReactNode
    }
  | {
      meta?: never
      title?: never
    }
  | {
      title: ReactNode
      meta?: never
    }
)
export type CustomInputHorizontalProps = {
  name: string
  color?: ThemeColor
  gridProps?: Grid2Props
  data: CustomInputHorizontalData
} & (
  | {
      type: 'checkbox'
      selected: string[]
      handleChange: (value: string) => void
    }
  | {
      type: 'radio'
      selected: string
      handleChange: (value: string | ChangeEvent<HTMLInputElement>) => void
    }
)

export type CustomInputVerticalData = {
  value: string
  title?: ReactNode
  content?: ReactNode
  isSelected?: boolean
  asset?: ReactNode
}
export type CustomInputVerticalProps = {
  name: string
  color?: ThemeColor
  gridProps?: Grid2Props
  data: CustomInputVerticalData
} & (
  | {
      type: 'checkbox'
      selected: string[]
      handleChange: (value: string) => void
    }
  | {
      type: 'radio'
      selected: string
      handleChange: (value: string | ChangeEvent<HTMLInputElement>) => void
    }
)

export type CustomInputImgData = {
  alt?: string
  value: string
  img: ReactNode
  isSelected?: boolean
}
export type CustomInputImgProps = {
  name: string
  color?: ThemeColor
  gridProps: Grid2Props
  data: CustomInputImgData
} & (
  | {
      type: 'checkbox'
      selected: string[]
      handleChange: (value: string) => void
    }
  | {
      type: 'radio'
      selected: string
      handleChange: (value: string | ChangeEvent<HTMLInputElement>) => void
    }
)
