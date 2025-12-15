import { ElectronAPI } from '@electron-toolkit/preload'

interface User {
  id: number
  name: string
  email: string
  created_at: string
}

interface ApiKey {
  id: number
  user_id: number
  api_key: string
  key_name: string | null
  is_active: number
  created_at: string
  updated_at: string
  last_used_at: string | null
}

interface API {
  // User authentication
  userLogin: (email: string) => Promise<{ success: boolean; user?: User; error?: string }>
  userSignup: (
    name: string,
    email: string
  ) => Promise<{ success: boolean; user?: User; error?: string }>
  userGetAll: () => Promise<{ success: boolean; users?: User[]; error?: string }>

  // API Key management
  apiKeyCreate: (
    userId: number,
    apiKey: string,
    keyName?: string
  ) => Promise<{ success: boolean; apiKeyId?: number; error?: string }>
  apiKeyGetActive: (
    userId: number
  ) => Promise<{ success: boolean; apiKey?: ApiKey; error?: string }>
  apiKeyGetAll: (
    userId: number,
    activeOnly?: boolean
  ) => Promise<{ success: boolean; apiKeys?: ApiKey[]; error?: string }>
  apiKeyUpdate: (
    id: number,
    apiKey: string,
    keyName?: string
  ) => Promise<{ success: boolean; error?: string }>
  apiKeyDeactivate: (id: number) => Promise<{ success: boolean; error?: string }>

  // Mercury API
  mercuryFetchTransactions: (
    apiKey: string,
    queryString?: string
  ) => Promise<{ success: boolean; data?: any; error?: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
