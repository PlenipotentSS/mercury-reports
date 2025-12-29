import type { Transaction } from '../types'

export interface LedgerLookupContext {
  ledgerRecords: { [key: string]: string }
  mercuryAccountMappings?: { [accountId: number]: number }
  ledgerPresets?: Array<{ id: number; key: string; label: string }>
  mercuryAccounts?: Array<{ id: number; external_id: string; name: string }>
}

/**
 * Process a template string by replacing variables with actual values
 * Supports nested object access like {txn.categoryData.name}
 * Supports ledger lookups like {lookup:counterpartyName}
 * Supports ledger record lookups like {ledgerLookup(gl_name_mercury_checking)}
 * Supports ledger preset key lookup like {ledgerPresetKey(lookup:counterpartyName)}
 * Supports or function like {or(glNameMercuryChecking, lookup:counterpartyName)}
 * Supports if function like {if(txn.counterpartyName==Mercury Checking, value1, value2)}
 * Supports concat function like {concat(txn.counterpartyName, " - ", txn.categoryData.name)}
 */
export function processTemplate(
  template: string,
  txn: Transaction,
  additionalVars: Record<string, string> = {},
  ledgerContext?: LedgerLookupContext
): string {
  let result = template

  // Replace if functions like {if(condition, trueValue, falseValue)}
  const ifMatches = findFunctionCalls(template, 'if')
  if (ifMatches.length > 0) {
    ifMatches.forEach((match) => {
      const argsString = match.slice(4, -2) // Remove '{if(' and ')}'

      // Split by comma but respect nested parentheses and quotes
      const args = splitByComma(argsString)

      if (args.length === 3) {
        const condition = args[0].trim()
        const trueValue = args[1].trim()
        const falseValue = args[2].trim()

        // Parse condition (e.g., "txn.counterpartyName==Mercury Checking")
        const conditionResult = evaluateCondition(condition, txn, additionalVars, ledgerContext)

        if (conditionResult) {
          const resolvedTrue = resolveValue(trueValue, txn, additionalVars, ledgerContext)
          result = result.replace(match, resolvedTrue)
        } else {
          const resolvedFalse = resolveValue(falseValue, txn, additionalVars, ledgerContext)
          result = result.replace(match, resolvedFalse)
        }
      }
    })
  }

  // Replace or functions like {or(var1, var2, var3)}
  // Use a helper to find or() functions with proper nested parenthesis handling
  const orMatches = findFunctionCalls(result, 'or')
  if (orMatches.length > 0) {
    orMatches.forEach((match) => {
      const argsString = match.slice(4, -2) // Remove '{or(' and ')}'

      // Split by comma while respecting nested parentheses and quotes
      const args = splitByComma(argsString)

      // Evaluate each argument and return the first non-empty value
      let orValue = ''
      for (const arg of args) {
        const resolvedValue = resolveValue(arg.trim(), txn, additionalVars, ledgerContext)
        if (resolvedValue) {
          orValue = resolvedValue
          break
        }
      }

      result = result.replace(match, orValue)
    })
  }

  // Replace concat functions like {concat(var1, " - ", var2)}
  const concatMatches = findFunctionCalls(result, 'concat')
  if (concatMatches.length > 0) {
    concatMatches.forEach((match) => {
      const argsString = match.slice(8, -2) // Remove '{concat(' and ')}'

      // Split by comma while respecting nested parentheses and quotes
      const args = splitByComma(argsString)

      // Evaluate each argument and concatenate them
      const concatenatedValue = args
        .map((arg) => resolveValue(arg.trim(), txn, additionalVars, ledgerContext))
        .join('')

      result = result.replace(match, concatenatedValue)
    })
  }

  // Replace ledgerPresetKey functions like {ledgerPresetKey(lookup:counterpartyName)}
  // This must be processed BEFORE ledgerLookup so nested functions work
  if (ledgerContext) {
    const ledgerPresetKeyMatches = findFunctionCalls(result, 'ledgerPresetKey')
    if (ledgerPresetKeyMatches.length > 0) {
      ledgerPresetKeyMatches.forEach((match) => {
        const arg = match.slice(17, -2) // Remove '{ledgerPresetKey(' and ')}'
        const presetKey = getLedgerPresetKey(arg.trim(), txn, additionalVars, ledgerContext)
        result = result.replace(match, presetKey || '')
      })
    }
  }

  // Replace ledgerLookup functions like {ledgerLookup(gl_name_mercury_checking)}
  if (ledgerContext) {
    const ledgerLookupMatches = findFunctionCalls(result, 'ledgerLookup')
    if (ledgerLookupMatches.length > 0) {
      ledgerLookupMatches.forEach((match) => {
        const key = match.slice(14, -2) // Remove '{ledgerLookup(' and ')}'
        const value = ledgerContext.ledgerRecords[key] || ''
        result = result.replace(match, value)
      })
    }
  }

  // Replace lookup functions like {lookup:counterpartyName}
  if (ledgerContext) {
    const lookupMatches = result.match(/\{lookup:[^}]+\}/g)
    if (lookupMatches) {
      lookupMatches.forEach((match) => {
        const lookupKey = match.slice(8, -1) // Remove '{lookup:' and '}'
        const value = performLedgerLookup(txn, lookupKey, ledgerContext)
        result = result.replace(match, value || '')
      })
    }
  }

  // Replace transaction variables like {txn.amount}, {txn.categoryData.name}, etc.
  const txnMatches = result.match(/\{txn\.[^}]+\}/g)
  if (txnMatches) {
    txnMatches.forEach((match) => {
      const path = match.slice(5, -1) // Remove '{txn.' and '}'
      const value = getNestedValue(txn, path)
      result = result.replace(match, value !== null && value !== undefined ? String(value) : '')
    })
  }

  // Replace additional variables like {glNameMercuryChecking}
  Object.entries(additionalVars).forEach(([key, value]) => {
    const pattern = `{${key}}`
    result = result.replaceAll(pattern, value || '')
  })

  return result
}

