import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { Company } from '../types'

interface LedgerPreset {
  id: number
  key: string
  label: string
  description: string | null
  created_at: string
  updated_at: string
}

export default function Settings() {
  const { user, updateUser: updateUserContext } = useAuth()
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
  const [ledgerPresets, setLedgerPresets] = useState<LedgerPreset[]>([])
  const [editingPreset, setEditingPreset] = useState<LedgerPreset | null>(null)
  const [presetKey, setPresetKey] = useState('')
  const [presetLabel, setPresetLabel] = useState('')
  const [presetDescription, setPresetDescription] = useState('')
  const [presetMessage, setPresetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeSection, setActiveSection] = useState<'companies' | 'presets' | 'account'>('companies')
  const [isEditingAccount, setIsEditingAccount] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [accountMessage, setAccountMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadCompanies()
    loadLedgerPresets()
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

  const loadLedgerPresets = async () => {
    try {
      const result = await window.api.ledgerPresetGetAll()
      if (result.success && result.presets) {
        setLedgerPresets(result.presets)
      }
    } catch (error) {
      console.error('Failed to load ledger presets:', error)
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
      for (const preset of ledgerPresets) {
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

  const handlePresetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setPresetMessage(null)

    try {
      if (editingPreset) {
        // Update existing preset
        const result = await window.api.ledgerPresetUpdate(
          editingPreset.id,
          presetKey,
          presetLabel,
          presetDescription
        )
        if (result.success) {
          setPresetMessage({ type: 'success', text: 'Preset updated successfully!' })
          await loadLedgerPresets()
          resetPresetForm()
        } else {
          setPresetMessage({ type: 'error', text: result.error || 'Failed to update preset' })
        }
      } else {
        // Create new preset
        const result = await window.api.ledgerPresetCreate(presetKey, presetLabel, presetDescription)
        if (result.success) {
          setPresetMessage({ type: 'success', text: 'Preset created successfully!' })
          await loadLedgerPresets()
          resetPresetForm()
        } else {
          setPresetMessage({ type: 'error', text: result.error || 'Failed to create preset' })
        }
      }
    } catch (error) {
      setPresetMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditPreset = (preset: LedgerPreset) => {
    setEditingPreset(preset)
    setPresetKey(preset.key)
    setPresetLabel(preset.label)
    setPresetDescription(preset.description || '')
    setPresetMessage(null)
  }

  const handleDeletePreset = async (preset: LedgerPreset) => {
    if (!confirm(`Are you sure you want to delete the preset "${preset.label}"?`)) return

    setIsLoading(true)
    try {
      const result = await window.api.ledgerPresetDelete(preset.id)
      if (result.success) {
        setPresetMessage({ type: 'success', text: 'Preset deleted successfully!' })
        await loadLedgerPresets()
        if (editingPreset?.id === preset.id) {
          resetPresetForm()
        }
      } else {
        setPresetMessage({ type: 'error', text: result.error || 'Failed to delete preset' })
      }
    } catch (error) {
      setPresetMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  const resetPresetForm = () => {
    setPresetKey('')
    setPresetLabel('')
    setPresetDescription('')
    setEditingPreset(null)
  }

  const handleEditAccount = () => {
    if (user) {
      setAccountName(user.name)
      setAccountEmail(user.email)
      setIsEditingAccount(true)
      setAccountMessage(null)
    }
  }

  const handleCancelAccountEdit = () => {
    setIsEditingAccount(false)
    setAccountName('')
    setAccountEmail('')
    setAccountMessage(null)
  }

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    setAccountMessage(null)

    try {
      const result = await updateUserContext(accountName, accountEmail)
      if (result.success) {
        setAccountMessage({ type: 'success', text: 'Account updated successfully!' })
        setIsEditingAccount(false)
        setAccountName('')
        setAccountEmail('')
      } else {
        setAccountMessage({ type: 'error', text: result.error || 'Failed to update account' })
      }
    } catch (error) {
      setAccountMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page">
      <h2 className="page-title">Settings</h2>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <nav className="settings-nav">
            <button
              className={`settings-nav-item ${activeSection === 'companies' ? 'active' : ''}`}
              onClick={() => setActiveSection('companies')}
            >
              Companies & API Keys
            </button>
            <button
              className={`settings-nav-item ${activeSection === 'presets' ? 'active' : ''}`}
              onClick={() => setActiveSection('presets')}
            >
              Ledger Presets
            </button>
            <button
              className={`settings-nav-item ${activeSection === 'account' ? 'active' : ''}`}
              onClick={() => setActiveSection('account')}
            >
              Account Information
            </button>
          </nav>
        </aside>

        <div className="settings-main">
          <div className="page-content">
            {activeSection === 'companies' && (
              <>
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
                  {ledgerPresets.map((preset) => (
                    <div key={preset.key} className="form-group">
                      <label htmlFor={preset.key}>
                        {preset.label}
                        {preset.description && (
                          <small style={{ display: 'block', fontWeight: 'normal', color: '#718096', marginTop: '4px' }}>
                            {preset.description}
                          </small>
                        )}
                      </label>
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
              </>
            )}

            {activeSection === 'presets' && (
              <>
                <div className="settings-section">
          <h3 className="section-title">Ledger Presets</h3>
          <p className="section-description">
            Manage the available ledger preset fields that can be configured for each company. These
            presets define which fields are available in the Company Ledger Configuration section.
          </p>

          {ledgerPresets.length > 0 && (
            <div className="companies-list" style={{ marginBottom: '20px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', color: '#2d3748' }}>
                Current Presets
              </h4>
              {ledgerPresets.map((preset) => (
                <div key={preset.id} className="current-key-info" style={{ marginBottom: '16px' }}>
                  <div className="info-row">
                    <span className="info-label">Key:</span>
                    <span className="info-value">{preset.key}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Label:</span>
                    <span className="info-value">{preset.label}</span>
                  </div>
                  {preset.description && (
                    <div className="info-row">
                      <span className="info-label">Description:</span>
                      <span className="info-value">{preset.description}</span>
                    </div>
                  )}
                  <div className="info-row" style={{ borderBottom: 'none', paddingTop: '12px' }}>
                    <button
                      type="button"
                      className="toggle-visibility-button"
                      onClick={() => handleEditPreset(preset)}
                      disabled={isLoading}
                      style={{ marginRight: '8px' }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="deactivate-button"
                      onClick={() => handleDeletePreset(preset)}
                      disabled={isLoading}
                      style={{ flex: 'none', padding: '4px 12px', fontSize: '12px' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handlePresetSubmit} className="settings-form">
            <h4 style={{ marginTop: '20px', marginBottom: '16px', fontSize: '16px', color: '#2d3748' }}>
              {editingPreset ? 'Edit Preset' : 'Add New Preset'}
            </h4>

            <div className="form-group">
              <label htmlFor="presetKey">Preset Key</label>
              <input
                type="text"
                id="presetKey"
                value={presetKey}
                onChange={(e) => setPresetKey(e.target.value)}
                placeholder="e.g., gl_name_mercury_checking"
                required
                disabled={isLoading}
              />
              <small className="form-help">
                A unique identifier for this preset (lowercase, underscores allowed)
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="presetLabel">Display Label</label>
              <input
                type="text"
                id="presetLabel"
                value={presetLabel}
                onChange={(e) => setPresetLabel(e.target.value)}
                placeholder="e.g., GL Name Mercury Checking"
                required
                disabled={isLoading}
              />
              <small className="form-help">
                The user-friendly name shown in the settings form
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="presetDescription">Description (Optional)</label>
              <input
                type="text"
                id="presetDescription"
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                placeholder="e.g., General ledger name for Mercury checking account"
                disabled={isLoading}
              />
              <small className="form-help">
                Optional description to help users understand the purpose of this field
              </small>
            </div>

            {presetMessage && (
              <div className={`message ${presetMessage.type}`}>
                {presetMessage.text}
              </div>
            )}

            <div className="button-group">
              <button type="submit" className="submit-button" disabled={isLoading}>
                {isLoading ? 'Saving...' : editingPreset ? 'Update Preset' : 'Add Preset'}
              </button>

              {editingPreset && (
                <button
                  type="button"
                  className="deactivate-button"
                  onClick={resetPresetForm}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
              </>
            )}

            {activeSection === 'account' && (
              <>
                <div className="settings-section">
                  <h3 className="section-title">Account Information</h3>
                  <p className="section-description">
                    View and manage your account details.
                  </p>

                  {!isEditingAccount ? (
                    <>
                      <div className="current-key-info">
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

                      <button
                        type="button"
                        className="submit-button"
                        onClick={handleEditAccount}
                        disabled={isLoading}
                        style={{ marginTop: '16px' }}
                      >
                        Edit Account Information
                      </button>
                    </>
                  ) : (
                    <form onSubmit={handleAccountSubmit} className="settings-form">
                      <div className="form-group">
                        <label htmlFor="accountName">Name</label>
                        <input
                          type="text"
                          id="accountName"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          placeholder="Enter your name"
                          required
                          disabled={isLoading}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="accountEmail">Email</label>
                        <input
                          type="email"
                          id="accountEmail"
                          value={accountEmail}
                          onChange={(e) => setAccountEmail(e.target.value)}
                          placeholder="Enter your email"
                          required
                          disabled={isLoading}
                        />
                        <small className="form-help">
                          This email is used for logging into the application.
                        </small>
                      </div>

                      {accountMessage && (
                        <div className={`message ${accountMessage.type}`}>
                          {accountMessage.text}
                        </div>
                      )}

                      <div className="button-group">
                        <button type="submit" className="submit-button" disabled={isLoading}>
                          {isLoading ? 'Saving...' : 'Update Account'}
                        </button>
                        <button
                          type="button"
                          className="deactivate-button"
                          onClick={handleCancelAccountEdit}
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
