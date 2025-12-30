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
  const [activeSection, setActiveSection] = useState<'companies' | 'presets' | 'account' | 'mercury-accounts' | 'csv-mappings'>('companies')
  const [isEditingAccount, setIsEditingAccount] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [accountMessage, setAccountMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Mercury Accounts state
  const [mercuryAccountCompany, setMercuryAccountCompany] = useState<Company | null>(null)
  const [mercuryAccounts, setMercuryAccounts] = useState<any[]>([])
  const [mercuryAccountMappings, setMercuryAccountMappings] = useState<{ [accountId: number]: number }>({})
  const [mercuryCompanyLedgerRecords, setMercuryCompanyLedgerRecords] = useState<{ [key: string]: string }>({})
  const [mercuryMessage, setMercuryMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSyncingAccounts, setIsSyncingAccounts] = useState(false)

  // CSV Mappings state
  const [csvMappingCompany, setCsvMappingCompany] = useState<Company | null>(null)
  const [csvExportType, setCsvExportType] = useState<'quickbooks_deposits' | 'quickbooks_checks' | 'quickbooks_credit_card'>('quickbooks_deposits')
  const [csvMappings, setCsvMappings] = useState<{ [key: string]: string }>({})
  const [csvMappingMessage, setCsvMappingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadCompanies()
    loadLedgerPresets()
  }, [user])

  useEffect(() => {
    if (ledgerCompany) {
      loadLedgerRecords(ledgerCompany.id)
    }
  }, [ledgerCompany])

  // Keyboard shortcut handler for saving
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+S (Mac) or Ctrl+S (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault()

        // Save based on active section - just click the submit button for all sections
        const submitButton = document.querySelector('.submit-button') as HTMLButtonElement
        if (submitButton && !submitButton.disabled) {
          submitButton.click()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

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

  // Mercury Accounts functions
  const loadMercuryAccounts = async (companyId: number) => {
    try {
      const result = await window.api.mercuryAccountGetByCompanyId(companyId)
      if (result.success && result.accounts) {
        setMercuryAccounts(result.accounts)

        // Load mappings for each account
        const mappings: { [accountId: number]: number } = {}
        for (const account of result.accounts) {
          const mappingResult = await window.api.mercuryAccountGetLedgerMappings(account.id)
          if (mappingResult.success && mappingResult.mappings && mappingResult.mappings.length > 0) {
            mappings[account.id] = mappingResult.mappings[0].ledger_preset_id
          }
        }
        setMercuryAccountMappings(mappings)

        // Load company ledger records
        const ledgerRecordsResult = await window.api.companyLedgerGetAll(companyId)
        if (ledgerRecordsResult.success && ledgerRecordsResult.records) {
          const records: { [key: string]: string } = {}
          for (const record of ledgerRecordsResult.records) {
            records[record.key] = record.value
          }
          setMercuryCompanyLedgerRecords(records)
        }
      }
    } catch (error) {
      console.error('Failed to load Mercury accounts:', error)
    }
  }

  const handleSyncMercuryAccounts = async () => {
    if (!mercuryAccountCompany) return

    setIsSyncingAccounts(true)
    setMercuryMessage(null)

    try {
      const result = await window.api.mercuryAccountSyncFromApi(
        mercuryAccountCompany.id,
        mercuryAccountCompany.api_key
      )
      if (result.success) {
        setMercuryMessage({
          type: 'success',
          text: `Successfully synced ${result.syncedCount} account(s) from Mercury`
        })
        await loadMercuryAccounts(mercuryAccountCompany.id)
      } else {
        setMercuryMessage({ type: 'error', text: result.error || 'Failed to sync accounts' })
      }
    } catch (error) {
      setMercuryMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsSyncingAccounts(false)
    }
  }

  const handleSetLedgerMapping = async (mercuryAccountId: number, ledgerPresetId: number) => {
    try {
      const result = await window.api.mercuryAccountSetLedgerMapping(mercuryAccountId, ledgerPresetId)
      if (result.success) {
        setMercuryAccountMappings((prev) => ({
          ...prev,
          [mercuryAccountId]: ledgerPresetId
        }))
        setMercuryMessage({ type: 'success', text: 'Ledger mapping updated successfully!' })
      } else {
        setMercuryMessage({ type: 'error', text: result.error || 'Failed to update mapping' })
      }
    } catch (error) {
      setMercuryMessage({ type: 'error', text: 'An unexpected error occurred' })
    }
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

  // CSV Mappings functions
  const loadCsvMappings = async (companyId: number, exportType: string) => {
    try {
      const result = await window.api.csvMappingGetByCompanyAndType(companyId, exportType)
      if (result.success && result.mappings) {
        const mappingsMap: { [key: string]: string } = {}
        result.mappings.forEach((mapping) => {
          mappingsMap[mapping.field_name] = mapping.template
        })
        setCsvMappings(mappingsMap)
      } else {
        setCsvMappings({})
      }
    } catch (error) {
      console.error('Failed to load CSV mappings:', error)
    }
  }

  const handleCsvMappingChange = (fieldName: string, template: string) => {
    setCsvMappings((prev) => ({ ...prev, [fieldName]: template }))
  }

  // Strip all whitespace and line breaks from template strings
  // This allows users to write multiline templates for readability while keeping the stored template clean
  const stripWhitespaceFromTemplate = (template: string): string => {
    return template.replace(/\s+/g, ' ').trim()
  }

  const handleSaveCsvMappings = async () => {
    if (!csvMappingCompany) return

    setIsLoading(true)
    setCsvMappingMessage(null)

    try {
      // Get all field names for the current export type
      const fields = getCsvFieldsForExportType(csvExportType)

      for (const field of fields) {
        // Get the current value from the DOM textarea element to ensure we have the latest value
        const textareaElement = document.getElementById(field.key) as HTMLTextAreaElement
        // Use textarea value if it exists (even if empty), otherwise fall back to state or default
        const template = textareaElement ? textareaElement.value : (csvMappings[field.key] ?? field.default)
        // Strip whitespace and line breaks before saving
        const cleanedTemplate = stripWhitespaceFromTemplate(template)

        console.log(`Saving ${field.key}:`, cleanedTemplate) // Debug log

        await window.api.csvMappingUpsert(
          csvMappingCompany.id,
          csvExportType,
          field.key,
          cleanedTemplate
        )
      }
      setCsvMappingMessage({ type: 'success', text: 'CSV mappings saved successfully!' })
      // Reload the mappings to show the cleaned version
      if (csvMappingCompany) {
        loadCsvMappings(csvMappingCompany.id, csvExportType)
      }
    } catch (error) {
      console.error('Save error:', error) // Debug log
      setCsvMappingMessage({ type: 'error', text: 'Failed to save CSV mappings' })
    } finally {
      setIsLoading(false)
    }
  }

  const getCsvFieldsForExportType = (exportType: string) => {
    switch (exportType) {
      case 'quickbooks_deposits':
        return [
          { field: 'Deposit To', key: 'deposit_to', default: '{ledgerLookup(gl_name_mercury_checking)}', description: 'The account where funds are deposited' },
          { field: 'Date', key: 'date', default: '{txn.createdAt}', description: 'Transaction date' },
          { field: 'Memo', key: 'memo', default: '{txn.bankDescription} - {txn.categoryData.name}', description: 'Main transaction memo' },
          { field: 'Received From', key: 'received_from', default: '{txn.counterpartyName}', description: 'Who the payment is from' },
          { field: 'From Account', key: 'from_account', default: '{txn.generalLedgerCodeName}', description: 'Source account/GL code' },
          { field: 'Line Memo', key: 'line_memo', default: '{txn.bankDescription}', description: 'Line item memo' },
          { field: 'Check No.', key: 'check_no', default: '', description: 'Check number (optional)' },
          { field: 'Payment Method', key: 'payment_method', default: 'Cash', description: 'Payment method' },
          { field: 'Class', key: 'class', default: '', description: 'QuickBooks class (optional)' },
          { field: 'Amount', key: 'amount', default: '{txn.amount}', description: 'Transaction amount' }
        ]
      case 'quickbooks_checks':
        return [
          { field: 'Bank Account', key: 'bank_account', default: '{ledgerLookup(gl_name_mercury_checking)}', description: 'Bank account to pay from' },
          { field: 'Date', key: 'date', default: '{txn.createdAt}', description: 'Transaction date' },
          { field: 'Check Number', key: 'check_number', default: '', description: 'Check number (optional)' },
          { field: 'Payee', key: 'payee', default: '{txn.counterpartyName}', description: 'Who the check is paid to' },
          { field: 'Memo', key: 'memo', default: '{txn.bankDescription}', description: 'Transaction memo' },
          { field: 'Account', key: 'account', default: '{txn.generalLedgerCodeName}', description: 'Expense account/GL code' },
          { field: 'Amount', key: 'amount', default: '{txn.amount}', description: 'Transaction amount' },
          { field: 'Class', key: 'class', default: '', description: 'QuickBooks class (optional)' },
          { field: 'Expense Amount', key: 'expense_amount', default: '', description: 'Additional expense amount (optional)' },
          { field: 'Expense Memo', key: 'expense_memo', default: '', description: 'Expense line memo (optional)' },
          { field: 'Expense Customer:Job', key: 'expense_customer_job', default: '', description: 'Customer/Job for expense (optional)' }
        ]
      case 'quickbooks_credit_card':
        return [
          { field: 'Credit Card', key: 'credit_card', default: '{ledgerLookup(gl_name_mercury_credit_card)}', description: 'Credit card account' },
          { field: 'Date', key: 'date', default: '{txn.createdAt}', description: 'Transaction date' },
          { field: 'Payee', key: 'payee', default: '{txn.counterpartyName}', description: 'Merchant/payee name' },
          { field: 'Ref Number', key: 'ref_number', default: '{txn.id}', description: 'Reference number' },
          { field: 'Account', key: 'account', default: '{txn.generalLedgerCodeName}', description: 'Expense account/GL code' },
          { field: 'Amount', key: 'amount', default: '{txn.amount}', description: 'Transaction amount' },
          { field: 'Customer:Job', key: 'customer_job', default: '{txn.categoryData.name}', description: 'Customer/Job for expense' },
          { field: 'Expense Billable', key: 'expense_billable', default: '', description: 'Billable status (optional)' },
          { field: 'Class', key: 'class', default: '', description: 'QuickBooks class (optional)' },
          { field: 'Item', key: 'item', default: '', description: 'Item/Product (optional)' },
          { field: 'Item Description', key: 'item_description', default: '', description: 'Item description (optional)' },
          { field: 'Item Quantity', key: 'item_quantity', default: '1', description: 'Item quantity' },
          { field: 'Item Cost', key: 'item_cost', default: '', description: 'Item cost (optional)' },
          { field: 'Item Amount', key: 'item_amount', default: '', description: 'Item amount (optional)' },
          { field: 'Item Customer:Job', key: 'item_customer_job', default: '', description: 'Item customer/job (optional)' }
        ]
      default:
        return []
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
              className={`settings-nav-item ${activeSection === 'mercury-accounts' ? 'active' : ''}`}
              onClick={() => setActiveSection('mercury-accounts')}
            >
              Mercury Accounts
            </button>
            <button
              className={`settings-nav-item ${activeSection === 'csv-mappings' ? 'active' : ''}`}
              onClick={() => setActiveSection('csv-mappings')}
            >
              CSV Mappings
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

            {activeSection === 'mercury-accounts' && (
              <>
                <div className="settings-section">
                  <h3 className="section-title">Mercury Account Ledger Mappings</h3>
                  <p className="section-description">
                    Assign ledger preset keys to your Mercury accounts. These mappings are used when
                    exporting transactions to QuickBooks CSV format.
                  </p>

                  {companies.length > 0 && (
                    <>
                      <div className="form-group">
                        <label htmlFor="mercuryAccountCompanySelect">Select Company</label>
                        <select
                          id="mercuryAccountCompanySelect"
                          value={mercuryAccountCompany?.id || ''}
                          onChange={(e) => {
                            const company = companies.find((c) => c.id === Number(e.target.value))
                            setMercuryAccountCompany(company || null)
                            if (company) {
                              loadMercuryAccounts(company.id)
                            } else {
                              setMercuryAccounts([])
                              setMercuryAccountMappings({})
                              setMercuryCompanyLedgerRecords({})
                            }
                            setMercuryMessage(null)
                          }}
                        >
                          <option value="">-- Select a Company --</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {mercuryAccountCompany && (
                        <>
                          <button
                            type="button"
                            className="submit-button"
                            onClick={handleSyncMercuryAccounts}
                            disabled={isSyncingAccounts}
                            style={{ marginBottom: '20px' }}
                          >
                            {isSyncingAccounts ? 'Syncing...' : 'Sync Accounts from Mercury'}
                          </button>

                          {mercuryMessage && (
                            <div className={`message ${mercuryMessage.type}`} style={{ marginBottom: '20px' }}>
                              {mercuryMessage.text}
                            </div>
                          )}

                          {mercuryAccounts.filter(account => account.status?.toLowerCase() === 'active').length > 0 ? (
                            <div>
                              <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', color: '#2d3748' }}>
                                Account Ledger Mappings
                              </h4>
                              {mercuryAccounts
                                .filter(account => account.status?.toLowerCase() === 'active')
                                .map((account) => {
                                  const selectedPresetId = mercuryAccountMappings[account.id]
                                  const selectedPreset = selectedPresetId
                                    ? ledgerPresets.find(p => p.id === selectedPresetId)
                                    : null
                                  const ledgerRecordValue = selectedPreset
                                    ? mercuryCompanyLedgerRecords[selectedPreset.key]
                                    : null

                                  return (
                                    <div key={account.id} className="current-key-info" style={{ marginBottom: '16px' }}>
                                      <div className="info-row">
                                        <span className="info-label">Account Name:</span>
                                        <span className="info-value">{account.name}</span>
                                      </div>
                                      {account.nickname && (
                                        <div className="info-row">
                                          <span className="info-label">Nickname:</span>
                                          <span className="info-value">{account.nickname}</span>
                                        </div>
                                      )}
                                      <div className="info-row">
                                        <span className="info-label">Type:</span>
                                        <span className="info-value">{account.account_type || 'N/A'}</span>
                                      </div>
                                      {selectedPreset && ledgerRecordValue && (
                                        <div className="info-row">
                                          <span className="info-label">Ledger Value:</span>
                                          <span className="info-value" style={{ fontWeight: 600, color: '#667eea' }}>
                                            {ledgerRecordValue}
                                          </span>
                                        </div>
                                      )}
                                      <div className="form-group" style={{ marginTop: '12px' }}>
                                        <label htmlFor={`ledger-preset-${account.id}`}>
                                          Assign Ledger Preset
                                        </label>
                                        <select
                                          id={`ledger-preset-${account.id}`}
                                          value={mercuryAccountMappings[account.id] || ''}
                                          onChange={(e) => {
                                            const presetId = Number(e.target.value)
                                            if (presetId) {
                                              handleSetLedgerMapping(account.id, presetId)
                                            }
                                          }}
                                        >
                                          <option value="">-- Select a Ledger Preset --</option>
                                          {ledgerPresets.map((preset) => (
                                            <option key={preset.id} value={preset.id}>
                                              {preset.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                          ) : (
                            <p style={{ color: '#718096', fontSize: '14px' }}>
                              No active accounts found. Click "Sync Accounts from Mercury" to load accounts from the API.
                            </p>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {companies.length === 0 && (
                    <p style={{ color: '#718096', fontSize: '14px' }}>
                      No companies configured. Please add a company in the "Companies & API Keys" section first.
                    </p>
                  )}
                </div>
              </>
            )}

            {activeSection === 'csv-mappings' && (
              <>
                <div className="settings-section">
                  <h3 className="section-title">QuickBooks CSV Mappings</h3>
                  <p className="section-description">
                    Configure custom field mappings for QuickBooks CSV exports. Use template variables like {`{txn.amount}`}, {`{txn.bankDescription}`}, {`{txn.counterpartyName}`}, etc.
                  </p>

                  {companies.length > 0 && (
                    <>
                      <div className="form-group">
                        <label htmlFor="csvMappingCompanySelect">Select Company</label>
                        <select
                          id="csvMappingCompanySelect"
                          value={csvMappingCompany?.id || ''}
                          onChange={(e) => {
                            const company = companies.find((c) => c.id === Number(e.target.value))
                            setCsvMappingCompany(company || null)
                            if (company) {
                              loadCsvMappings(company.id, csvExportType)
                            } else {
                              setCsvMappings({})
                            }
                            setCsvMappingMessage(null)
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

                      {csvMappingCompany && (
                        <>
                          <div className="form-group">
                            <label htmlFor="csvExportTypeSelect">Export Type</label>
                            <select
                              id="csvExportTypeSelect"
                              value={csvExportType}
                              onChange={(e) => {
                                const newExportType = e.target.value as 'quickbooks_deposits' | 'quickbooks_checks' | 'quickbooks_credit_card'
                                setCsvExportType(newExportType)
                                loadCsvMappings(csvMappingCompany.id, newExportType)
                                setCsvMappingMessage(null)
                              }}
                              className="filter-input"
                              style={{ width: '100%' }}
                            >
                              <option value="quickbooks_deposits">QuickBooks Deposits</option>
                              <option value="quickbooks_checks">QuickBooks Checks</option>
                              <option value="quickbooks_credit_card">QuickBooks Credit Card</option>
                            </select>
                          </div>

                          <div style={{ marginTop: '20px' }}>
                            <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', color: '#2d3748' }}>
                              Field Mappings
                            </h4>
                            <div style={{ fontSize: '12px', color: '#718096', marginBottom: '16px', lineHeight: '1.6' }}>
                              <p style={{ marginTop: 0, marginBottom: '8px' }}>
                                <strong>Transaction Variables:</strong> {`{txn.amount}`}, {`{txn.createdAt}`}, {`{txn.bankDescription}`}, {`{txn.counterpartyName}`}, {`{txn.categoryData.name}`}, {`{txn.generalLedgerCodeName}`}
                              </p>
                              <p style={{ marginTop: 0, marginBottom: '8px' }}>
                                <strong>Ledger Variables:</strong> {`{glNameMercuryChecking}`}, {`{glNameMercuryCreditCard}`}
                              </p>
                              <p style={{ marginTop: 0, marginBottom: '8px' }}>
                                <strong>Ledger Lookup Function:</strong> {`{ledgerLookup(gl_name_mercury_checking)}`} - Looks up a ledger record by key for the current company
                              </p>
                              <p style={{ marginTop: 0, marginBottom: '8px' }}>
                                <strong>Account Lookup Function:</strong> {`{lookup:counterpartyName}`} - Dynamically looks up the ledger record value for a Mercury account based on the transaction's counterparty name
                              </p>
                              <p style={{ marginTop: 0, marginBottom: '8px' }}>
                                <strong>Or Function:</strong> {`{or(lookup:counterpartyName, ledgerLookup(gl_name_mercury_checking), txn.generalLedgerCodeName)}`} - Returns the first non-empty value from the list
                              </p>
                              <p style={{ marginTop: 0, marginBottom: '8px' }}>
                                <strong>If Function:</strong> {`{if(txn.counterpartyName=="Mercury Checking", value1, value2)}`} - Returns value1 if condition is true, otherwise value2. String literals must be quoted. Supports == and != operators
                              </p>
                              <p style={{ marginTop: 0, marginBottom: '8px' }}>
                                <strong>Ledger Preset Key Function:</strong> {`{ledgerPresetKey(lookup:counterpartyName)}`} - Returns the ledger preset key for a Mercury account. Can be nested: {`{ledgerLookup(ledgerPresetKey(lookup:counterpartyName))}`}
                              </p>
                              <p style={{ marginTop: 0, marginBottom: 0, color: '#718096', fontSize: '13px', fontStyle: 'italic' }}>
                                Note: Templates can be written on multiple lines for readability. All whitespace and line breaks will be automatically removed when saved.
                              </p>
                            </div>

                            {getCsvFieldsForExportType(csvExportType).map((field) => (
                              <div key={field.key} className="form-group">
                                <label htmlFor={field.key}>
                                  {field.field}
                                  <small style={{ display: 'block', fontWeight: 'normal', color: '#718096', marginTop: '4px' }}>
                                    {field.description}
                                  </small>
                                </label>
                                <textarea
                                  id={field.key}
                                  value={csvMappings[field.key] ?? field.default}
                                  onChange={(e) => handleCsvMappingChange(field.key, e.target.value)}
                                  placeholder={field.default}
                                  disabled={isLoading}
                                  rows={3}
                                  style={{
                                    width: '100%',
                                    fontFamily: 'monospace',
                                    fontSize: '13px',
                                    resize: 'vertical',
                                    minHeight: '60px'
                                  }}
                                />
                              </div>
                            ))}

                            {csvMappingMessage && (
                              <div className={`message ${csvMappingMessage.type}`}>{csvMappingMessage.text}</div>
                            )}

                            <button
                              type="button"
                              className="submit-button"
                              onClick={handleSaveCsvMappings}
                              disabled={isLoading}
                              style={{ marginTop: '12px' }}
                            >
                              {isLoading ? 'Saving...' : 'Save CSV Mappings'}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {companies.length === 0 && (
                    <p style={{ color: '#718096', fontStyle: 'italic' }}>
                      Please add a company first to configure CSV mappings.
                    </p>
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