/**
 * Resolve a single value from a template argument
 * Can handle: plain variables, lookup:property, txn.property, ledgerLookup(key), nested functions, or raw strings (quoted)
 */
function resolveValue(
  arg: string,
  txn: Transaction,
  additionalVars: Record<string, string>,
  ledgerContext?: LedgerLookupContext
): string {
  // Handle quoted string literals (single or double quotes)
  if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
    return arg.slice(1, -1) // Remove quotes and return the raw string
  }

  // Handle nested function calls (if, or, concat, etc.) by wrapping in braces and processing
  if (arg.match(/^(if|or|concat|ledgerLookup|ledgerPresetKey)\(/)) {
    const wrappedArg = `{${arg}}`
    return processTemplate(wrappedArg, txn, additionalVars, ledgerContext)
  }

  // Handle ledgerLookup(key) function - this is now redundant but kept for clarity
  if (arg.startsWith('ledgerLookup(') && arg.endsWith(')')) {
    const key = arg.slice(13, -1) // Remove 'ledgerLookup(' and ')'
    if (ledgerContext) {
      return ledgerContext.ledgerRecords[key] || ''
    }
    return ''
  }

  // Handle lookup:property
  if (arg.startsWith('lookup:')) {
    const lookupKey = arg.slice(7) // Remove 'lookup:'
    if (ledgerContext) {
      return performLedgerLookup(txn, lookupKey, ledgerContext) || ''
    }
    return ''
  }

  // Handle txn.property
  if (arg.startsWith('txn.')) {
    const path = arg.slice(4) // Remove 'txn.'
    const value = getNestedValue(txn, path)
    return value !== null && value !== undefined ? String(value) : ''
  }

  // Handle plain variables (from additionalVars)
  return additionalVars[arg] || ''
}

/**
 * Perform a ledger lookup based on a transaction property
 * This looks up the Mercury account mapping for a given counterparty/account,
 * then retrieves the corresponding ledger preset value
 *
 * Example: {lookup:counterpartyName} will:
 * 1. Get the counterparty name from the transaction
 * 2. Find the Mercury account that matches that name
 * 3. Get the ledger preset mapping for that account
 * 4. Retrieve the ledger record value using the preset key
 */
