# Password Reset Instructions

This document provides comprehensive instructions for resetting user account passwords in the FunnyJokeTees e-commerce application.

## Available Password Reset Methods

### 1. Forgot Password Page (Recommended - UI Method)

**Location**: `src/pages/ForgotPasswordPage.tsx`  
**Access URL**: `http://localhost:5175/forgot-password`

#### Features:
- **Two modes**: Email-based reset OR Direct password reset
- **Email-based**: Sends reset link to user's email
- **Direct reset**: Immediately changes password (bypasses email)
- User-friendly web interface

#### How to Use:
1. **Start development server** (if not running):
   ```bash
   npm run dev
   ```

2. **Navigate to forgot password page**:
   ```
   http://localhost:5175/forgot-password
   ```

3. **Enter user details**:
   - Email address of the user
   - Toggle "Use direct password reset" (recommended for admin use)
   - Enter new password
   - Confirm new password

4. **Click "Reset Password"**

5. **Success**: User can now log in with the new password

---

### 2. Admin Dashboard - User Management

**Location**: Admin Dashboard → User Management tab  
**Access URL**: `http://localhost:5175/admin/users`

#### Features:
- View all users
- Delete users
- User account management interface

#### How to Access:
1. Navigate to admin dashboard
2. Go to "User Management" tab
3. Find the user account
4. Use available management options

---

### 3. JavaScript Scripts (Command Line Methods)

#### A. admin-reset-password.js (Primary Script)
**Location**: `./admin-reset-password.js` (root directory)  
**Purpose**: Direct password reset using admin privileges

**How to Use**:
1. **Edit the script** to set user email and new password:
   ```javascript
   const userEmail = 'user@example.com';  // Change this
   const newPassword = 'newpassword123';  // Change this
   ```

2. **Run the script**:
   ```bash
   node admin-reset-password.js
   ```

#### B. reset-password-sql.js
**Location**: `./reset-password-sql.js` (root directory)  
**Purpose**: Reset password using SQL function

**How to Use**:
1. Edit the file to set email and new password
2. Run: `node reset-password-sql.js`

#### C. reset-password-test.js
**Location**: `./reset-password-test.js` (root directory)  
**Purpose**: Comprehensive password reset testing with multiple methods

**How to Use**:
1. Edit the file to set email and new password
2. Run: `node reset-password-test.js`

#### D. generate_password_reset.js
**Location**: `./scripts/generate_password_reset.js`  
**Purpose**: Generate password reset email

**How to Use**:
```bash
node scripts/generate_password_reset.js user@example.com
```

---

### 4. Service Functions (Developer Use)

**Location**: `src/services/passwordResetService.ts`

#### Available Functions:
- `resetPasswordWithSQL(email, newPassword)` - Direct password reset
- `checkUserExists(email)` - Check if user exists

#### Usage in Code:
```typescript
import { resetPasswordWithSQL, checkUserExists } from '../services/passwordResetService';

// Check if user exists
const userCheck = await checkUserExists('user@example.com');

// Reset password
const result = await resetPasswordWithSQL('user@example.com', 'newpassword123');
```

---

## Recommended Workflow

### For Quick Single User Reset:
1. **Use the Forgot Password Page** (Easiest and most user-friendly)
2. Navigate to `http://localhost:5175/forgot-password`
3. Use "direct password reset" mode
4. Enter user email and new password

### For Bulk/Automated Resets:
1. **Use admin-reset-password.js script**
2. Edit the script with user details
3. Run the script from command line

### For Development/Testing:
1. **Use reset-password-test.js** for comprehensive testing
2. **Use service functions** for integration into other features

---

## Important Notes

- **Admin Privileges Required**: Most methods require admin/service role access
- **Direct Reset**: Bypasses email verification for immediate password change
- **Email Reset**: Sends reset link to user's email (requires email configuration)
- **Security**: Direct reset methods should only be used by administrators
- **Testing**: Always test password reset in development before using in production

---

## Troubleshooting

### Common Issues:
1. **"User not found"**: Verify the email address is correct
2. **"Database error"**: Check Supabase connection and admin credentials
3. **"Permission denied"**: Ensure using admin/service role key

### Environment Variables Required:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_SERVICE_ROLE_KEY`

### Verification:
After resetting a password, test by:
1. Attempting to log in with the new password
2. Checking user can access their account
3. Verifying all user data is intact

---

## File Locations Summary

- **UI Method**: `src/pages/ForgotPasswordPage.tsx`
- **Admin Scripts**: `./admin-reset-password.js`, `./reset-password-sql.js`
- **Service Functions**: `src/services/passwordResetService.ts`
- **Admin Dashboard**: `src/pages/admin/UserList.tsx`
- **Utility Scripts**: `./scripts/generate_password_reset.js`

---

*Last Updated: January 2025*
