
import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnLogin = nextUrl.pathname.startsWith('/login')

            // Allow access to public assets
            if (nextUrl.pathname.startsWith('/api') ||
                nextUrl.pathname.startsWith('/_next') ||
                nextUrl.pathname.includes('favicon.ico')) {
                return true
            }

            if (isOnLogin) {
                if (isLoggedIn) return Response.redirect(new URL('/', nextUrl))
                return true
            }

            if (!isLoggedIn) {
                return false // Redirect to login
            }

            return true
        },
        async session({ session, token }) {
            if (token && session.user) {
                // @ts-ignore
                session.user.role = token.role
                // @ts-ignore
                session.user.id = token.sub
            }
            return session
        },
        async jwt({ token, user }) {
            if (user) {
                // @ts-ignore
                token.role = user.role
            }
            return token
        }
    },
    providers: [], // Providers allocated in auth.ts to avoid Prisma in Edge
} satisfies NextAuthConfig
