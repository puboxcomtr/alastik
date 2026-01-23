'use client'

import { useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import styles from './Login.module.css'

// MUI Imports
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'

// Third-party Imports
import { signIn } from 'next-auth/react'
import { Controller, useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { object, minLength, string, email, pipe, nonEmpty } from 'valibot'
import type { SubmitHandler } from 'react-hook-form'
import type { InferInput } from 'valibot'

// Type Imports
import type { Mode } from '@/@core/types'
import type { Locale } from '@configs/i18n'

// Component Imports
import Logo from '@components/layout/shared/Logo'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import { useSettings } from '@/@core/hooks/useSettings'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

type ErrorType = {
  message: string[]
}

type FormData = InferInput<typeof schema>

const schema = object({
  email: pipe(string(), minLength(1, 'Bu alan zorunludur'), email('Geçerli bir email adresi giriniz')),
  password: pipe(
    string(),
    nonEmpty('Bu alan zorunludur'),
    minLength(5, 'Şifre en az 5 karakter olmalıdır')
  )
})

const Login = ({ mode }: { mode: Mode }) => {
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [errorState, setErrorState] = useState<ErrorType | null>(null)

  // Hooks
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang: locale } = useParams()
  const { settings } = useSettings()

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: valibotResolver(schema),
    defaultValues: {
      email: '',
      password: ''
    }
  })
  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  const onSubmit: SubmitHandler<FormData> = async (data: FormData) => {
    const res = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false
    })

    if (res && res.ok && res.error === null) {
      const redirectURL = searchParams.get('redirectTo') ?? '/'
      router.replace(getLocalizedUrl(redirectURL, locale as Locale))
    } else {
      if (res?.error) {
        setErrorState({ message: [res.error] })
      }
    }
  }

  return (
    <div className={`flex bs-full justify-center ${styles.loginContainer}`}>
      {/* Sol taraf - Illustration */}
      <div
        className='flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative max-md:hidden'
        style={{
          backgroundImage: 'url(https://api.alastik.com/theme/login-background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      {/* Sağ taraf - Login Form */}
      <div className='flex justify-center items-center bs-full bg-backgroundPaper p-6 md:p-12 md:is-[480px]'>
        <div className='absolute block-start-5 sm:block-start-[33px] inline-start-6 sm:inline-start-[38px]'>
          <Logo />
        </div>

        <div className='flex flex-col gap-5 is-full sm:is-auto md:is-full sm:max-is-[400px]'>
          <div>
            <Typography variant='h4'>{`${themeConfig.templateName} Yönetici Giriş Paneli`}</Typography>
            <Typography>Lütfen kullanıcı adı ve şifrenizi doğru şekilde doldurunuz.</Typography>
          </div>

          <form
            noValidate
            autoComplete='off'
            onSubmit={handleSubmit(onSubmit)}
            className='flex flex-col gap-5'
          >
            <Controller
              name='email'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  autoFocus
                  type='email'
                  label='Kullanıcı Adı'
                  onChange={e => {
                    field.onChange(e.target.value)
                    errorState !== null && setErrorState(null)
                  }}
                  {...((errors.email || errorState !== null) && {
                    error: true,
                    helperText: errors?.email?.message || errorState?.message[0]
                  })}
                />
              )}
            />

            <Controller
              name='password'
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label='Şifre'
                  type={isPasswordShown ? 'text' : 'password'}
                  onChange={e => {
                    field.onChange(e.target.value)
                    errorState !== null && setErrorState(null)
                  }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton
                            size='small'
                            edge='end'
                            onClick={handleClickShowPassword}
                            onMouseDown={e => e.preventDefault()}
                          >
                            <i className={isPasswordShown ? 'ri-eye-off-line' : 'ri-eye-line'} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                  {...(errors.password && { error: true, helperText: errors.password.message })}
                />
              )}
            />
            <Button
              fullWidth
              variant='contained'
              type='submit'
              sx={{
                backgroundColor: '#e3001b',
                '&:hover': { backgroundColor: '#cc0018' }
              }}
            >
              Giriş Yap
            </Button>
          </form>
          <Divider className='gap-3'>veya</Divider>
          <Button
            color='secondary'
            className='self-center text-textPrimary'
            onClick={() => signIn('google')}
          >
            Şifremi Unuttum?
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Login