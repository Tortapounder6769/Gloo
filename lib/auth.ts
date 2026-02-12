import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { Role } from '@/types/models'

// In-memory user storage matching seed data
const users: Array<{
  id: string
  email: string
  password: string
  name: string
  role: Role
  projectIds: string[]
}> = [
  {
    id: 'user_super',
    email: 'supervisor@construction.com',
    password: 'super123',
    name: 'Mike Sullivan',
    role: 'superintendent',
    projectIds: ['project-1'],
  },
  {
    id: 'user_pm',
    email: 'pm@construction.com',
    password: 'pm123',
    name: 'Sarah Chen',
    role: 'project_manager',
    projectIds: ['project-1', 'project-2'],
  },
  {
    id: 'user_foreman',
    email: 'foreman@construction.com',
    password: 'foreman123',
    name: 'Carlos Martinez',
    role: 'foreman' as Role,
    projectIds: ['project-1'],
  },
  {
    id: 'user_sub',
    email: 'sub@construction.com',
    password: 'sub123',
    name: 'Alex Kim',
    role: 'subcontractor' as Role,
    projectIds: ['project-1', 'project-2'],
  },
  {
    id: 'user_owner',
    email: 'owner@construction.com',
    password: 'owner123',
    name: 'David Park',
    role: 'owner' as Role,
    projectIds: ['project-1', 'project-2'],
  },
]

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'your@email.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = users.find(
          (u) => u.email === credentials.email && u.password === credentials.password
        )

        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            projectIds: user.projectIds,
          }
        }

        return null
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.projectIds = user.projectIds
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.projectIds = token.projectIds as string[]
      }
      return session
    },
  },
}
