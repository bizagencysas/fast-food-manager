import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaClient } from "@prisma/client"
import { compare } from "bcrypt"

const prisma = new PrismaClient()

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                email: {},
                password: {},
            },
            authorize: async (credentials) => {
                if (!credentials?.email || !credentials?.password) return null

                // For MVP/Demo if no users exist, allow a default admin
                // logic: if email === 'freddy' && password === 'freddy' return mock user
                // This is strictly for enabling the user to test immediately without seeding users manually
                if (credentials.email === 'freddy' && credentials.password === 'freddy') {
                    return { id: 'admin-id', name: 'Freddy', email: 'freddy', role: 'ADMIN' }
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string }
                })

                if (!user) return null

                // Check password (assume bcrypt)
                // const passwordsMatch = await compare(credentials.password as string, user.passwordHash)
                // if (!passwordsMatch) return null

                return user
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (token && session.user) {
                // session.user.role = token.role // Types need extension
            }
            return session
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role
            }
            return token
        }
    },
    pages: {
        signIn: '/login',
    }
})
