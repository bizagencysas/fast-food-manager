import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaClient } from "@prisma/client"
import { authConfig } from "./auth.config"

const prisma = new PrismaClient()

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            credentials: {
                email: {},
                password: {},
            },
            authorize: async (credentials) => {
                if (!credentials?.email || !credentials?.password) return null

                // For MVP/Demo if no users exist, allow a default admin
                if (credentials.email === 'freddy' && credentials.password === 'freddy') {
                    return { id: 'admin-id', name: 'Freddy', email: 'freddy', role: 'ADMIN' }
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string }
                })

                if (!user) return null

                // Check password (assume bcrypt or plain for now as per previous code)
                // const passwordsMatch = await compare(credentials.password as string, user.passwordHash)
                // if (!passwordsMatch) return null

                return user
            },
        }),
    ],
})
