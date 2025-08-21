import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// OAuth Configuration
const GOOGLE_CLIENT_ID_IOS = '764412566232-koi6p51mj5033qob9tuufjc2em14jbcb.apps.googleusercontent.com';

// Create redirect URI for different platforms
const GOOGLE_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'winkroom-app',
  path: 'auth/callback',
});

// For debugging - log the redirect URI
console.log('Google Redirect URI:', GOOGLE_REDIRECT_URI);

// Apple OAuth configuration
const APPLE_CLIENT_ID = 'com.sergenskenderi.winkroom-app';

// Helper function to get the appropriate Google Client ID
const getGoogleClientId = () => {
  if (Platform.OS === 'ios') {
    return GOOGLE_CLIENT_ID_IOS;
  } else {
    return GOOGLE_CLIENT_ID_IOS; // Default to iOS for Android for now
  }
};

// Helper function to get current redirect URI for debugging
export const getCurrentRedirectUri = () => {
  return GOOGLE_REDIRECT_URI;
};

export interface SocialAuthResult {
  accessToken?: string;
  identityToken?: string;
  user?: {
    id: string;
    email?: string;
    name?: string;
    avatar?: string;
    // Common fields
    firstName?: string;
    lastName?: string;
    // Apple-specific fields
    middleName?: string;
    nickname?: string;
    namePrefix?: string;
    nameSuffix?: string;
    // Google-specific fields
    locale?: string;
    verifiedEmail?: boolean;
  };
}

class SocialAuthService {
  // Google Authentication
  async signInWithGoogle(): Promise<SocialAuthResult> {
    try {
      // Use AuthSession for both web and native platforms
      return await this.signInWithGoogleAuthSession();
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  private async signInWithGoogleAuthSession(): Promise<SocialAuthResult> {
    try {
      const clientId = getGoogleClientId();
      console.log('Using Google Client ID:', clientId);
      console.log('Redirect URI:', GOOGLE_REDIRECT_URI);

      const request = new AuthSession.AuthRequest({
        clientId: clientId,
        scopes: ['openid', 'profile', 'email'],
        redirectUri: GOOGLE_REDIRECT_URI,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {
          access_type: 'offline',
        },
      });

      console.log('Starting Google OAuth flow...');
      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      });

      console.log('Google OAuth result type:', result.type);
      
      if (result.type === 'success' && result.params.code) {
        console.log('Google OAuth successful, exchanging code for tokens...');
        // Exchange code for tokens
        const tokenResponse = await this.exchangeCodeForTokens(result.params.code);
        return {
          accessToken: tokenResponse.access_token,
          user: {
            id: tokenResponse.sub || tokenResponse.id_token,
            email: tokenResponse.email,
            name: tokenResponse.name,
            avatar: tokenResponse.picture,
            // Additional Google-specific data
            firstName: tokenResponse.given_name,
            lastName: tokenResponse.family_name,
            locale: tokenResponse.locale,
            verifiedEmail: tokenResponse.email_verified,
          },
        };
      } else if (result.type === 'error') {
        console.error('Google OAuth error:', result.error);
        throw new Error(`Google OAuth error: ${result.error?.message || result.error?.code || 'Unknown error'}`);
      } else if (result.type === 'cancel') {
        throw new Error('Google authentication was cancelled by user');
      }

      throw new Error('Google authentication failed - unexpected result type');
    } catch (error: any) {
      console.error('Google AuthSession error:', error);
      throw error;
    }
  }

  private async exchangeCodeForTokens(code: string) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: getGoogleClientId(),
        client_secret: 'your-google-client-secret', // Replace with your client secret
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    return response.json();
  }

  // Apple Authentication
  async signInWithApple(): Promise<SocialAuthResult> {
    try {
      if (Platform.OS === 'ios') {
        return await this.signInWithAppleNative();
      } else {
        return await this.signInWithAppleWeb();
      }
    } catch (error) {
      console.error('Apple sign-in error:', error);
      throw error;
    }
  }

  private async signInWithAppleNative(): Promise<SocialAuthResult> {
    try {
      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Authentication is not available on this device');
      }
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Extract more detailed information from Apple
      const fullName = credential.fullName;
      const name = fullName?.givenName 
        ? `${fullName.givenName} ${fullName.familyName || ''}`.trim()
        : undefined;

              return {
          identityToken: credential.identityToken || undefined,
          user: {
            id: credential.user,
            email: credential.email || undefined,
            name: name,
            // Additional Apple-specific data
            firstName: fullName?.givenName || undefined,
            lastName: fullName?.familyName || undefined,
            middleName: fullName?.middleName || undefined,
            nickname: fullName?.nickname || undefined,
            namePrefix: fullName?.namePrefix || undefined,
            nameSuffix: fullName?.nameSuffix || undefined,
          },
        };
    } catch (error: any) {
      if (error.code === 'ERR_CANCELED') {
        throw new Error('Apple authentication was cancelled');
      }
      
      if (error.code === 'ERR_INVALID_RESPONSE') {
        throw new Error('Apple authentication response was invalid');
      }
      
      if (error.code === 'ERR_NOT_AVAILABLE') {
        throw new Error('Apple Authentication is not available on this device');
      }
      
      throw new Error(`Apple authentication failed: ${error.message || error.code || 'Unknown error'}`);
    }
  }

  private async signInWithAppleWeb(): Promise<SocialAuthResult> {
    const request = new AuthSession.AuthRequest({
      clientId: APPLE_CLIENT_ID,
      scopes: ['name', 'email'],
      redirectUri: AuthSession.makeRedirectUri({
        scheme: 'winkroom-app',
        path: 'auth/callback',
      }),
      responseType: AuthSession.ResponseType.Code,
    });

    const result = await request.promptAsync({
      authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
    });

    if (result.type === 'success' && result.params.code) {
      // Exchange code for tokens
      const tokenResponse = await this.exchangeAppleCodeForTokens(result.params.code);
      return {
        identityToken: tokenResponse.id_token,
        user: {
          id: tokenResponse.sub,
          email: tokenResponse.email,
        },
      };
    }

    throw new Error('Apple authentication was cancelled or failed');
  }

  private async exchangeAppleCodeForTokens(code: string) {
    const response = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: APPLE_CLIENT_ID,
        client_secret: 'your-apple-client-secret', // Replace with your client secret
        redirect_uri: AuthSession.makeRedirectUri({
          scheme: 'winkroom-app',
          path: 'auth/callback',
        }),
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange Apple code for tokens');
    }

    return response.json();
  }

  // Check if social authentication is available
  async isGoogleSignInAvailable(): Promise<boolean> {
    try {
      // AuthSession works on all platforms
      return true;
    } catch (error) {
      console.warn('Google Sign-In not available:', error);
      return false;
    }
  }

  async isAppleSignInAvailable(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        return await AppleAuthentication.isAvailableAsync();
      } else if (Platform.OS === 'web') {
        // For web, we can try Apple Sign-In
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking Apple Sign-In availability:', error);
      return false;
    }
  }
}

export const socialAuthService = new SocialAuthService(); 