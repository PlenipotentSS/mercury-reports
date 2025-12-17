import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  downloadMercuryCSV,
  downloadQuickBooksDeposits,
  downloadQuickBooksChecks,
  downloadQuickBooksCreditCard
} from '../utils/csvExports'
import type { Company, Transaction, TransactionsResponse } from '../types'

export default function Reports() {
  const { user } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [showActionsDropdown, setShowActionsDropdown] = useState(false)
  const [ledgerRecords, setLedgerRecords] = useState<{ [key: string]: string }>({})

  // Set default dates: last 7 days
  const getDefaultEndDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const getDefaultStartDate = () => {
    const today = new Date()
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    return sevenDaysAgo.toISOString().split('T')[0]
  }

  const getThirtyDaysAgoDate = () => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    return thirtyDaysAgo.toISOString().split('T')[0]
  }

  const [startDate, setStartDate] = useState(getDefaultStartDate())
  const [endDate, setEndDate] = useState(getDefaultEndDate())
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadCompanies()
  }, [user])

  useEffect(() => {
    if (selectedCompany) {
      fetchTransactions()
      loadLedgerRecords(selectedCompany.id)
    }
  }, [selectedCompany, startDate, endDate, statusFilter])

  useEffect(() => {
    // Clear selections when changing companies or filters
    setSelectedTransactions(new Set())
  }, [selectedCompany, startDate, endDate, statusFilter])

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = () => {
      if (showActionsDropdown) {
        setShowActionsDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showActionsDropdown])

  // Auto-refresh every 1 minute
  useEffect(() => {
    if (!selectedCompany) return

    const interval = setInterval(() => {
      fetchTransactions()
    }, 60000) // 60000ms = 1 minute

    return () => clearInterval(interval)
  }, [selectedCompany, startDate, endDate, statusFilter])

  const loadCompanies = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      const result = await window.api.companyGetAll(user.id, true)

      if (!result.success || !result.companies || result.companies.length === 0) {
        setCompanies([])
        setSelectedCompany(null)
        setIsLoading(false)
        return
      }

      setCompanies(result.companies)
      // Auto-select first company
      setSelectedCompany(result.companies[0])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load companies')
      setIsLoading(false)
    }
  }

  const loadLedgerRecords = async (companyId: number) => {
    try {
      const result = await window.api.companyLedgerGetAll(companyId)
      if (result.success && result.records) {
        const recordsMap: { [key: string]: string } = {}
        result.records.forEach((record) => {
          recordsMap[record.key] = record.value
        })
        setLedgerRecords(recordsMap)
      }
    } catch (error) {
      console.error('Failed to load ledger records:', error)
    }
  }

  const fetchTransactions = async () => {
    if (!selectedCompany) return

    try {
      setIsLoading(true)
      setError(null)

      // Update last used timestamp
      await window.api.companyUpdateLastUsed(selectedCompany.id)

      // Build query parameters
      const params = new URLSearchParams()
      if (startDate) params.append('start', startDate)
      if (endDate) params.append('end', endDate)
      if (statusFilter) params.append('status', statusFilter)
      const queryString = params.toString()

      // Fetch transactions from Mercury API via IPC (avoids CORS)
      const result = await window.api.mercuryFetchTransactions(
        selectedCompany.api_key,
        queryString
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch transactions')
      }

      const data: TransactionsResponse = result.data
      // Sort transactions by createdAt in descending order (most recent first)
      const sortedTransactions = (data.transactions || []).sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      setTransactions(sortedTransactions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setIsLoading(false)
    }
  }

  const truncateId = (id: string) => {
    return `${id.slice(0, 8)}...${id.slice(-4)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const toggleTransactionSelection = (transactionId: string) => {
    setSelectedTransactions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId)
      } else {
        newSet.add(transactionId)
      }
      return newSet
    })
  }

  const toggleAllTransactions = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set())
    } else {
      setSelectedTransactions(new Set(transactions.map((t) => t.id)))
    }
  }

  const handleDownloadMercuryCSV = () => {
    downloadMercuryCSV(transactions, selectedTransactions)
    setShowActionsDropdown(false)
  }

  const handleDownloadQuickBooksDeposits = () => {
    const glNameChecking = ledgerRecords['gl_name_mercury_checking'] || selectedCompany?.name || ''
    const glNameCreditCard = ledgerRecords['gl_name_mercury_credit_card'] || selectedCompany?.name || ''
    downloadQuickBooksDeposits(transactions, selectedTransactions, glNameCreditCard, glNameChecking)
    setShowActionsDropdown(false)
  }

  const handleDownloadQuickBooksChecks = () => {
    const glNameChecking = ledgerRecords['gl_name_mercury_checking'] || selectedCompany?.name || ''
    const glNameCreditCard = ledgerRecords['gl_name_mercury_credit_card'] || selectedCompany?.name || ''
    downloadQuickBooksChecks(transactions, selectedTransactions, glNameCreditCard, glNameChecking)
    setShowActionsDropdown(false)
  }

  const handleDownloadQuickBooksCreditCard = () => {
    const glNameChecking = ledgerRecords['gl_name_mercury_checking'] || selectedCompany?.name || ''
    const glNameCreditCard = ledgerRecords['gl_name_mercury_credit_card'] || selectedCompany?.name || ''
    downloadQuickBooksCreditCard(transactions, selectedTransactions, glNameCreditCard, glNameChecking)
    setShowActionsDropdown(false)
  }

  if (isLoading && companies.length === 0) {
    return (
      <div className="page full-width">
        <h2 className="page-title">Reports</h2>
        <div className="page-content">
          <div className="loading-container-inline">
            <div className="loading-spinner-small"></div>
            <p>Loading companies...</p>
          </div>
        </div>
      </div>
    )
  }

  if (companies.length === 0 && !isLoading) {
    return (
      <div className="page full-width">
        <h2 className="page-title">Reports</h2>
        <div className="page-content">
          <div className="no-api-key-message">
            <h3>No Companies Found</h3>
            <p>
              No reports can be provided until you add a Mercury company. Please go to the Settings
              page to add your first company and API key.
            </p>
            <a href="#" onClick={() => window.location.reload()} className="settings-link">
              Go to Settings
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (error && !selectedCompany) {
    return (
      <div className="page full-width">
        <h2 className="page-title">Reports</h2>
        <div className="page-content">
          <div className="error-box">
            <h3>Error Loading Companies</h3>
            <p>{error}</p>
            <button onClick={loadCompanies} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page full-width">
      <h2 className="page-title">Mercury Transactions</h2>
      <div className="page-content">
        <div className="company-cards-container">
          <div className="company-cards-scroll">
            {companies.map((company) => (
              <div
                key={company.id}
                className={`company-card ${selectedCompany?.id === company.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedCompany(company)
                  setTransactions([])
                }}
              >
                <div className="company-card-name">{company.name}</div>
                <div className="company-card-meta">
                  {company.last_used_at
                    ? `Last used: ${new Date(company.last_used_at).toLocaleDateString()}`
                    : 'Never used'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="transactions-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <p style={{ margin: 0 }}>Total Transactions: {transactions.length}</p>
            {selectedTransactions.size > 0 && (
              <p style={{ margin: 0, color: '#667eea', fontWeight: 600 }}>
                ({selectedTransactions.size} selected)
              </p>
            )}
          </div>
          <div className="header-actions">
            {selectedTransactions.size > 0 && (
              <div className="actions-dropdown-container">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowActionsDropdown(!showActionsDropdown)
                  }}
                  className="actions-button"
                >
                  Actions ▼
                </button>
                {showActionsDropdown && (
                  <div className="actions-dropdown" onClick={(e) => e.stopPropagation()}>
                    <button onClick={handleDownloadMercuryCSV} className="dropdown-item">
                      Download as CSV
                    </button>
                    <button onClick={handleDownloadQuickBooksDeposits} className="dropdown-item">
                      QuickBooks CSV - Deposits
                    </button>
                    <button onClick={handleDownloadQuickBooksChecks} className="dropdown-item">
                      QuickBooks CSV - Withdrawals
                    </button>
                    <button onClick={handleDownloadQuickBooksCreditCard} className="dropdown-item">
                      QuickBooks CSV - Credit Card
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="filter-toggle-button"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button onClick={fetchTransactions} className="refresh-button">
              Refresh
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="filters-section">
            <div className="filter-group">
              <label htmlFor="start-date">Start Date</label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label htmlFor="end-date">End Date</label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label htmlFor="status-filter">Status</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-input"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="cancelled">Cancelled</option>
                <option value="failed">Failed</option>
                <option value="reversed">Reversed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div className="filter-actions">
              <button onClick={fetchTransactions} className="apply-filters-button">
                Apply Filters
              </button>
              <button
                onClick={() => {
                  setStartDate(getDefaultStartDate())
                  setEndDate(getDefaultEndDate())
                  setStatusFilter('')
                }}
                className="clear-filters-button"
              >
                Reset to Last 7 Days
              </button>
              <button
                onClick={() => {
                  setStartDate(getThirtyDaysAgoDate())
                  setEndDate(getDefaultEndDate())
                  setStatusFilter('')
                }}
                className="clear-filters-button"
              >
                Last 30 Days
              </button>
            </div>
          </div>
        )}

        {transactions.length === 0 ? (
          <p className="placeholder-text">No transactions found.</p>
        ) : (
          <div className="transactions-table-container">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedTransactions.size === transactions.length && transactions.length > 0}
                      onChange={toggleAllTransactions}
                      className="transaction-checkbox"
                    />
                  </th>
                  <th>ID</th>
                  <th>Card Name</th>
                  <th>Amount</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Counterparty</th>
                  <th>Category</th>
                  <th>GL Code</th>
                  <th>Attachments</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedTransactions.has(transaction.id)}
                        onChange={() => toggleTransactionSelection(transaction.id)}
                        className="transaction-checkbox"
                      />
                    </td>
                    <td className="truncated-id" title={transaction.id}>
                      {truncateId(transaction.id)}
                    </td>
                    <td>
                      {transaction.details?.creditCardInfo?.email}
                      <div className="bank-description-italic">{transaction.details?.creditCardInfo?.paymentMethod || <span className="no-data">—</span>}</div>
                    </td>
                    <td
                      className={`amount ${transaction.amount < 0 ? 'negative' : 'positive'}`}
                    >
                      {formatAmount(transaction.amount)}
                    </td>
                    <td>{formatDate(transaction.createdAt)}</td>
                    <td>
                      <span className={`status-badge status-${transaction.status}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="counterparty-cell">
                      <div>{transaction.counterpartyName || <span className="no-data">—</span>}</div>
                      <div className="bank-description-italic">{transaction.bankDescription}</div>
                    </td>
                    <td>
                      {transaction.categoryData?.name}
                      <div className="bank-description-italic">{transaction.mercuryCategory || <span className="no-data">—</span>}</div>
                    </td>
                    <td>
                      {transaction.generalLedgerCodeName?.split("|").join(",") || <span className="no-data">—</span>}
                      <div className="bank-description-italic">{transaction.kind}</div>
                    </td>
                    <td>
                      {transaction.attachments && transaction.attachments.length > 0 ? (
                        <a
                          href={transaction.attachments[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="attachment-link"
                        >
                          View ({transaction.attachments.length})
                        </a>
                      ) : (
                        <span className="no-data">—</span>
                      )}
                    </td>
                    <td>
                      <a
                        href={`https://app.mercury.com/transactions/${transaction.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="action-link"
                        title="View in Mercury Dashboard"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