function performLedgerLookup(
  txn: Transaction,
  lookupProperty: string,
  context: LedgerLookupContext
): string | null {
  const { ledgerRecords, mercuryAccountMappings, ledgerPresets, mercuryAccounts } = context

  if (!mercuryAccountMappings || !ledgerPresets || !mercuryAccounts) {
    return null
  }

  // Get the value to lookup (e.g., counterpartyName)
  const lookupValue = getNestedValue(txn, lookupProperty)
  if (!lookupValue) {
    return null
  }

  // Find the Mercury account that matches this value
  const matchedAccount = mercuryAccounts.find(
    (account) =>
      account.name === lookupValue ||
      account.external_id === lookupValue ||
      (account as any).nickname === lookupValue
  )

  if (!matchedAccount) {
    return null
  }

  // Get the ledger preset mapping for this account
  const ledgerPresetId = mercuryAccountMappings[matchedAccount.id]
  if (!ledgerPresetId) {
    return null
  }

  // Find the ledger preset
  const ledgerPreset = ledgerPresets.find((preset) => preset.id === ledgerPresetId)
  if (!ledgerPreset) {
    return null
  }

  // Get the ledger record value using the preset key
  return ledgerRecords[ledgerPreset.key] || null
}

/**
 * Get the ledger preset key for a Mercury account
 * This is similar to performLedgerLookup but returns the preset key instead of the final value
 *
 * Example: {ledgerPresetKey(lookup:counterpartyName)} returns the ledger preset key
 * which can then be used in: {ledgerLookup(ledgerPresetKey(lookup:counterpartyName))}
 */
function getLedgerPresetKey(
  arg: string,
  txn: Transaction,
  additionalVars: Record<string, string>,
  context: LedgerLookupContext
): string | null {
  const { mercuryAccountMappings, ledgerPresets, mercuryAccounts } = context

  if (!mercuryAccountMappings || !ledgerPresets || !mercuryAccounts) {
    return null
  }

  let lookupValue: any = null

  // Handle lookup:property syntax
  if (arg.startsWith('lookup:')) {
    const lookupKey = arg.slice(7) // Remove 'lookup:'
    lookupValue = getNestedValue(txn, lookupKey)
  }
  // Handle txn.property syntax
  else if (arg.startsWith('txn.')) {
    const path = arg.slice(4) // Remove 'txn.'
    lookupValue = getNestedValue(txn, path)
  }
  // Handle plain variables
  else {
    lookupValue = additionalVars[arg]
  }

  if (!lookupValue) {
    return null
  }

  // Find the Mercury account that matches this value
  const matchedAccount = mercuryAccounts.find(
    (account) =>
      account.name === lookupValue ||
      account.external_id === lookupValue ||
      (account as any).nickname === lookupValue
  )

  if (!matchedAccount) {
    return null
  }

  // Get the ledger preset mapping for this account
  const ledgerPresetId = mercuryAccountMappings[matchedAccount.id]
  if (!ledgerPresetId) {
    return null
  }

  // Find the ledger preset and return its key
  const ledgerPreset = ledgerPresets.find((preset) => preset.id === ledgerPresetId)
  if (!ledgerPreset) {
    return null
  }

  return ledgerPreset.key
}

/**
 * Get a nested property value from an object using dot notation
 * Example: getNestedValue(txn, 'categoryData.name') returns txn.categoryData?.name
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (current === null || current === undefined) {
      return null
    }
    current = current[key]
  }

  return current
}

/**
 * Find all function calls of a specific name in a template string
 * Handles nested parentheses correctly
 * Example: findFunctionCalls("{or(a, b(c))}", "or") => ["{or(a, b(c))}"]
 */
