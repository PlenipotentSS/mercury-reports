import type { Transaction } from '../types'
import { processTemplate, type LedgerLookupContext } from './templateProcessor'

const QUICKBOOKS_EXPORTABLE_STATUSES = ['sent', 'pending']

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
  if (!QUICKBOOKS_EXPORTABLE_STATUSES.includes(txn.status)) return false
  if (txn.kind === "outgoingPayment") return true
  if (txn.kind === "internalTransfer") return false // only deposits for internal transfers
  if (txn.kind === 'creditCardTransaction') return false
  if (txn.kind === "other" && txn.bankDescription?.includes('IO AUTOPAY') && txn.amount > 0) return false
  return txn.amount < 0
}

const isDepositTransaction = (txn: Transaction): boolean => {
  if (!QUICKBOOKS_EXPORTABLE_STATUSES.includes(txn.status)) return false
  if (txn.kind === "internalTransfer") return true // only deposits for internal transfers
  if (txn.kind === "other" && txn.bankDescription?.includes('IO AUTOPAY') && txn.amount > 0) return false
  if (txn.kind === "outgoingPayment") return false
  if (txn.kind === 'creditCardTransaction') return false
  return txn.amount > 0
}

const isCreditCardTransaction = (txn: Transaction): boolean => {
  if (!QUICKBOOKS_EXPORTABLE_STATUSES.includes(txn.status)) return false
  if (txn.kind === "other") return false
  if (txn.kind === "outgoingPayment") return false
  return txn.kind === 'creditCardTransaction'
}

const modifyGlCodeComma = (glCode?: string): string => {
  return glCode?.includes('|') ? `${glCode?.split("|").join(",")}` : `${glCode}`
}

export const downloadQuickBooksDeposits = (
  transactions: Transaction[],
  selectedTransactionIds: Set<string>,
  _: string,
  glNameMercuryChecking: string,
  csvMappings?: { [key: string]: string },
  ledgerContext?: LedgerLookupContext
): void => {
  const selectedTxns = transactions.filter(
    (t) => selectedTransactionIds.has(t.id) && isDepositTransaction(t)
  )
  console.log('Selected Transactions for Deposits Count', selectedTxns.length);
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

  // Default templates if no mappings provided
  const defaultMappings = {
    deposit_to: '{ledgerLookup(gl_name_mercury_checking)}',
    date: '{txn.createdAt}',
    memo: '{txn.bankDescription} - {txn.categoryData.name}',
    received_from: '{txn.categoryData.name}',
    from_account: '{txn.generalLedgerCodeName}',
    line_memo: '{txn.bankDescription}',
    check_no: '',
    payment_method: 'Cash',
    class: '',
    amount: '{txn.amount}',
    less_cash_back: '',
    cash_back_account: '',
    cash_back_memo: ''
  }

  const mappings = { ...defaultMappings, ...csvMappings }

  const rows = selectedTxns.map((txn) => {
    const additionalVars = {
      glNameMercuryChecking
    }

    return [
      processTemplate(mappings.deposit_to, txn, additionalVars, ledgerContext),
      mappings.date === '{txn.createdAt}'
        ? new Date(txn.createdAt).toLocaleDateString('en-US')
        : processTemplate(mappings.date, txn, additionalVars, ledgerContext),
      processTemplate(mappings.memo, txn, additionalVars, ledgerContext),
      processTemplate(mappings.received_from, txn, additionalVars, ledgerContext),
      modifyGlCodeComma(processTemplate(mappings.from_account, txn, additionalVars, ledgerContext)),
      processTemplate(mappings.line_memo, txn, additionalVars, ledgerContext),
      processTemplate(mappings.check_no, txn, additionalVars, ledgerContext),
      processTemplate(mappings.payment_method, txn, additionalVars, ledgerContext),
      processTemplate(mappings.class, txn, additionalVars, ledgerContext),
      mappings.amount === '{txn.amount}'
        ? Math.abs(txn.amount).toString()
        : processTemplate(mappings.amount, txn, additionalVars, ledgerContext),
      processTemplate(mappings.less_cash_back, txn, additionalVars, ledgerContext),
      processTemplate(mappings.cash_back_account, txn, additionalVars, ledgerContext),
      processTemplate(mappings.cash_back_memo, txn, additionalVars, ledgerContext)
    ]
  })

  const csvContent = buildCSV(headers, rows)
  downloadCSVFile(csvContent, 'quickbooks-deposits')
}

