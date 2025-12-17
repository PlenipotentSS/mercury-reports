import type { Transaction } from '../types'

const escapeCSV = (value: string): string => {
  if (value && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return `${value}`
}

const downloadCSVFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const buildCSV = (headers: string[], rows: string[][]): string => {
  return [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(','))
  ].join('\n')
}

export const downloadMercuryCSV = (
  transactions: Transaction[],
  selectedTransactionIds: Set<string>
): void => {
  const selectedTxns = transactions.filter((t) => selectedTransactionIds.has(t.id))
  if (selectedTxns.length === 0) return

  const headers = [
    'ID',
    'Card Name',
    'Card Payment Method',
    'Amount',
    'Created',
    'Status',
    'Counterparty Name',
    'Bank Description',
    'Kind',
    'Category',
    'Mercury Category',
    'GL Code',
    'Attachments'
  ]

  const rows = selectedTxns.map((txn) => [
    txn.id,
    txn.details?.creditCardInfo?.email || '',
    txn.details?.creditCardInfo?.paymentMethod || '',
    txn.amount.toString(),
    txn.createdAt,
    txn.status,
    txn.counterpartyName || '',
    txn.bankDescription,
    txn.kind,
    txn.categoryData?.name || '',
    txn.mercuryCategory || '',
    txn.generalLedgerCodeName || '',
    txn.attachments.length > 0 ? txn.attachments[0].url : ''
  ])

  const csvContent = buildCSV(headers, rows)
  downloadCSVFile(csvContent, 'mercury-transactions')
}

const isWithdrawalTransaction = (txn: Transaction): boolean => {
  return txn.amount > 0 && txn.kind !== 'creditCardTransaction' && txn.amount < 0
}

const isDepositTransaction = (txn: Transaction): boolean => {
  if (txn.counterpartyName.includes('Mercury Checking')) return false
  return txn.amount > 0 && txn.kind !== 'creditCardTransaction' && txn.amount > 0
}

const isCreditCardTransaction = (txn: Transaction): boolean => {
  if (txn.counterpartyName.includes('Mercury Checking')) return true
  return txn.amount > 0 && txn.kind === 'creditCardTransaction'
}

export const downloadQuickBooksDeposits = (
  transactions: Transaction[],
  selectedTransactionIds: Set<string>,
  glNameMercuryChecking: string
): void => {
  const selectedTxns = transactions.filter(
    (t) => selectedTransactionIds.has(t.id) && isDepositTransaction(t)
  )
  if (selectedTxns.length === 0) return

  const headers = [
    'Deposit To',
    'Date',
    'Memo',
    'Received From',
    'From Account',
    'Line Memo',
    'Check No.',
    'Payment Method',
    'Class',
    'Amount',
    'Less Cash Back',
    'Cash back Accnt.',
    'Cash back Memo'
  ]

  const rows = selectedTxns.map((txn) => [
    glNameMercuryChecking, // Deposit To
    new Date(txn.createdAt).toLocaleDateString('en-US'), // Date
    `${txn.bankDescription || ''} - ${txn.categoryData?.name || ''}` || '', // Memo
    txn.counterpartyName || '', // Received From
    txn.generalLedgerCodeName || '', // From Account
    txn.bankDescription || '', // Line Memo
    '', // Check No.
    txn.kind || '', // Payment Method
    '', // Class
    Math.abs(txn.amount).toString(), // Amount
    '', // Less Cash Back
    '', // Cash back Accnt.
    '' // Cash back Memo
  ])

  const csvContent = buildCSV(headers, rows)
  downloadCSVFile(csvContent, 'quickbooks-deposits')
}

export const downloadQuickBooksChecks = (
  transactions: Transaction[],
  selectedTransactionIds: Set<string>,
  glNameMercuryChecking: string
): void => {
  const selectedTxns = transactions.filter(
    (t) => selectedTransactionIds.has(t.id) && isWithdrawalTransaction(t)
  )
  if (selectedTxns.length === 0) return

  const headers = [
    'Bank Account',
    'Payee',
    'Number',
    'Date',
    'Total Amount',
    'Memo',
    'Expense Account',
    'Expense Amount',
    'Expense Memo',
    'Expense Customer:Job',
    'Expense Billable',
    'Expense Class',
    'Item',
    'Item Description',
    'Item Qty.',
    'Item Cost',
    'Item Amount',
    'Item Customer:Job',
    'Item Billable',
    'Item Class'
  ]

  const rows = selectedTxns.map((txn) => [
    glNameMercuryChecking, // Bank Account
    txn.counterpartyName || '', // Payee
    txn.id.slice(0, 8), // Number (truncated ID)
    new Date(txn.createdAt).toLocaleDateString('en-US'), // Date
    Math.abs(txn.amount).toString(), // Total Amount
    `${txn.bankDescription || ''} - ${txn.categoryData?.name || ''}` || '', // Memo
    txn.generalLedgerCodeName || '', // Expense Account
    Math.abs(txn.amount).toString(), // Expense Amount
    txn.bankDescription || '', // Expense Memo
    '', // Expense Customer:Job
    '', // Expense Billable
    '', // Expense Class
    '', // Item
    '', // Item Description
    '', // Item Qty.
    '', // Item Cost
    '', // Item Amount
    '', // Item Customer:Job
    '', // Item Billable
    '' // Item Class
  ])

  const csvContent = buildCSV(headers, rows)
  downloadCSVFile(csvContent, 'quickbooks-checks')
}

export const downloadQuickBooksCreditCard = (
  transactions: Transaction[],
  selectedTransactionIds: Set<string>,
  glNameMercuryCreditCard: string,
  glNameMercuryChecking: string
): void => {
  const selectedTxns = transactions.filter(
    (t) => selectedTransactionIds.has(t.id) && isCreditCardTransaction(t)
  )
  if (selectedTxns.length === 0) return

  const headers = [
    'Credit Card Account',
    'Purchased From',
    'Ref Number',
    'Date',
    'Expense Account',
    'Expense Amount',
    'Expense Customer:Job',
    'Expense Billable',
    'Expense Class',
    'Item',
    'Item Description',
    'Item Qty.',
    'Item Cost',
    'Item Amount',
    'Item Customer:Job',
    'Item Billable',
    'Item Class'
  ]
  const rows = selectedTxns.map((txn) => {
    let expenseAccount = txn.generalLedgerCodeName || '';
    if (txn.counterpartyName.includes('Mercury Checking')){
      expenseAccount = glNameMercuryChecking;
    }

    return [
      glNameMercuryCreditCard, // Credit Card Account
      txn.counterpartyName || '', // Purchased From
      txn.id.slice(0, 8), // Ref Number (truncated ID)
      new Date(txn.createdAt).toLocaleDateString('en-US'), // Date
      expenseAccount, // Expense Account
      Math.abs(txn.amount).toString(), // Expense Amount
      '', // Expense Customer:Job
      '', // Expense Billable
      '', // Expense Class
      '', // Item
      '', // Item Description
      '', // Item Qty.
      '', // Item Cost
      '', // Item Amount
      '', // Item Customer:Job
      '', // Item Billable
      '' // Item Class
    ];
  })

  const csvContent = buildCSV(headers, rows)
  downloadCSVFile(csvContent, 'quickbooks-credit-card')
}