function findFunctionCalls(template: string, functionName: string): string[] {
  const matches: string[] = []
  const searchPattern = `{${functionName}(`
  let i = 0

  while (i < template.length) {
    // Find the next occurrence of the function pattern
    const startIndex = template.indexOf(searchPattern, i)
    if (startIndex === -1) break

    // Track parenthesis depth to find the matching closing parenthesis
    let depth = 0
    let j = startIndex + searchPattern.length - 1 // Start at the opening '('

    while (j < template.length) {
      if (template[j] === '(') {
        depth++
      } else if (template[j] === ')') {
        depth--
        if (depth === 0) {
          // Found the matching closing parenthesis
          // Now check if it's followed by '}'
          if (j + 1 < template.length && template[j + 1] === '}') {
            // Extract the full function call including braces
            matches.push(template.substring(startIndex, j + 2))
            i = j + 2
            break
          } else {
            // Not a valid function call, continue searching
            i = startIndex + 1
            break
          }
        }
      }
      j++
    }

    // If we didn't find a match, move past this position
    if (j >= template.length) {
      i = startIndex + 1
    }
  }

  return matches
}

/**
 * Split a string by comma while respecting nested parentheses and quotes
 * Example: "a, b(c, d), e" => ["a", "b(c, d)", "e"]
 */
function splitByComma(str: string): string[] {
  const result: string[] = []
  let current = ''
  let depth = 0
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < str.length; i++) {
    const char = str[i]

    if ((char === '"' || char === "'") && (i === 0 || str[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar) {
        inQuotes = false
        quoteChar = ''
      }
      current += char
    } else if (char === '(' && !inQuotes) {
      depth++
      current += char
    } else if (char === ')' && !inQuotes) {
      depth--
      current += char
    } else if (char === ',' && depth === 0 && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  if (current) {
    result.push(current)
  }

  return result
}

/**
 * Evaluate a condition string
 * Supports: ==, !=
 * String literals must be quoted (single or double quotes)
 * Example: txn.counterpartyName=="Mercury Checking" returns true if they match
 * Example: txn.status==txn.kind compares two variables
 */
function evaluateCondition(
  condition: string,
  txn: Transaction,
  additionalVars: Record<string, string>,
  ledgerContext?: LedgerLookupContext
): boolean {
  // Check for != operator
  if (condition.includes('!=')) {
    const parts = splitComparison(condition, '!=')
    if (parts.length === 2) {
      const leftValue = resolveComparisonValue(parts[0].trim(), txn, additionalVars, ledgerContext)
      const rightValue = resolveComparisonValue(parts[1].trim(), txn, additionalVars, ledgerContext)
      return leftValue !== rightValue
    }
  }

  // Check for == operator
  if (condition.includes('==')) {
    const parts = splitComparison(condition, '==')
    if (parts.length === 2) {
      const leftValue = resolveComparisonValue(parts[0].trim(), txn, additionalVars, ledgerContext)
      const rightValue = resolveComparisonValue(parts[1].trim(), txn, additionalVars, ledgerContext)
      return leftValue === rightValue
    }
  }

  // If no operator found, just check if the value is truthy
  const value = resolveValue(condition, txn, additionalVars, ledgerContext)
  return !!value
}

/**
 * Split a comparison string by the operator while respecting quotes
 * Example: 'txn.name=="Test, Inc"' splits into ['txn.name', '"Test, Inc"']
 */
function splitComparison(str: string, operator: string): string[] {
  const parts: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''
  let i = 0

  while (i < str.length) {
    const char = str[i]

    if ((char === '"' || char === "'") && (i === 0 || str[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar) {
        inQuotes = false
        quoteChar = ''
      }
      current += char
      i++
    } else if (!inQuotes && str.substring(i, i + operator.length) === operator) {
      parts.push(current)
      current = ''
      i += operator.length
    } else {
      current += char
      i++
    }
  }

  if (current) {
    parts.push(current)
  }

  return parts
}

/**
 * Resolve a value for comparison
 * If the value is quoted, return the string literal
 * Otherwise, resolve it as a variable/function
 */
function resolveComparisonValue(
  value: string,
  txn: Transaction,
  additionalVars: Record<string, string>,
  ledgerContext?: LedgerLookupContext
): string {
  // Check if it's a quoted string literal
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1) // Remove quotes
  }

  // Otherwise resolve as variable/function
  return resolveValue(value, txn, additionalVars, ledgerContext)
}
