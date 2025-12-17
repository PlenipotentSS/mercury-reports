import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Company } from '../types'

interface LedgerRecord {
  id: number
  company_id: number
  key: string
  value: string
  created_at: string
  updated_at: string
}

const LEDGER_PRESETS = [
  { key: 'gl_name_mercury_checking', label: 'GL Name Mercury Checking' },
  { key: 'gl_name_mercury_credit_card', label: 'GL Name Mercury Credit Card' }
]

export default function Settings() {
  const { user } = useAuth()
  const [companyName, setCompanyName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showKey, setShowKey] = useState<{ [key: number]: boolean }>({})
  const [isEditing, setIsEditing] = useState(false)
  const [ledgerCompany, setLedgerCompany] = useState<Company | null>(null)
  const [ledgerRecords, setLedgerRecords] = useState<{ [key: string]: string }>({})
  const [ledgerMessage, setLedgerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadCompanies()
  }, [user])

  useEffect(() => {
    if (ledgerCompany) {
      loadLedgerRecords(ledgerCompany.id)
    }
  }, [ledgerCompany])

  const loadCompanies = async () => {
    if (!user) return

    try {
      const result = await window.api.companyGetAll(user.id, true)
      if (result.success && result.companies) {
        setCompanies(result.companies)
      }
    } catch (error) {
      console.error('Failed to load companies:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    setMessage(null)

    try {
      if (isEditing && selectedCompany) {
        // Update existing company
        const result = await window.api.companyUpdate(selectedCompany.id, companyName, apiKey)
        if (result.success) {
          setMessage({ type: 'success', text: 'Company updated successfully!' })
          await loadCompanies()
          resetForm()
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to update company' })
        }
      } else {
        // Create new company
        const result = await window.api.companyCreate(user.id, companyName, apiKey)
        if (result.success) {
          setMessage({ type: 'success', text: 'Company added successfully!' })
          await loadCompanies()
          resetForm()
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to add company' })
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (company: Company) => {
    setSelectedCompany(company)
    setCompanyName(company.name)
    setApiKey('')
    setIsEditing(true)
    setMessage(null)
  }

  const handleDeactivate = async (company: Company) => {
    if (!confirm(`Are you sure you want to deactivate ${company.name}?`)) return

    setIsLoading(true)
    try {
      const result = await window.api.companyDeactivate(company.id)
      if (result.success) {
        setMessage({ type: 'success', text: 'Company deactivated successfully!' })
        await loadCompanies()
        if (selectedCompany?.id === company.id) {
          resetForm()
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to deactivate company' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setCompanyName('')
    setApiKey('')
    setSelectedCompany(null)
    setIsEditing(false)
  }

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key
    return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`
  }

  const toggleShowKey = (companyId: number) => {
    setShowKey((prev) => ({ ...prev, [companyId]: !prev[companyId] }))
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

  const handleLedgerRecordChange = (key: string, value: string) => {
    setLedgerRecords((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveLedgerRecords = async () => {
    if (!ledgerCompany) return

    setIsLoading(true)
    setLedgerMessage(null)

    try {
      // Save all preset records
      for (const preset of LEDGER_PRESETS) {
        const value = ledgerRecords[preset.key] || ''
        await window.api.companyLedgerSet(ledgerCompany.id, preset.key, value)
      }

      setLedgerMessage({ type: 'success', text: 'Ledger settings saved successfully!' })
    } catch (error) {
      setLedgerMessage({ type: 'error', text: 'Failed to save ledger settings' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page">
      <h2 className="page-title">Settings</h2>

      <div className="page-content">
        <div className="settings-section">
          <h3 className="section-title">Mercury Companies</h3>
          <p className="section-description">
            Manage your Mercury companies and API keys. Each company can have its own API key for
            accessing Mercury transaction data.
          </p>

          {companies.length > 0 && (
            <div className="companies-list">
              <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', color: '#2d3748' }}>
                Active Companies
              </h4>
              {companies.map((company) => (
                <div key={company.id} className="current-key-info" style={{ marginBottom: '16px' }}>
                  <div className="info-row">
                    <span className="info-label">Company Name:</span>
                    <span className="info-value">{company.name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">API Key:</span>
                    <span className="info-value">
                      {showKey[company.id] ? company.api_key : maskApiKey(company.api_key)}
                      <button
                        className="toggle-visibility-button"
                        onClick={() => toggleShowKey(company.id)}
                        type="button"
                      >
                        {showKey[company.id] ? 'Hide' : 'Show'}
                      </button>
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Created:</span>
                    <span className="info-value">
                      {new Date(company.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {company.last_used_at && (
                    <div className="info-row">
                      <span className="info-label">Last Used:</span>
                      <span className="info-value">
                        {new Date(company.last_used_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="info-row" style={{ borderBottom: 'none', paddingTop: '12px' }}>
                    <button
                      type="button"
                      className="toggle-visibility-button"
                      onClick={() => handleEdit(company)}
                      disabled={isLoading}
                      style={{ marginRight: '8px' }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="deactivate-button"
                      onClick={() => handleDeactivate(company)}
                      disabled={isLoading}
                      style={{ flex: 'none', padding: '4px 12px', fontSize: '12px' }}
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="settings-form">
            <h4 style={{ marginTop: '20px', marginBottom: '16px', fontSize: '16px', color: '#2d3748' }}>
              {isEditing ? 'Edit Company' : 'Add New Company'}
            </h4>

            <div className="form-group">
              <label htmlFor="companyName">Company Name</label>
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Acme Corporation"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="apiKey">
                {isEditing ? 'New API Key (leave empty to keep current)' : 'Mercury API Key'}
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Mercury API key"
                required={!isEditing}
                disabled={isLoading}
              />
              <small className="form-help">
                Your API key is stored securely in a local encrypted database.
              </small>
            </div>

            {message && (
              <div className={`message ${message.type}`}>
                {message.text}
              </div>
            )}

            <div className="button-group">
              <button type="submit" className="submit-button" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update Company' : 'Add Company'}
              </button>

              {isEditing && (
                <button
                  type="button"
                  className="deactivate-button"
                  onClick={resetForm}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="settings-section">
          <h3 className="section-title">Company Ledger Configuration</h3>
          <p className="section-description">
            Configure general ledger names for each company. These settings are used when exporting
            to QuickBooks CSV format.
          </p>

          {companies.length > 0 && (
            <>
              <div className="form-group">
                <label htmlFor="ledgerCompanySelect">Select Company</label>
                <select
                  id="ledgerCompanySelect"
                  value={ledgerCompany?.id || ''}
                  onChange={(e) => {
                    const company = companies.find((c) => c.id === Number(e.target.value))
                    setLedgerCompany(company || null)
                  }}
                  className="filter-input"
                  style={{ width: '100%' }}
                >
                  <option value="">-- Select a company --</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              {ledgerCompany && (
                <>
                  {LEDGER_PRESETS.map((preset) => (
                    <div key={preset.key} className="form-group">
                      <label htmlFor={preset.key}>{preset.label}</label>
                      <input
                        type="text"
                        id={preset.key}
                        value={ledgerRecords[preset.key] || ''}
                        onChange={(e) => handleLedgerRecordChange(preset.key, e.target.value)}
                        placeholder={`Enter ${preset.label.toLowerCase()}`}
                        disabled={isLoading}
                      />
                    </div>
                  ))}

                  {ledgerMessage && (
                    <div className={`message ${ledgerMessage.type}`}>{ledgerMessage.text}</div>
                  )}

                  <button
                    type="button"
                    className="submit-button"
                    onClick={handleSaveLedgerRecords}
                    disabled={isLoading}
                    style={{ marginTop: '12px' }}
                  >
                    {isLoading ? 'Saving...' : 'Save Ledger Settings'}
                  </button>
                </>
              )}
            </>
          )}

          {companies.length === 0 && (
            <p style={{ color: '#718096', fontStyle: 'italic' }}>
              Please add a company first to configure ledger settings.
            </p>
          )}
        </div>

        <div className="settings-section">
          <h3 className="section-title">Account Information</h3>
          <div className="info-row">
            <span className="info-label">Name:</span>
            <span className="info-value">{user?.name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Email:</span>
            <span className="info-value">{user?.email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Account Created:</span>
            <span className="info-value">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
