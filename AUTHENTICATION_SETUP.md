# Authentication Setup Guide

This guide will help you set up the authentication system for your WinkRoom app with both manual authentication and social media authentication (Google and Apple).

## Features

- ✅ Manual authentication (email/password)
- ✅ Google OAuth authentication
- ✅ Apple Sign-In authentication
- ✅ Protected routes
- ✅ Authentication state management
- ✅ Dark/Light theme support
- ✅ Form validation
- ✅ Loading states

## Prerequisites

1. **Expo CLI** installed globally
2. **Node.js** (version 16 or higher)
3. **Google Cloud Console** account (for Google OAuth)
4. **Apple Developer** account (for Apple Sign-In)

## Installation

### 1. Install Dependencies

```bash
npm install expo-auth-session expo-crypto expo-apple-authentication expo-google-sign-in react-hook-form @hookform/resolvers yup
```

### 2. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API and Google Sign-In API
4. Go to "Credentials" and create an OAuth 2.0 Client ID
5. For iOS: Add your app's bundle identifier (e.g., `com.yourcompany.winkroom-app`)
6. For Android: Add your app's package name and SHA-1 fingerprint
7. Copy the Client ID and Client Secret

**Important**: For iOS, you'll also need to add the Google Sign-In configuration to your `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.winkroom-app",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "package": "com.yourcompany.winkroom-app",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

### 3. Configure Apple Sign-In

1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Create an App ID with Sign In with Apple capability
3. Create a Services ID for web authentication
4. Generate a private key for server authentication
5. Copy the Client ID and Client Secret

### 4. Update Configuration

Update the following files with your actual credentials:

#### `services/socialAuthService.ts`
```typescript
const GOOGLE_CLIENT_ID = 'your-google-client-id.apps.googleusercontent.com';
const APPLE_CLIENT_ID = 'com.yourcompany.winkroom-app';
```

#### `services/authService.ts`
```typescript
private baseURL = 'https://your-api-endpoint.com/api';
```

### 5. Configure App.json

Add the following to your `app.json`:

```json
{
  "expo": {
    "scheme": "winkroom-app",
    "ios": {
      "bundleIdentifier": "com.yourcompany.winkroom-app"
    },
    "android": {
      "package": "com.yourcompany.winkroom-app"
    },
    "web": {
      "bundler": "metro"
    }
  }
}
```

## Usage

### Manual Authentication

The login and register pages are located at:
- `/auth/login` - Sign in with email and password
- `/auth/register` - Create account with full name, email, and password

### Social Authentication

Both pages include buttons for:
- **Google Sign-In** - Uses OAuth 2.0 flow
- **Apple Sign-In** - Uses Apple's native authentication

### Protected Routes

The main app tabs are protected by the `ProtectedRoute` component. Users must be authenticated to access:
- `/` - Home tab
- `/explore` - Explore tab

### Authentication Context

Use the `useAuth` hook to access authentication state:

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (isAuthenticated) {
    return <Text>Welcome, {user?.fullName}!</Text>;
  }
  
  return <Text>Please sign in</Text>;
}
```

## API Integration

### Backend Requirements

Your backend API should implement the following endpoints:

#### Authentication Endpoints
- `POST /api/auth/login` - Manual login
- `POST /api/auth/register` - Manual registration
- `POST /api/auth/google` - Google OAuth verification
- `POST /api/auth/apple` - Apple Sign-In verification

#### Request/Response Format

**Login/Register Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "fullName": "John Doe",
    "email": "user@example.com",
    "avatar": "https://example.com/avatar.jpg"
  },
  "token": "jwt_token_here"
}
```

## Security Considerations

1. **HTTPS Only** - Always use HTTPS in production
2. **Token Storage** - Use secure storage for tokens (AsyncStorage/SecureStore)
3. **Input Validation** - Validate all user inputs on both client and server
4. **Rate Limiting** - Implement rate limiting on authentication endpoints
5. **Password Requirements** - Enforce strong password policies

## Troubleshooting

### Common Issues

1. **Google OAuth not working**
   - Check that your Client ID is correct
   - Verify the redirect URI matches your app configuration
   - Ensure the Google+ API is enabled

2. **Apple Sign-In not working**
   - Verify your Apple Developer account is active
   - Check that Sign In with Apple is enabled for your App ID
   - Ensure you're testing on a real device (Apple Sign-In doesn't work in simulator)

3. **Authentication state not persisting**
   - Check that the storage implementation is working correctly
   - Verify the token is being stored and retrieved properly

### Debug Mode

Enable debug logging by adding console.log statements in the authentication services:

```typescript
// In authService.ts
console.log('Auth attempt:', credentials);
console.log('Auth response:', data);
```

## File Structure

```
app/
├── auth/
│   ├── _layout.tsx          # Auth layout
│   ├── login.tsx            # Login page
│   └── register.tsx         # Register page
├── (tabs)/
│   └── _layout.tsx          # Protected tabs layout
└── _layout.tsx              # Root layout with AuthProvider

components/
└── ProtectedRoute.tsx       # Route protection component

contexts/
└── AuthContext.tsx          # Authentication context

services/
├── authService.ts           # Authentication service
└── socialAuthService.ts     # Social authentication service
```

## Next Steps

1. Implement your backend API endpoints
2. Add email verification functionality
3. Implement password reset functionality
4. Add biometric authentication (Face ID/Touch ID)
5. Implement session management and token refresh
6. Add user profile management
7. Implement logout functionality in the main app

## Support

If you encounter any issues, please check:
1. The Expo documentation for authentication
2. Google OAuth documentation
3. Apple Sign-In documentation
4. Your backend API logs for errors 