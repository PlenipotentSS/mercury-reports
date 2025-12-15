import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="page">
      <h2 className="page-title">Welcome, {user?.name}!</h2>
      <div className="page-content">
        <p>This is your Mercury Reports dashboard.</p>
        <p>Use the navigation above to access different sections:</p>
        <ul>
          <li>
            <strong>Reports:</strong> View and manage your Mercury transaction reports
          </li>
          <li>
            <strong>Settings:</strong> Configure your Mercury API key and preferences
          </li>
        </ul>
      </div>
    </div>
  )
}
