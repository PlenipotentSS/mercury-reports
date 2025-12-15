import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

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

export default function Settings() {
  const { user } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [keyName, setKeyName] = useState('Mercury API Key')
  const [currentApiKey, setCurrentApiKey] = useState<ApiKey | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    loadCurrentApiKey()
  }, [user])

  const loadCurrentApiKey = async () => {
    if (!user) return

    try {
      const result = await window.api.apiKeyGetActive(user.id)
      if (result.success && result.apiKey) {
        setCurrentApiKey(result.apiKey)
      }
    } catch (error) {
      console.error('Failed to load API key:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    setMessage(null)

    try {
      if (currentApiKey) {
        // Update existing key
        const result = await window.api.apiKeyUpdate(currentApiKey.id, apiKey, keyName)
        if (result.success) {
          setMessage({ type: 'success', text: 'API key updated successfully!' })
          await loadCurrentApiKey()
          setApiKey('')
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to update API key' })
        }
      } else {
        // Create new key
        const result = await window.api.apiKeyCreate(user.id, apiKey, keyName)
        if (result.success) {
          setMessage({ type: 'success', text: 'API key saved successfully!' })
          await loadCurrentApiKey()
          setApiKey('')
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to save API key' })
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeactivate = async () => {
    if (!currentApiKey || !confirm('Are you sure you want to deactivate this API key?')) return

    setIsLoading(true)
    try {
      const result = await window.api.apiKeyDeactivate(currentApiKey.id)
      if (result.success) {
        setMessage({ type: 'success', text: 'API key deactivated successfully!' })
        setCurrentApiKey(null)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to deactivate API key' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key
    return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`
  }

  return (
    <div className="page">
      <h2 className="page-title">Settings</h2>

      <div className="page-content">
        <div className="settings-section">
          <h3 className="section-title">Mercury API Key</h3>
          <p className="section-description">
            Add your Mercury API key to enable report generation and data fetching.
          </p>

          {currentApiKey && (
            <div className="current-key-info">
              <div className="info-row">
                <span className="info-label">Current API Key:</span>
                <span className="info-value">
                  {showKey ? currentApiKey.api_key : maskApiKey(currentApiKey.api_key)}
                  <button
                    className="toggle-visibility-button"
                    onClick={() => setShowKey(!showKey)}
                    type="button"
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Key Name:</span>
                <span className="info-value">{currentApiKey.key_name || 'Unnamed'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Created:</span>
                <span className="info-value">
                  {new Date(currentApiKey.created_at).toLocaleDateString()}
                </span>
              </div>
              {currentApiKey.last_used_at && (
                <div className="info-row">
                  <span className="info-label">Last Used:</span>
                  <span className="info-value">
                    {new Date(currentApiKey.last_used_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="settings-form">
            <div className="form-group">
              <label htmlFor="keyName">Key Name (Optional)</label>
              <input
                type="text"
                id="keyName"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., Mercury Production Key"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="apiKey">
                {currentApiKey ? 'New API Key' : 'API Key'}
              </label>
              <input
                type="password"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Mercury API key"
                required
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
                {isLoading ? 'Saving...' : currentApiKey ? 'Update API Key' : 'Save API Key'}
              </button>

              {currentApiKey && (
                <button
                  type="button"
                  className="deactivate-button"
                  onClick={handleDeactivate}
                  disabled={isLoading}
                >
                  Deactivate Key
                </button>
              )}
            </div>
          </form>
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
