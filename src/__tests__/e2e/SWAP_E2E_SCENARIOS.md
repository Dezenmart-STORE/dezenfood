# Swap Flow E2E Test Scenarios

This document outlines critical end-to-end test scenarios for the swap functionality. These tests should be implemented using Playwright or Cypress.

## Setup Requirements

- Testnet wallet with CELO for gas
- Test tokens (cUSD, cEUR, USDT, etc.)
- Mock wallet provider (MetaMask test mode)
- Testnet RPC endpoints

## Critical Path Scenarios

### 1. Basic Swap Flow (Happy Path)

**Test ID:** E2E-SWAP-001
**Priority:** Critical
**Estimated Duration:** 2-3 minutes

**Steps:**
1. Navigate to product page requiring token swap
2. Connect wallet (MetaMask testnet)
3. Verify wallet connection status displayed
4. Click "Buy Now" on product with different token
5. SwapConfirmationModal appears
6. Verify quote displayed with:
   - From token: cUSD
   - To token: cEUR
   - Amount: 100
   - Exchange rate shown
   - Price impact shown
   - Gas estimate shown
7. Click "Confirm Swap"
8. Approve transaction in MetaMask
9. Wait for swap confirmation
10. Verify success message
11. Verify balance updated
12. Modal closes automatically

**Expected Result:**
- Swap completes successfully
- User balance reflects swap
- Product purchase can proceed

**Failure Scenarios to Test:**
- User rejects transaction in MetaMask
- Network timeout during swap
- Insufficient gas fees

---

### 2. Quote Expiry and Refresh

**Test ID:** E2E-SWAP-002
**Priority:** High
**Estimated Duration:** 15-20 seconds

**Steps:**
1. Open SwapConfirmationModal
2. Wait for initial quote to load
3. Observe countdown timer (starts at 10s)
4. Wait for countdown to reach 0
5. Verify "Quote Expired" message appears
6. Verify "Get New Quote" button appears
7. Click "Get New Quote"
8. Verify new quote loads
9. Verify countdown resets to 10s

**Expected Result:**
- Quote expires after 10 seconds
- User cannot confirm expired quote
- Refresh button gets new quote
- Countdown resets properly

---

### 3. High Price Impact Warning

**Test ID:** E2E-SWAP-003
**Priority:** High
**Estimated Duration:** 1-2 minutes

**Steps:**
1. Set up swap with high price impact (>10%)
2. Open SwapConfirmationModal
3. Verify price impact shown in red
4. Click "Confirm Swap"
5. Verify warning snackbar appears
6. Verify warning message mentions price impact percentage
7. Confirm swap anyway
8. Verify swap proceeds

**Expected Result:**
- High impact (>10%) shown in red
- Warning displayed before swap
- Swap can still proceed with user confirmation

---

### 4. Network Switch During Swap

**Test ID:** E2E-SWAP-004
**Priority:** High
**Estimated Duration:** 2-3 minutes

**Steps:**
1. Connect wallet on Celo Mainnet
2. Open SwapConfirmationModal
3. While quote is loading, switch network in MetaMask
4. Verify error message appears
5. Switch back to Celo network
6. Verify quote reloads
7. Complete swap

**Expected Result:**
- Error shown when wrong network
- Recovers when switched back
- Swap completes successfully

---

### 5. Insufficient Balance Handling

**Test ID:** E2E-SWAP-005
**Priority:** High
**Estimated Duration:** 1 minute

**Steps:**
1. Set wallet balance < required amount
2. Attempt to initiate swap
3. Verify error message: "Insufficient balance..."
4. Verify swap cannot proceed
5. Verify helpful error message displayed

**Expected Result:**
- Clear error message about insufficient balance
- Swap button disabled or shows appropriate state
- User guided on next steps

---

### 6. Multi-Hop Routing Display

**Test ID:** E2E-SWAP-006
**Priority:** Medium
**Estimated Duration:** 1-2 minutes

**Steps:**
1. Initiate swap requiring multi-hop route
   (e.g., cUSD → USDC → cEUR)
2. Verify route visualization appears
3. Verify all intermediate tokens shown
4. Verify arrows between tokens
5. Verify "Multi-hop routing" notice

**Expected Result:**
- Route clearly displayed
- All intermediate tokens visible
- User understands route being taken

---

### 7. Mobile Responsive Swap

**Test ID:** E2E-SWAP-007
**Priority:** High
**Estimated Duration:** 2-3 minutes

**Device:** Mobile viewport (375x667)

**Steps:**
1. Open app on mobile device
2. Navigate to product requiring swap
3. Click "Buy Now"
4. Verify modal fits screen
5. Verify all elements visible without scrolling
6. Verify buttons are touch-friendly (min 44px)
7. Complete swap
8. Verify success message visible

**Expected Result:**
- Modal responsive and usable
- No horizontal scrolling
- Touch targets appropriately sized
- All information legible

---

### 8. Concurrent Swap Prevention

**Test ID:** E2E-SWAP-008
**Priority:** Medium
**Estimated Duration:** 2 minutes

**Steps:**
1. Open SwapConfirmationModal
2. Click "Confirm Swap"
3. While swap is in progress, try to:
   - Close modal (should be disabled)
   - Initiate another swap (should be blocked)
   - Refresh page (confirm dialog should appear)
4. Wait for swap to complete
5. Verify modal closes

**Expected Result:**
- Only one swap at a time
- Modal locked during swap
- User prevented from concurrent actions

