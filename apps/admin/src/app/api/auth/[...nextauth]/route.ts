import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Email ve şifre gereklidir')
                }
                try {
                    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'
                    const response = await fetch(`${API_URL}/admin/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password
                        })
                    })

                    const data = await response.json()

                    if (response.ok && data.id) {
                        return {
                            id: data.id,
                            email: data.email,
                            name: data.name,
                            role: data.role,
                            accessToken: data.token || 'dummy-token'
                        }
                    } else {
                        const errorMsg = data.message ? data.message[0] : 'Giriş başarısız'
                        throw new Error(errorMsg)
                    }
                } catch (error: any) {
                    console.error('Auth error:', error)
                    throw new Error(error.message || 'Sunucu hatası')
                }
            }
        })
    ],
    pages: {
        signIn: '/login',
        error: '/login'
    },
    session: {
        strategy: 'jwt',
        maxAge: 8 * 60 * 60 // 8 saat
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.accessToken = user.accessToken
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as string
                session.user.accessToken = token.accessToken as string
            }
            return session
        },
        async signIn({ user }) {
            return true
        }
    }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }