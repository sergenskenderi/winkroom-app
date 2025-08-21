# OAuth Setup Guide for Testing

This guide will help you set up both Google and Apple Sign-In for testing on your iPhone.

## 🔑 Current Configuration

### **Google OAuth**:
- **Client ID**: `764412566232-koi6p51mj5033qob9tuufjc2em14jbcb.apps.googleusercontent.com`
- **Bundle ID**: `com.sergenskenderi.winkroom-app`
- **Platform**: iOS, Android, Web (using AuthSession)
- **Scheme**: `winkroom-app`

### **Apple Sign-In**:
- **Client ID**: `com.sergenskenderi.winkroom-app` (your bundle identifier)
- **Platform**: iOS (iPhone)

## 📱 What You Need to Set Up

### **1. Google Cloud Console Setup**

1. **Go to Google Cloud Console**:
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Select your project

2. **Enable APIs**:
   - Go to **APIs & Services** → **Library**
   - Search and enable:
     - **Google+ API**
     - **Google Sign-In API**

3. **Create OAuth Client ID**:
   - Go to **APIs & Services** → **Credentials**
   - Click **"Create Credentials"** → **"OAuth 2.0 Client IDs"**
   - Select **"Web application"** as application type (works for all platforms with AuthSession)
   - Enter **Name**: `WinkRoom App`
   - Add **Authorized JavaScript origins**: 
     - `https://auth.expo.io`
     - `exp://localhost:8081`
   - Add **Authorized redirect URIs**:
     - `https://auth.expo.io/@sergenskenderi/winkroom-app`
     - `exp://localhost:8081/--/auth/callback`
   - Click **"Create"**
   - Copy the **Client ID** (should match: `764412566232-koi6p51mj5033qob9tuufjc2em14jbcb.apps.googleusercontent.com`)

### **2. Apple Developer Console Setup**

1. **Go to Apple Developer Console**:
   - Visit [Apple Developer Console](https://developer.apple.com/)
   - Sign in with your Apple Developer account

2. **Create App ID**:
   - Go to **Certificates, Identifiers & Profiles**
   - Click **"Identifiers"** → **"+"**
   - Select **"App IDs"** → **"App"**
   - Enter **Description**: `WinkRoom App`
   - Enter **Bundle ID**: `com.sergenskenderi.winkroom-app`
   - Scroll down and check **"Sign In with Apple"**
   - Click **"Continue"** → **"Register"**

3. **Configure Sign In with Apple**:
   - Select your App ID
   - Click **"Edit"**
   - Under **"Sign In with Apple"**, click **"Configure"**
   - Select **"Primary App ID"**
   - Click **"Save"**

## 🧪 Testing Both Sign-In Methods

### **Testing Google Sign-In**:
1. Open your app on iPhone
2. Go to Login or Register screen
3. Tap **"Continue with Google"**
4. Should open Google Sign-In popup
5. Select your Google account
6. Should redirect back to app

### **Testing Apple Sign-In**:
1. Open your app on iPhone
2. Go to Login or Register screen
3. Tap **"Continue with Apple"**
4. Should open Apple Sign-In popup
5. Use Face ID/Touch ID or enter Apple ID password
6. Should redirect back to app

## 🔧 Troubleshooting

### **Google Sign-In Issues**:
- **Error**: "Google Sign-In not configured"
  - **Solution**: Make sure the Bundle ID in Google Cloud Console matches `com.sergenskenderi.winkroom-app`
- **Error**: "Invalid client"
  - **Solution**: Verify the Client ID is correct in `services/socialAuthService.ts`

### **Apple Sign-In Issues**:
- **Error**: "Sign In with Apple not available"
  - **Solution**: Make sure you're testing on a real device (not simulator)
- **Error**: "Invalid client identifier"
  - **Solution**: Verify the Client ID matches your App ID bundle identifier

### **General Issues**:
- **Error**: "Network error"
  - **Solution**: Check your internet connection
- **Error**: "Authentication failed"
  - **Solution**: Check console logs for specific error messages

## 📋 Checklist

- [ ] Google Cloud Console project created
- [ ] Google+ API enabled
- [ ] Google Sign-In API enabled
- [ ] iOS OAuth Client ID created with correct Bundle ID
- [ ] Apple Developer account active
- [ ] App ID created with Sign In with Apple enabled
- [ ] Bundle ID matches in both Google and Apple configurations
- [ ] Testing on real iPhone device
- [ ] Both Google and Apple Sign-In buttons working

## 🚀 Next Steps

Once both sign-in methods are working:

1. **Test the full flow**: Login → Main App → Logout → Login again
2. **Test error handling**: Try with invalid credentials
3. **Test offline scenarios**: Disconnect internet and try sign-in
4. **Test user data**: Verify user information is properly extracted
5. **Implement backend integration**: Connect to your API endpoints

## 📞 Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify all configuration steps are completed
3. Ensure you're testing on a real device
4. Check that your Apple Developer account is active 