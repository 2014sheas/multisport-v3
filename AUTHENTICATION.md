# Authentication & Authorization System

This document describes the authentication and authorization system implemented for the Multisport Games application.

## Overview

The application uses NextAuth.js for authentication with a custom credentials provider. The system includes:

- User authentication with email/password
- Email verification
- Role-based access control (Admin vs User)
- Protected routes and API endpoints
- Middleware for route protection

## Authentication Flow

1. **User Registration**: Users sign up with email/password
2. **Email Verification**: Users must verify their email before signing in
3. **Sign In**: Users authenticate with credentials
4. **Session Management**: JWT-based sessions with role information

## Authorization Levels

### Admin Users

- Can access all admin pages (`/admin/*`)
- Can manage users, players, events, etc.
- Can access admin API endpoints (`/api/admin/*`)

### Regular Users

- Can access public pages
- Cannot access admin routes
- Will be redirected to sign-in if they try to access admin pages

## Protected Routes

### Admin Routes (Require Admin Privileges)

- `/admin/*` - All admin pages
- `/api/admin/*` - All admin API endpoints

### Authenticated Routes (Require Authentication)

- `/draft/*` - Draft-related pages
- `/vote/*` - Voting pages
- `/rankings/*` - Rankings pages
- `/events/*` - Event pages

## Implementation Details

### Middleware Protection

The `src/middleware.ts` file provides server-side route protection:

- Checks authentication status
- Validates admin privileges for admin routes
- Redirects unauthorized users to sign-in page

### Client-Side Protection

Components for client-side protection:

- `AdminGuard` - Wraps admin pages with authentication checks
- `withAdminProtection` - Higher-order component for admin protection

### Server-Side Protection

Utility functions in `src/lib/auth-utils.ts`:

- `requireAuth()` - Ensures user is authenticated
- `requireAdmin()` - Ensures user is authenticated and is admin
- `withAuth()` - Wraps API handlers with authentication
- `withAdmin()` - Wraps API handlers with admin protection

## Usage Examples

### Protecting Admin Pages

```tsx
import AdminGuard from "@/components/AdminGuard";

export default function AdminPage() {
  return (
    <AdminGuard>
      <div>Admin content here</div>
    </AdminGuard>
  );
}
```

### Protecting API Routes

```tsx
import { withAdmin } from "@/lib/auth-utils";

async function handler(req: NextRequest) {
  // Your API logic here
}

export const GET = withAdmin(handler);
export const POST = withAdmin(handler);
```

### Using Higher-Order Component

```tsx
import { withAdminProtection } from "@/components/withAdminProtection";

function AdminPage() {
  return <div>Admin content</div>;
}

export default withAdminProtection(AdminPage);
```

## Session Structure

The session object includes:

```typescript
{
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    isAdmin: boolean;
    emailVerified: boolean;
  }
}
```

## Error Handling

### Unauthorized Access

- Unauthenticated users trying to access admin pages are redirected to `/auth/signin`
- Authenticated users without admin privileges are redirected to `/unauthorized`
- The unauthorized page provides clear messaging and navigation options

### Authentication Errors

- Invalid credentials show "Invalid email or password"
- Unverified emails show "Email not verified" with option to resend verification

## Security Features

1. **Email Verification**: Users must verify their email before accessing the system
2. **Password Hashing**: Passwords are hashed using bcrypt
3. **JWT Sessions**: Secure session management with JWT tokens
4. **Route Protection**: Both client and server-side route protection
5. **API Protection**: All admin API endpoints require authentication and admin privileges

## TypeScript Support

The system includes proper TypeScript definitions in `src/types/next-auth.d.ts`:

- Extended NextAuth session types
- Admin user interface
- JWT token interface

## Testing Authentication

To test the authentication system:

1. **Create an admin user**:

   - Sign up with a new email
   - Verify the email
   - Manually set `isAdmin: true` in the database
   - Sign in and access admin pages

2. **Test unauthorized access**:

   - Sign in with a non-admin user
   - Try to access `/admin/users`
   - Should be redirected to sign-in with error message

3. **Test API protection**:
   - Try to access `/api/admin/users` without authentication
   - Should receive 401/403 error response
