import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface Transaction {
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

interface TransactionsResponse {
  transactions: Transaction[]
}

export default function Reports() {
  const { user } = useAuth()
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

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

  const [startDate, setStartDate] = useState(getDefaultStartDate())
  const [endDate, setEndDate] = useState(getDefaultEndDate())
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    checkApiKeyAndFetchTransactions()
  }, [user])

  const checkApiKeyAndFetchTransactions = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      // Check if API key exists
      const apiKeyResult = await window.api.apiKeyGetActive(user.id)

      if (!apiKeyResult.success || !apiKeyResult.apiKey) {
        setHasApiKey(false)
        setIsLoading(false)
        return
      }

      setHasApiKey(true)

      // Build query parameters
      const params = new URLSearchParams()
      if (startDate) params.append('start', startDate)
      if (endDate) params.append('end', endDate)
      if (statusFilter) params.append('status', statusFilter)
      const queryString = params.toString()

      // Fetch transactions from Mercury API via IPC (avoids CORS)
      const result = await window.api.mercuryFetchTransactions(
        apiKeyResult.apiKey.api_key,
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

  if (isLoading) {
    return (
      <div className="page full-width">
        <h2 className="page-title">Reports</h2>
        <div className="page-content">
          <div className="loading-container-inline">
            <div className="loading-spinner-small"></div>
            <p>Loading transactions...</p>
          </div>
        </div>
      </div>
    )
  }

  if (hasApiKey === false) {
    return (
      <div className="page full-width">
        <h2 className="page-title">Reports</h2>
        <div className="page-content">
          <div className="no-api-key-message">
            <h3>No API Key Found</h3>
            <p>
              No reports can be provided until the Mercury API key is added. Please go to the
              Settings page to add your API key.
            </p>
            <a href="#" onClick={() => window.location.reload()} className="settings-link">
              Go to Settings
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page full-width">
        <h2 className="page-title">Reports</h2>
        <div className="page-content">
          <div className="error-box">
            <h3>Error Loading Transactions</h3>
            <p>{error}</p>
            <button onClick={checkApiKeyAndFetchTransactions} className="retry-button">
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
        <div className="transactions-header">
          <p>Total Transactions: {transactions.length}</p>
          <div className="header-actions">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="filter-toggle-button"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button onClick={checkApiKeyAndFetchTransactions} className="refresh-button">
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
              <button onClick={checkApiKeyAndFetchTransactions} className="apply-filters-button">
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
                  <th>ID</th>
                  <th>Card Name</th>
                  <th>Amount</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Counterparty</th>
                  <th>Kind</th>
                  <th>Category</th>
                  <th>GL Code</th>
                  <th>Attachments</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
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
                    <td>{transaction.kind}</td>
                    <td>
                      {transaction.categoryData?.name}
                      <div className="bank-description-italic">{transaction.mercuryCategory || <span className="no-data">—</span>}</div>
                    </td>
                    <td>
                      {transaction.generalLedgerCodeName || <span className="no-data">—</span>}
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
