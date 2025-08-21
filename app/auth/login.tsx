import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { socialAuthService } from '@/services/socialAuthService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { login, socialLogin } = useAuth();

  const colors = Colors[colorScheme ?? 'light'];

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      console.log('Login successful');
      
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    try {
      let socialResult;
      let profile;
      
      if (provider === 'google') {
        // Check if Google Sign-In is available
        const isAvailable = await socialAuthService.isGoogleSignInAvailable();
        if (!isAvailable) {
          Alert.alert(
            'Google Sign-In Not Available',
            'Google Sign-In is not configured. Please contact support or try manual login.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        socialResult = await socialAuthService.signInWithGoogle();
        
        // Extract profile data from Google response
        const googleId = socialResult.user?.id || '';
        const googleEmail = socialResult.user?.email;
        const googleName = socialResult.user?.name;
        const firstName = socialResult.user?.firstName;
        const lastName = socialResult.user?.lastName;
        
        // Google usually provides consistent data, but handle edge cases
        const fallbackEmail = googleEmail || `google-${googleId.slice(-8)}@example.com`;
        const fallbackName = googleName || (firstName && lastName ? `${firstName} ${lastName}` : `Google User ${googleId.slice(-4)}`);
        
        profile = {
          id: googleId,
          email: fallbackEmail,
          name: fallbackName,
          picture: socialResult.user?.avatar || '',
        };
      } else if (provider === 'apple') {
        // Check if Apple Sign-In is available
        const isAvailable = await socialAuthService.isAppleSignInAvailable();
        if (!isAvailable) {
          Alert.alert(
            'Apple Sign-In Not Available',
            'Apple Sign-In is not available on this device. Please try manual login.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        socialResult = await socialAuthService.signInWithApple();
        
        // Extract profile data from Apple response
        // Apple may not provide email/name on subsequent logins
        const appleId = socialResult.user?.id || '';
        const appleEmail = socialResult.user?.email;
        const appleName = socialResult.user?.name;
        const firstName = socialResult.user?.firstName;
        const lastName = socialResult.user?.lastName;
        
        // Create a more unique fallback if no email/name provided
        const fallbackEmail = appleEmail || `apple-${appleId.slice(-8)}@example.com`;
        const fallbackName = appleName || (firstName && lastName ? `${firstName} ${lastName}` : `Apple User ${appleId.slice(-4)}`);
        
        profile = {
          id: appleId,
          email: fallbackEmail,
          name: fallbackName,
          picture: socialResult.user?.avatar || '',
        };
      }
      
      if (profile) {
        // Use the AuthContext to handle social login
        await socialLogin(provider, profile);
        
        // Navigate to dashboard after successful social login
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error(`${provider} login error:`, error);
      Alert.alert('Error', `${provider} login failed. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Sign in to your account
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
              placeholder="Email"
              placeholderTextColor={colors.icon}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
              placeholder="Password"
              placeholderTextColor={colors.icon}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={colors.icon}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={() => {
              // TODO: Implement forgot password functionality
              alert('Forgot password functionality will be implemented soon!');
            }}
          >
            <Text style={[styles.forgotPasswordText, { color: colors.tint }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.loginButton, 
              { 
                backgroundColor: colors.tint,
                opacity: isLoading ? 0.7 : 1,
              }
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.icon }]} />
          <Text style={[styles.dividerText, { color: colors.icon }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.icon }]} />
        </View>

        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={[styles.socialButton, { borderColor: colors.icon }]}
            onPress={() => handleSocialLogin('google')}
            disabled={isLoading}
          >
            <Ionicons name="logo-google" size={24} color="#DB4437" />
            <Text style={[styles.socialButtonText, { color: colors.text }]}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, { borderColor: colors.icon }]}
            onPress={() => handleSocialLogin('apple')}
            disabled={isLoading}
          >
            <Ionicons name="logo-apple" size={24} color={colors.text} />
            <Text style={[styles.socialButtonText, { color: colors.text }]}>
              Continue with Apple
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.icon }]}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={[styles.footerLink, { color: colors.tint }]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  socialButtons: {
    gap: 12,
    marginBottom: 32,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 