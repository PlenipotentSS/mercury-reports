/**
 * Example usage of API Key database functions
 * This file demonstrates how to manage Mercury API keys in the database
 */

import {
  createUser,
  createApiKey,
  getActiveApiKey,
  getApiKeysByUserId,
  updateApiKey,
  deactivateApiKey,
  updateApiKeyLastUsed,
  deleteApiKey
} from '../queries'

// Example: Creating a user and storing their Mercury API key
export function setupUserWithApiKey(name: string, email: string, mercuryApiKey: string): number {
  // Create the user
  const userId = createUser(name, email)

  // Store their Mercury API key
  const apiKeyId = createApiKey(userId, mercuryApiKey, 'Mercury Production Key')

  console.log(`User ${name} created with API key stored (ID: ${apiKeyId})`)

  return userId
}

// Example: Getting a user's active Mercury API key
export function getMercuryApiKey(userId: number): string | null {
  const apiKey = getActiveApiKey(userId)

  if (!apiKey) {
    console.log(`No active API key found for user ${userId}`)
    return null
  }

  // Update last used timestamp
  updateApiKeyLastUsed(apiKey.id)

  return apiKey.api_key
}

// Example: Rotating an API key (creating a new one and deactivating the old)
export function rotateApiKey(userId: number, newApiKey: string): number {
  // Get all active keys for the user
  const activeKeys = getApiKeysByUserId(userId, true)

  // Deactivate all existing active keys
  activeKeys.forEach((key) => {
    deactivateApiKey(key.id)
    console.log(`Deactivated old API key: ${key.key_name || key.id}`)
  })

  // Create new active key
  const newKeyId = createApiKey(userId, newApiKey, 'Mercury Production Key (Rotated)')

  console.log(`New API key created with ID: ${newKeyId}`)

  return newKeyId
}

// Example: Updating an existing API key
export function updateExistingApiKey(apiKeyId: number, newKey: string): void {
  updateApiKey(apiKeyId, newKey, 'Mercury Updated Key')
  console.log(`API key ${apiKeyId} has been updated`)
}

// Example: Listing all API keys for a user (including inactive ones)
export function listAllUserApiKeys(userId: number): void {
  const allKeys = getApiKeysByUserId(userId, false)

  console.log(`API Keys for user ${userId}:`)
  allKeys.forEach((key) => {
    console.log(`
      ID: ${key.id}
      Name: ${key.key_name || 'Unnamed'}
      Active: ${key.is_active ? 'Yes' : 'No'}
      Created: ${key.created_at}
      Last Used: ${key.last_used_at || 'Never'}
    `)
  })
}

// Example: Removing an API key
export function removeApiKey(apiKeyId: number): void {
  deleteApiKey(apiKeyId)
  console.log(`API key ${apiKeyId} has been deleted`)
}