export const downloadQuickBooksChecks = (
  transactions: Transaction[],
  selectedTransactionIds: Set<string>,
  glNameMercuryCreditCard: string,
  glNameMercuryChecking: string,
  csvMappings?: { [key: string]: string },
  ledgerContext?: LedgerLookupContext
): void => {
  const selectedTxns = transactions.filter(
    (t) => selectedTransactionIds.has(t.id) && isWithdrawalTransaction(t)
  )
  console.log('Selected Transactions for Checks Count', selectedTxns.length);
  if (selectedTxns.length === 0) return

  const headers = [
    'Bank Account',
    'Payee',
    'Check Number',
    'Date',
    'Amount',
    'Memo',
    'Account',
    'Expense Amount',
    'Expense Memo',
    'Expense Customer:Job',
    'Expense Billable'
  ]

  // Default templates if no mappings provided
  const defaultMappings = {
    bank_account: '{ledgerLookup(gl_name_mercury_checking)}',
    date: '{txn.createdAt}',
    check_number: 'EFT',
    payee: '{txn.counterpartyName}',
    memo: '{txn.bankDescription}',
    account: '{txn.generalLedgerCodeName}',
    amount: '{txn.amount}',
    class: '',
    expense_amount: '{txn.amount}',
    expense_memo: '',
    expense_customer_job: '{txn.categoryData.name}'
  }

  const mappings = { ...defaultMappings, ...csvMappings }

  const rows = selectedTxns.map((txn) => {
    const additionalVars = {
      glNameMercuryChecking,
      glNameMercuryCreditCard
    }

    // Handle special case for IO AUTOPAY
    let accountValue = processTemplate(mappings.account, txn, additionalVars, ledgerContext)
    if (txn.kind === "other" && txn.bankDescription?.includes('IO AUTOPAY')) {
      accountValue = glNameMercuryCreditCard
    }

    return [
      processTemplate(mappings.bank_account, txn, additionalVars, ledgerContext),
      processTemplate(mappings.payee, txn, additionalVars, ledgerContext),
      processTemplate(mappings.check_number, txn, additionalVars, ledgerContext),
      mappings.date === '{txn.createdAt}'
        ? new Date(txn.createdAt).toLocaleDateString('en-US')
        : processTemplate(mappings.date, txn, additionalVars, ledgerContext),
      mappings.amount === '{txn.amount}'
        ? Math.abs(txn.amount).toString()
        : processTemplate(mappings.amount, txn, additionalVars, ledgerContext),
      processTemplate(mappings.memo, txn, additionalVars, ledgerContext),
      modifyGlCodeComma(accountValue),
      mappings.expense_amount === '{txn.amount}'
        ? Math.abs(txn.amount).toString()
        : processTemplate(mappings.expense_amount, txn, additionalVars, ledgerContext),
      processTemplate(mappings.expense_memo, txn, additionalVars, ledgerContext),
      processTemplate(mappings.expense_customer_job, txn, additionalVars, ledgerContext),
      processTemplate(mappings.class, txn, additionalVars, ledgerContext),
    ]
  })

  const csvContent = buildCSV(headers, rows)
  downloadCSVFile(csvContent, 'quickbooks-checks')
}

export const downloadQuickBooksCreditCard = (
  transactions: Transaction[],
  selectedTransactionIds: Set<string>,
  glNameMercuryCreditCard: string,
  _: string,
  csvMappings?: { [key: string]: string },
  ledgerContext?: LedgerLookupContext
): void => {
  const selectedTxns = transactions.filter(
    (t) => selectedTransactionIds.has(t.id) && isCreditCardTransaction(t)
  )
  console.log('Selected Transactions for Credit Cards Count', selectedTxns.length);
  if (selectedTxns.length === 0) return

  const headers = [
    'Credit Card',
    'Purchased From (Payee)',
    'Ref Number',
    'Date',
    'Expense Account',
    'Expense Amount',
    'Customer:Job',
    'Expense Billable',
    'Class',
    'Item',
    'Item Description',
    'Item Quantity',
    'Item Cost',
    'Item Amount',
    'Item Customer:Job'
  ]

  // Default templates if no mappings provided
  const defaultMappings = {
    credit_card: '{ledgerLookup(gl_name_mercury_credit_card)}',
    payee: '{txn.counterpartyName}',
    ref_number: '{txn.id}',
    date: '{txn.createdAt}',
    account: '{txn.generalLedgerCodeName}',
    customer_job: '{txn.categoryData.name}',
    amount: '{txn.amount}',
    expense_billable: '',
    class: '',
    item: '',
    item_description: '',
    item_quantity: '1',
    item_cost: '{txn.amount}',
    item_amount: '{txn.amount}',
    item_customer_job: '{txn.categoryData.name}'
  }

  const mappings = { ...defaultMappings, ...csvMappings }

  const rows = selectedTxns.map((txn) => {
    const additionalVars = {
      glNameMercuryCreditCard
    }

    return [
      processTemplate(mappings.credit_card, txn, additionalVars, ledgerContext),
      processTemplate(mappings.payee, txn, additionalVars, ledgerContext),
      processTemplate(mappings.ref_number, txn, additionalVars, ledgerContext),
      mappings.date === '{txn.createdAt}'
        ? new Date(txn.createdAt).toLocaleDateString('en-US')
        : processTemplate(mappings.date, txn, additionalVars, ledgerContext),
      modifyGlCodeComma(processTemplate(mappings.account, txn, additionalVars, ledgerContext)),
      mappings.amount === '{txn.amount}'
        ? Math.abs(txn.amount).toString()
        : processTemplate(mappings.amount, txn, additionalVars, ledgerContext),
      processTemplate(mappings.customer_job, txn, additionalVars, ledgerContext),
      processTemplate(mappings.expense_billable, txn, additionalVars, ledgerContext),
      processTemplate(mappings.class, txn, additionalVars, ledgerContext),
      processTemplate(mappings.item, txn, additionalVars, ledgerContext),
      processTemplate(mappings.item_description, txn, additionalVars, ledgerContext),
      processTemplate(mappings.item_quantity, txn, additionalVars, ledgerContext),
      mappings.item_cost === '{txn.amount}'
        ? Math.abs(txn.amount).toString()
        : processTemplate(mappings.item_cost, txn, additionalVars, ledgerContext),      
      mappings.item_amount === '{txn.amount}'
        ? Math.abs(txn.amount).toString()
        : processTemplate(mappings.item_amount, txn, additionalVars, ledgerContext),
      processTemplate(mappings.item_customer_job, txn, additionalVars, ledgerContext)
    ]
  })

  const csvContent = buildCSV(headers, rows)
  downloadCSVFile(csvContent, 'quickbooks-credit-card')
}
