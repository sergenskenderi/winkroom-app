# 🔧 Google OAuth Authorization Error Fix

## 🚨 **Error: "Access blocked: Authorization Error"**

This error occurs when Google OAuth is not properly configured. Here's how to fix it:

## 📋 **Step 1: Check Your Google Cloud Console Configuration**

### **1.1 OAuth Consent Screen**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **OAuth consent screen**
4. Make sure your app is configured:
   - **User Type**: External (for testing) or Internal (for production)
   - **App name**: Your app name
   - **User support email**: Your email
   - **Developer contact information**: Your email

### **1.2 OAuth 2.0 Client IDs**
1. Go to **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID: `764412566232-koi6p51mj5033qob9tuufjc2em14jbcb.apps.googleusercontent.com`
3. Click on it to edit

## 🔧 **Step 2: Configure Authorized Redirect URIs**

### **For Web Development:**
Add these redirect URIs to your Google OAuth client:

```
http://localhost:8081/auth/callback
http://localhost:19006/auth/callback
http://localhost:3000/auth/callback
http://127.0.0.1:8081/auth/callback
http://127.0.0.1:19006/auth/callback
http://127.0.0.1:3000/auth/callback
```

### **For Mobile Development (Expo Go):**
```
exp://localhost:8081/auth/callback
exp://127.0.0.1:8081/auth/callback
exp://192.168.100.79:8081/auth/callback
```

### **For Production:**
```
https://your-domain.com/auth/callback
```

## 🔧 **Step 3: Configure Authorized JavaScript Origins**

Add these JavaScript origins:

```
http://localhost:8081
http://localhost:19006
http://localhost:3000
http://127.0.0.1:8081
http://127.0.0.1:19006
http://127.0.0.1:3000
```

## 🔧 **Step 4: Check App Configuration**

### **4.1 Verify app.json scheme**
Make sure your `app.json` has:
```json
{
  "expo": {
    "scheme": "winkroom-app"
  }
}
```

### **4.2 Check Client IDs**
Verify the client IDs in `services/socialAuthService.ts` match your Google Cloud Console.

## 🔧 **Step 5: Test the Configuration**

### **5.1 Run the app and check console logs**
The app will now log:
- Google Client ID being used
- Redirect URI being generated
- OAuth flow status

### **5.2 Common Redirect URIs for different platforms:**

**Web (localhost):**
```
http://localhost:8081/auth/callback
```

**iOS Simulator:**
```
exp://localhost:8081/auth/callback
```

**Android Emulator:**
```
exp://localhost:8081/auth/callback
```

**Physical Device (Expo Go):**
```
exp://192.168.100.79:8081/auth/callback
```

## 🚨 **Troubleshooting Steps**

### **If still getting "Access blocked":**

1. **Clear browser cache** and try again
2. **Check if you're logged into the correct Google account**
3. **Verify the OAuth consent screen is published** (not in testing mode)
4. **Add your email to test users** if in testing mode
5. **Wait 5-10 minutes** after making changes (Google can take time to propagate)

### **If getting "redirect_uri_mismatch":**

1. **Copy the exact redirect URI** from the console logs
2. **Add it to Google Cloud Console** under Authorized Redirect URIs
3. **Make sure there are no extra spaces or characters**

### **If getting "invalid_client":**

1. **Verify the client ID** matches exactly
2. **Check if the client ID is for the correct platform** (Web vs iOS vs Android)

## 📱 **Platform-Specific Notes**

### **Web Development:**
- Uses `GOOGLE_CLIENT_ID_WEB`
- Redirect URI: `http://localhost:8081/auth/callback`

### **iOS Development:**
- Uses `GOOGLE_CLIENT_ID_IOS`
- Redirect URI: `exp://localhost:8081/auth/callback`

### **Android Development:**
- Uses `GOOGLE_CLIENT_ID_IOS` (currently)
- Redirect URI: `exp://localhost:8081/auth/callback`

## 🔍 **Debug Information**

The app now logs detailed information:
- Client ID being used
- Redirect URI generated
- OAuth flow status
- Any errors that occur

Check the console/terminal for these logs when testing Google Sign-In.

## ✅ **Success Indicators**

When properly configured, you should see:
1. Google OAuth consent screen opens
2. You can select your Google account
3. App receives authorization code
4. Code is exchanged for tokens
5. User data is retrieved successfully 