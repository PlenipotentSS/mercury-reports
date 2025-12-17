export interface Company {
  id: number
  user_id: number
  name: string
  api_key: string
  is_active: number
  created_at: string
  updated_at: string
  last_used_at: string | null
}

export interface Transaction {
  id: string
  amount: number
  createdAt: string
  status: string
  bankDescription: string
  counterpartyName?: string
  details?: {
    creditCardInfo?: {
      email: string
      paymentMethod: string
    }
  }
  kind: string
  mercuryCategory: string
  generalLedgerCodeName: string
  categoryData?: {
    id: string
    name: string
  }
  attachments: Array<{
    fileName: string
    url: string
    attachmentType: string
  }>
}

export interface Account {
  id: string
  name: string
  nickname: string
  availableBalance: number
  currentBalance: number
  dashboardLink: string
  status: string
  kind: string
}

export interface CompanyAccounts {
  company: Company
  accounts: Account[]
  error?: string
}

export interface TransactionsResponse {
  transactions: Transaction[]
}
