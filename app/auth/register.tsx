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

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { register, socialLogin } = useAuth();

  const colors = Colors[colorScheme ?? 'light'];

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await register(fullName, email, password, confirmPassword);
      console.log('Registration successful');
      
      Alert.alert(
        'Success',
        'Account created successfully! Please sign in with your credentials.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/auth/login'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialRegister = async (provider: 'google' | 'apple') => {
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
            'Google Sign-In is not configured. Please contact support or try manual registration.',
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
            'Apple Sign-In is not available on this device. Please try manual registration.',
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
        
        // Navigate to dashboard after successful social registration
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error(`${provider} registration error:`, error);
      Alert.alert('Error', `${provider} registration failed. Please try again.`);
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
          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Sign up to get started
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
              placeholder="Full Name"
              placeholderTextColor={colors.icon}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

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

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
              placeholder="Confirm Password"
              placeholderTextColor={colors.icon}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={colors.icon}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.registerButton, 
              { 
                backgroundColor: colors.tint,
                opacity: isLoading ? 0.7 : 1,
              }
            ]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
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
            onPress={() => handleSocialRegister('google')}
            disabled={isLoading}
          >
            <Ionicons name="logo-google" size={24} color="#DB4437" />
            <Text style={[styles.socialButtonText, { color: colors.text }]}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, { borderColor: colors.icon }]}
            onPress={() => handleSocialRegister('apple')}
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
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={[styles.footerLink, { color: colors.tint }]}>
              Sign In
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
  registerButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonText: {
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