---

### 9. Slippage Tolerance Testing

**Test ID:** E2E-SWAP-009
**Priority:** Medium
**Estimated Duration:** 3-4 minutes

**Steps:**
1. Open SwapConfirmationModal
2. Note default slippage (1%)
3. Calculate minimum received amount
4. Verify minimum received shown correctly
5. During volatile market conditions:
   - Initiate swap
   - If price moves beyond slippage
   - Verify swap fails with slippage error
   - Verify helpful error message

**Expected Result:**
- Slippage protection works
- Clear error on slippage exceeded
- User can adjust and retry

---

### 10. Error Recovery Flow

**Test ID:** E2E-SWAP-010
**Priority:** High
**Estimated Duration:** 3-5 minutes

**Steps:**
1. Simulate network error (disconnect internet)
2. Attempt swap
3. Verify error: "Network connection issue..."
4. Click "Retry"
5. Reconnect internet
6. Verify swap retries automatically
7. Verify success

**Expected Result:**
- Network errors caught gracefully
- Retry mechanism works
- Helpful error messages
- Recovery successful

---

### 11. Mento vs Uniswap Protocol Selection

**Test ID:** E2E-SWAP-011
**Priority:** High
**Estimated Duration:** 2-3 minutes

**Steps:**
1. **Scenario A: Mento Pair (cUSD → cEUR)**
   - Initiate swap
   - Verify Mento protocol used
   - Complete swap

2. **Scenario B: Uniswap Pair (cUSD → USDT)**
   - Initiate swap
   - Verify Uniswap protocol used
   - Complete swap

3. **Scenario C: Fallback**
   - If Mento unavailable
   - Verify fallback to Uniswap
   - Complete swap

**Expected Result:**
- Correct protocol selected automatically
- Fallback works when primary unavailable
- User unaware of protocol switching

---

### 12. Progress Indicator During Swap

**Test ID:** E2E-SWAP-012
**Priority:** Medium
**Estimated Duration:** 2 minutes

**Steps:**
1. Initiate swap requiring approval + swap (2 steps)
2. Verify progress shows "Step 1 of 2"
3. Approve token
4. Verify progress updates to "Step 2 of 2"
5. Verify progress bar animates
6. Complete swap
7. Verify final success state

**Expected Result:**
- Step indicator accurate
- Progress bar visually updates
- User understands current state

---

## Performance Tests

### 13. Quote Fetch Performance

**Test ID:** E2E-PERF-001
**Priority:** Medium

**Metrics:**
- Quote fetch time < 3 seconds
- Modal open to quote display < 4 seconds
- Swap confirmation < 30 seconds (network dependent)

---

### 14. Modal Load Time

**Test ID:** E2E-PERF-002
**Priority:** Low

**Metrics:**
- Modal render time < 500ms
- Quote refresh time < 2 seconds
- State updates smooth (no lag)

---

## Accessibility Tests

### 15. Keyboard Navigation

**Test ID:** E2E-A11Y-001
**Priority:** Medium

**Steps:**
1. Open modal using keyboard (Tab)
2. Navigate all elements with Tab
3. Confirm swap with Enter
4. Close with Escape
5. Verify focus visible
6. Verify logical tab order

---

### 16. Screen Reader Support

**Test ID:** E2E-A11Y-002
**Priority:** Medium

**Steps:**
1. Enable screen reader (NVDA/JAWS)
2. Navigate modal
3. Verify all labels read correctly
4. Verify state changes announced
5. Verify error messages announced

---

## Security Tests

### 17. MEV Protection Validation

**Test ID:** E2E-SEC-001
**Priority:** High

**Steps:**
1. Initiate swap
2. Verify deadline set (5 minutes)
3. Wait >5 minutes without confirming
4. Attempt to confirm
5. Verify transaction fails or creates new deadline

---

### 18. Token Approval Limits

**Test ID:** E2E-SEC-002
**Priority:** High

**Steps:**
1. Check token allowance before swap
2. Initiate swap for 100 tokens
3. Verify approval only for ~105 tokens (not infinite)
4. Complete swap
5. Check remaining allowance
6. Verify it's minimal

---

## Test Execution

### Required Test Data

```javascript
const testData = {
  walletAddress: '0xTestWallet...',
  tokens: {
    cUSD: { balance: 1000 },
    cEUR: { balance: 500 },
    USDT: { balance: 200 },
  },
  products: [
    { id: 1, price: 100, currency: 'cEUR' },
    { id: 2, price: 50, currency: 'USDT' },
  ],
};
```

### Environment Setup

```bash
# Install E2E test framework
npm install -D @playwright/test

# Run tests
npm run test:e2e

# Run specific test
npm run test:e2e -- --grep "E2E-SWAP-001"

# Run with UI
npm run test:e2e -- --ui
```

### CI/CD Integration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-results
          path: test-results/
```

---

## Test Reporting

Each test should report:
- ✅ Pass/Fail status
- ⏱️ Execution time
- 📸 Screenshots on failure
- 🎥 Video recording of flow
- 📊 Network activity logs
- 🔍 Console errors/warnings

## Coverage Goals

- **Critical Paths:** 100% coverage
- **Edge Cases:** 80% coverage
- **Error Scenarios:** 90% coverage
- **Performance:** Baseline established

---

**Last Updated:** 2025-11-09
**Maintained By:** Development Team
**Review Frequency:** Before each release
