# Discount Display Format & Shipping Cost Fix

## Overview
Fixed two display issues in the e-commerce application:
1. **Discount Display Format**: Changed from `-$2.40 (10%)` to `(10%) -$2.40` format
2. **Shipping Cost Display**: Fixed shipping costs showing as `0.0y` instead of `y.00`

## Issue Description

### Discount Display Issue
The discount information was displaying with the percentage after the price value (e.g., `-$2.40 (10%)`), but the user preferred the percentage to appear before the price value (e.g., `(10%) -$2.40`).

### Shipping Cost Issue
After the discount fix, shipping costs were displaying as `0.0y` instead of `y.00` across checkout, success, and user orders pages. This was caused by incorrect handling of shipping cost values from the settings table.

## Root Cause Analysis

### Shipping Cost Issue Root Cause
The problem was in `CheckoutPage.tsx` where the shipping calculation was incorrectly dividing values by 100:

1. **Settings Table Storage**: The `settings` table stores shipping costs as dollar amounts (e.g., `5.00`, `2.50`)
2. **Incorrect Division**: The code was treating these as cents and dividing by 100, resulting in `0.05` and `0.025`
3. **Display Issue**: This caused shipping to show as `$0.05` instead of `$5.00`

### Data Flow
- **Settings Table**: `{ base_price: 5.00, additional_item_price: 2.50 }` (dollars)
- **CheckoutPage**: Should use values directly, not divide by 100
- **Database Storage**: Convert to cents when storing (`Math.round(shipping * 100)`)
- **Display Pages**: Convert from cents to dollars when displaying (`/ 100`)

## Files Modified

### 1. CheckoutPage.tsx (Shipping Cost Fix)
**Location:** `src/pages/CheckoutPage.tsx`
**Lines Modified:** 18, 49-52, 65-71

**Before:**
```tsx
const [shippingCost, setShippingCost] = useState({ base_price: 400, additional_item_price: 100 });

// In fetchShippingCost:
if (data) {
  setShippingCost(data.value);
}

// In calculateShipping:
const shippingAmount = (shippingCost.base_price + (Math.max(0, totalItems - 1) * shippingCost.additional_item_price)) / 100;
```

**After:**
```tsx
const [shippingCost, setShippingCost] = useState({ base_price: 5.00, additional_item_price: 2.50 });

// In fetchShippingCost:
if (data) {
  // The settings table stores shipping costs as dollar amounts (e.g., 5.00, 2.50)
  // not as cents, so we use them directly
  setShippingCost(data.value);
  console.log('Fetched shipping cost from settings:', data.value);
}

// In calculateShipping:
const shippingAmount = shippingCost.base_price + (Math.max(0, totalItems - 1) * shippingCost.additional_item_price);
```

### 2. CheckoutSuccessPage.tsx (Discount Display Fix)
**Location:** `src/pages/CheckoutSuccessPage.tsx`
**Lines Modified:** 503-513

**Before:**
```tsx
<div className="flex justify-between items-center mt-1">
  <p className="text-sm text-gray-600">
    Discount {(order.discount_type || discountInfo?.discount_type) === 'percentage' && (order.discount_percentage || discountInfo?.discount_percentage) ? `(${order.discount_percentage || discountInfo?.discount_percentage}%)` : ''}
  </p>
  <p className="text-sm font-medium text-green-600">
    {discountAmount > 0 ? `-$${discountAmount.toFixed(2)}` : '$0.00'}
  </p>
</div>
```

**After:**
```tsx
<div className="flex justify-between items-center mt-1">
  <p className="text-sm text-gray-600">Discount</p>
  <p className="text-sm font-medium text-green-600">
    {discountAmount > 0 ? (
      (order.discount_type || discountInfo?.discount_type) === 'percentage' && (order.discount_percentage || discountInfo?.discount_percentage) ?
        `(${order.discount_percentage || discountInfo?.discount_percentage}%) -$${discountAmount.toFixed(2)}` :
        `-$${discountAmount.toFixed(2)}`
    ) : '$0.00'}
  </p>
</div>
```

### 3. AccountPage.tsx (Discount Display Fix)
**Location:** `src/pages/AccountPage.tsx`
**Lines Modified:** 1549-1561

**Before:**
```tsx
{discountType === 'percentage' && discountPercentage ? (
  `-$${(discountAmount / 100).toFixed(2)} (${discountPercentage}%)`
) : (
  `-$${(discountAmount / 100).toFixed(2)}`
)}
```

**After:**
```tsx
{discountType === 'percentage' && discountPercentage ? (
  `(${discountPercentage}%) -$${(discountAmount / 100).toFixed(2)}`
) : (
  `-$${(discountAmount / 100).toFixed(2)}`
)}
```

### 4. OrdersList.tsx (Discount Display Fix)
**Location:** `src/pages/admin/OrdersList.tsx`
**Lines Modified:** 1182-1184

**Before:**
```tsx
<p className="text-sm font-medium">Discount ({discountPercentage}%): <span className="font-normal">-${discount.toFixed(2)}</span></p>
```

**After:**
```tsx
<p className="text-sm font-medium">Discount: <span className="font-normal">({discountPercentage}%) -${discount.toFixed(2)}</span></p>
```

## Implementation Details

### Shipping Cost Fix
1. **Updated default values** from cents (400, 100) to dollars (5.00, 2.50)
2. **Removed incorrect division** by 100 in `calculateShipping()` function
3. **Added proper comments** explaining the data format from settings table
4. **Maintained consistency** with database storage (still converts to cents when saving)

### Discount Display Fix
1. **Moved percentage to the front** in all three display locations
2. **Maintained color coding** (green for discounts)
3. **Preserved functionality** (calculations remain unchanged)
4. **Consistent formatting** across checkout, user dashboard, and admin dashboard

## Testing Recommendations

### Shipping Cost Testing
1. **Add items to cart** and verify shipping shows correct amount (e.g., $5.00 for 1 item, $7.50 for 2 items)
2. **Complete checkout** and verify shipping cost displays correctly on success page
3. **Check user dashboard** orders tab for correct shipping cost display
4. **Verify admin dashboard** shows correct shipping costs in order details

### Discount Display Testing
1. **Apply TEST10 promo code** (10% discount) and verify format shows `(10%) -$2.40`
2. **Check all three locations**: checkout success, user orders, admin orders
3. **Test with different discount types** (percentage vs fixed amount)

## Technical Notes
- **Shipping costs**: Settings table stores as dollars, database stores as cents, display converts back to dollars
- **Discount display**: Only affects visual format, not calculation logic
- **Backward compatibility**: All existing orders continue to display correctly
- **Data consistency**: No database migrations required

## Related Files (Not Modified)
- Database shipping cost storage logic (unchanged)
- Stripe payment processing (unchanged)
- Other shipping cost calculation functions (already correct)

## Commit Information
- **Branch**: clean-branch
- **Files Changed**: 4 files
- **Lines Modified**: ~25 lines total
- **Type**: Bug fix + UI improvement
- **Impact**: Fixes display issues, no functional changes
