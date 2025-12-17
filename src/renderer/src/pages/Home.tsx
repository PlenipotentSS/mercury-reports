import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Company, Account, CompanyAccounts } from '../types'

export default function Home() {
  const { user } = useAuth()
  const [companyAccounts, setCompanyAccounts] = useState<CompanyAccounts[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAllCompanyAccounts()
  }, [user])

  // Auto-refresh every 1 minute
  useEffect(() => {
    const interval = setInterval(() => {
      loadAllCompanyAccounts()
    }, 60000) // 60000ms = 1 minute

    return () => clearInterval(interval)
  }, [user])

  const loadAllCompanyAccounts = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // First, get all active companies
      const companiesResult = await window.api.companyGetAll(user.id, true)

      if (!companiesResult.success || !companiesResult.companies) {
        setCompanyAccounts([])
        setIsLoading(false)
        return
      }

      // Fetch accounts for each company
      const accountsPromises = companiesResult.companies.map(async (company) => {
        try {
          const accountsResult = await window.api.mercuryFetchAccounts(company.api_key)

          if (!accountsResult.success) {
            return {
              company,
              accounts: [],
              error: accountsResult.error || 'Failed to fetch accounts'
            }
          }

          return {
            company,
            accounts: accountsResult.data.accounts || []
          }
        } catch (error) {
          return {
            company,
            accounts: [],
            error: error instanceof Error ? error.message : 'Failed to fetch accounts'
          }
        }
      })

      const results = await Promise.all(accountsPromises)
      setCompanyAccounts(results)
    } catch (error) {
      console.error('Failed to load company accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="page full-width">
        <h2 className="page-title">Welcome, {user?.name}!</h2>
        <div className="page-content">
          <div className="loading-container-inline">
            <div className="loading-spinner-small"></div>
            <p>Loading accounts...</p>
          </div>
        </div>
      </div>
    )
  }

  if (companyAccounts.length === 0) {
    return (
      <div className="page full-width">
        <h2 className="page-title">Welcome, {user?.name}!</h2>
        <div className="page-content">
          <div className="no-api-key-message">
            <h3>No Companies Found</h3>
            <p>
              No companies available. Please go to the Settings page to add your first Mercury
              company and API key.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page full-width">
      <h2 className="page-title">Welcome, {user?.name}!</h2>
      <div className="page-content">
        <div className="accounts-overview">
          {companyAccounts.map(({ company, accounts, error }) => (
            <div key={company.id} className="company-accounts-section">
              <h3 className="company-section-title">{company.name}</h3>

              {error ? (
                <div className="error-message">
                  <p>Failed to load accounts: {error}</p>
                </div>
              ) : accounts.length === 0 ? (
                <p className="no-accounts-message">No accounts found for this company.</p>
              ) : (
                <div className="accounts-grid">
                  {accounts.filter(account => account.status !== "archived").map((account) => (
                    <a key={account.id} className="account-card" href={account.dashboardLink} target="_blank" rel="noreferrer">
                      <div className="account-card-header">
                        <h4 className="account-nickname">{account.nickname || account.name}</h4>
                        <span className={`account-status status-${account.status.toLowerCase()}`}>
                          {account.status}
                        </span>
                      </div>
                      <div className="account-card-body">
                        <div className="account-balance-row">
                          <span className="balance-label">Available Balance:</span>
                          <span className="balance-value available">
                            {formatCurrency(account.availableBalance)}
                          </span>
                        </div>
                        <div className="account-balance-row">
                          <span className="balance-label">Current Balance:</span>
                          <span className="balance-value current">
                            {formatCurrency(account.currentBalance)}
                          </span>
                        </div>
                        <div className="account-meta">
                          <span className="account-kind">{account.kind}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
