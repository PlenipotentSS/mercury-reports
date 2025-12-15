# Mercury Transactions Reports Feature

## Overview

The Reports page now fetches and displays Mercury transactions in a beautiful, interactive table format.

## Features Implemented

### 1. API Key Check
- Automatically checks if user has an active Mercury API key
- Shows helpful message if no API key is found
- Directs users to Settings page to add their key

### 2. Transaction Fetching
- Fetches transactions from Mercury API: `https://api.mercury.com/api/v1/transactions`
- Uses stored API key as Bearer token for authentication
- Automatic retry on errors
- Manual refresh button

### 3. Transaction Table

**11 Columns Displayed:**

1. **ID** (Truncated) - Shows first 8 and last 4 characters (e.g., `1269f7bc...f6ac`)
   - Hover to see full ID
   - Monospace font for easy reading

2. **Amount** - Formatted as currency ($16.81)
   - Red for negative amounts (expenses)
   - Green for positive amounts (income)

3. **Created** - Human-readable date format (Nov 14, 2025, 03:50 AM)

4. **Status** - Color-coded badges
   - Blue: sent
   - Orange: pending
   - Green: completed
   - Red: failed

5. **Bank Description** - Raw description from bank (e.g., "STARBUCKS STORE 1350")

6. **Credit Card** - Email from credit card details
   - **Clickable button** - Opens modal popup with full credit card info
   - Shows email and payment method in modal

7. **Kind** - Transaction type (e.g., "creditCardTransaction")

8. **Mercury Category** - Category assigned by Mercury (e.g., "Restaurants")

9. **GL Code** - General Ledger code name (e.g., "604 — Meals & Entert. - White Salmon")

10. **Card Name** - From categoryData object (e.g., "SASH - 27 Annie Lane")

11. **Attachments** - Link to view receipts/attachments
    - Shows count (e.g., "View (1)")
    - Opens in new tab
    - Shows "—" if no attachments

### 4. Interactive Features

**Credit Card Details Modal:**
- Click email in Credit Card column
- Modal popup displays:
  - Email address
  - Payment method (e.g., "Credit Card ••9682")
- Click outside or "×" to close

**Row Hover:**
- Table rows highlight on hover for better readability

**Attachment Links:**
- Direct links to attachment URLs
- Opens in new browser tab
- Secure signed URLs from Mercury S3

### 5. Error Handling

**No API Key State:**
```
No API Key Found
No reports can be provided until the Mercury API key is added.
Please go to the Settings page to add your API key.
[Go to Settings button]
```

**Loading State:**
- Animated spinner
- "Loading transactions..." message

**Error State:**
- Clear error message display
- "Retry" button to attempt fetch again

**Empty State:**
- "No transactions found." message when API returns empty array

### 6. Data Formatting

- **Currency:** US Dollar format with negative sign for expenses
- **Dates:** Localized format with month, day, year, and time
- **IDs:** Truncated for readability, full ID on hover
- **Missing Data:** Shows "—" for null/undefined fields

## API Integration

**Endpoint:**
```
GET https://api.mercury.com/api/v1/transactions
```

**Headers:**
```javascript
{
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json'
}
```

**Response Format:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "amount": -16.81,
      "createdAt": "ISO date",
      "status": "sent|pending|completed|failed",
      "bankDescription": "string",
      "details": {
        "creditCardInfo": {
          "email": "string",
          "paymentMethod": "string"
        }
      },
      "kind": "string",
      "mercuryCategory": "string",
      "generalLedgerCodeName": "string",
      "categoryData": {
        "name": "string"
      },
      "attachments": [
        {
          "fileName": "string",
          "url": "string",
          "attachmentType": "string"
        }
      ]
    }
  ]
}
```

## UI Components

### Transaction Table
- Full-width responsive table
- Horizontal scroll for overflow
- Alternating row hover effects
- Fixed header row

### Status Badges
- Color-coded pills for status
- Capitalized text
- Distinct colors per status type

### Modal Dialog
- Overlay with semi-transparent background
- Centered card with white background
- Click outside to dismiss
- Close button in header

## Styling

All styles added to [main.css](src/renderer/src/assets/main.css#L453-L710):
- `.transactions-table` - Main table styles
- `.status-badge` - Status pill badges
- `.modal-overlay` - Modal backdrop
- `.info-button` - Clickable email buttons
- `.attachment-link` - Receipt/attachment links
- Responsive design for various screen sizes

## User Flow

1. **User navigates to Reports page**
2. **System checks for API key**
   - If no key → Show "Add API key" message
   - If key exists → Fetch transactions
3. **Transactions loaded**
   - Display in table format
   - All 11 columns visible
4. **User interactions:**
   - Click email → View credit card details modal
   - Click attachment link → Open receipt in new tab
   - Click refresh → Reload transactions
   - Hover over truncated ID → See full ID

## Next Steps / Enhancements

Potential future improvements:
- Pagination for large transaction sets
- Filtering by date range
- Search/filter by amount, description, category
- Export to CSV/Excel
- Transaction details page
- Charts and analytics
- Date range selector
- Sort by column headers

## Testing

To test the Reports feature:

1. **Add Mercury API key** in Settings
2. **Navigate to Reports** page
3. **Verify table displays** with all 11 columns
4. **Click email** in Credit Card column → Modal should appear
5. **Click attachment link** → Should open in new tab
6. **Click refresh** → Should reload data

The feature is production-ready and fully functional!
