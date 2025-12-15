'use client'

// React Imports
import { useState } from 'react'

// MUI Imports
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import Avatar from '@mui/material/Avatar'

// Third-party Imports
import classnames from 'classnames'

// Component Imports
import Details from './Details'
import Seo from './Seo'
import Submit from './Submit'

// Styled Component Imports
import StepperWrapper from '@core/styles/stepper'

type CreateAppProps = {
  open: boolean
  setOpen: (open: boolean) => void
}

type stepperProps = {
  icon: string
  title: string
  active?: boolean
}

const steps: stepperProps[] = [
  {
    icon: 'ri-file-text-line',
    title: 'Genel Bilgiler',
    active: true
  },
  {
    icon: 'ri-seo-line',
    title: 'SEO Bilgileri'
  },
  {
    icon: 'ri-price-tag-3-line',
    title: 'İlgili Ürünler'
  }
]

const renderStepCount = (activeStep: number, isLastStep: boolean, handleNext: () => void, handlePrev: () => void) => {
  const Tag = activeStep === 0 ? Details : activeStep === 1 ? Seo : Submit

  return <Tag activeStep={activeStep} handleNext={handleNext} handlePrev={handlePrev} isLastStep={isLastStep} />
}

const CreateApp = ({ open, setOpen }: CreateAppProps) => {
  // States
  const [activeStep, setActiveStep] = useState(0)

  // Vars
  const isLastStep = activeStep === steps.length - 1

  const handleClose = () => {
    setOpen(false)
    setActiveStep(0)
  }

  const handleStep = (step: number) => () => {
    setActiveStep(step)
  }

  const handleNext = () => {
    if (!isLastStep) {
      setActiveStep(prevActiveStep => prevActiveStep + 1)
    } else {
      handleClose()
    }
  }

  const handlePrev = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1)
  }

  return (
    <Dialog fullWidth maxWidth='md' open={open} onClose={handleClose} scroll='body' closeAfterTransition={false}>
      <DialogTitle variant='h4' className='flex gap-2 flex-col text-center sm:pbs-16 sm:pbe-6 sm:pli-16 '>
        Yeni Etiket Ekle
        <Typography component='span' className='flex flex-col text-center'>
          Ürünleri tek bir etiket altında sunabilirsiniz
        </Typography>
      </DialogTitle>
      <DialogContent className='pbs-0 sm:pli-16 sm:pbe-16'>
        <IconButton onClick={handleClose} className='absolute block-start-4 inline-end-4'>
          <i className='ri-close-line text-textSecondary' />
        </IconButton>
        <StepperWrapper>
          <Stepper
            nonLinear
            activeStep={activeStep}
            orientation='vertical'
            connector={<></>}
            className='flex flex-col gap-6 min-is-[220px]'
          >
            <div className='flex items-center justify-center gap-6 border-b border-gray-300 pb-4 mb-4'>
              {steps.map((label, index) => {
                return (
                  <Step key={index} onClick={handleStep(index)}>
                    <StepLabel icon={<></>} className='p-0 cursor-pointer'>
                      <div className='flex step-label items-center justify-center gap-1'>
                        <i
                          className={classnames(label.icon, {
                            'bg-primary shadow-xs': activeStep === index,
                            'text-primary': activeStep > index
                          })}
                        />
                        <Typography
                          className={classnames(
                            'uppercase text-sm font-medium',
                            { 'text-primary': activeStep === index },
                            { 'text-gray-500': activeStep !== index }
                          )}
                          color='text.primary'
                        >
                          {label.title}
                        </Typography>
                        <Typography variant='body2'>{label.subtitle}</Typography>
                      </div>
                    </StepLabel>
                  </Step>
                )
              })}
            </div>
          </Stepper>
        </StepperWrapper>
        <div className='flex gap-y-6 pbs-1 flex-col md:flex-row'>
          <div className='flex-1'>{renderStepCount(activeStep, isLastStep, handleNext, handlePrev)}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreateApp
