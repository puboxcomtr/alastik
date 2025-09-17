import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const handler = NextAuth({
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
                    const response = await fetch('http://localhost:3082/api/admin/login', {
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
                            role: data.role
                        }
                    } else {
                        const errorMsg = data.message ? data.message[0] : 'Giriş başarısız'
                        throw new Error(errorMsg)
                    }
                } catch (error) {
                    console.error('Auth error:', error)
                    throw new Error(error.message || 'Sunucu hatası')
                }
            }
        })
    ],
    pages: {
        signIn: '/login',
        error: '/login'  // BU SATIRI EKLE
    },
    session: { strategy: 'jwt' },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role
            }
            return token
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.sub
                session.user.role = token.role
            }
            return session
        },
        async signIn({ user }) {  // BU CALLBACK'İ EKLE
            return true
        }
    }
})

export { handler as GET, handler as POST }