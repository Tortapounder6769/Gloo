import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      projectIds: string[]
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    projectIds: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    projectIds: string[]
  }
}
