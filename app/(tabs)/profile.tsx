import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { apiService } from '@/services/apiService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
} from 'react-native';

interface UserProfile {
  _id: string;
  email: string;
  fullName: string;
  authType: 'manual' | 'google' | 'apple';
  isEmailVerified: boolean;
  isActive: boolean;
  profilePicture: string;
  bio: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const colors = Colors[colorScheme ?? 'light'];

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    fullName: '',
    bio: '',
    phoneNumber: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/auth/profile');
      console.log('Fetched profile data:', response.data.user);
      console.log('Profile picture from fetch:', response.data.user.profilePicture);
      setProfile(response.data.user);
      setEditData({
        fullName: response.data.user.fullName,
        bio: response.data.user.bio || '',
        phoneNumber: response.data.user.phoneNumber || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.put('/auth/profile', editData);
      setProfile(response.data.user);
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhoto = async () => {
    try {
      // Show options to user
      Alert.alert(
        'Change Profile Picture',
        'Choose how you want to add a photo',
        [
          {
            text: 'Camera',
            onPress: () => handleImagePicker('camera'),
          },
          {
            text: 'Photo Library',
            onPress: () => handleImagePicker('library'),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error showing photo options:', error);
      Alert.alert('Error', 'Failed to show photo options. Please try again.');
    }
  };

  const handleImagePicker = async (source: 'camera' | 'library') => {
    try {
      // Request permissions based on source
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant permission to access your camera.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant permission to access your photo library.');
          return;
        }
      }

      // Launch image picker
      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

              if (!result.canceled && result.assets[0]) {
          const imageUri = result.assets[0].uri;
          
          // Show loading state
          setLoading(true);
          
                    try {
            // Check image size before processing
            const sizeResponse = await fetch(imageUri);
            const blob = await sizeResponse.blob();
            const sizeInMB = blob.size / (1024 * 1024);
            
            if (sizeInMB > 5) {
              Alert.alert('Image Too Large', 'Please select an image smaller than 5MB.');
              setLoading(false);
              return;
            }
            
            console.log('Image size:', sizeInMB.toFixed(2), 'MB');
            // Convert the image to base64 and send it as a string
            const base64Image = await convertImageToBase64(imageUri);
            
            // Update profile with the base64 image
            const updateData = {
              fullName: profile?.fullName || '',
              bio: profile?.bio || '',
              phoneNumber: profile?.phoneNumber || '',
              profilePicture: base64Image,
            };

            console.log('Sending profile update with image...');
            const response = await apiService.put('/auth/profile', updateData);
          
          // Update the profile with new picture
          if (response.data && response.data.user) {
            console.log('Updated profile data:', response.data.user);
            console.log('Profile picture URL:', response.data.user.profilePicture);
            setProfile(response.data.user);
            Alert.alert('Success', 'Profile picture updated successfully!');
          } else {
            console.log('Response structure:', response);
            Alert.alert('Success', 'Profile picture updated successfully!');
          }
        } catch (uploadError: any) {
          console.error('Error uploading profile picture:', uploadError);
          
          // More detailed error message
          let errorMessage = 'Failed to upload profile picture. Please try again.';
          if (uploadError.message) {
            errorMessage = `Upload failed: ${uploadError.message}`;
          }
          
          Alert.alert('Error', errorMessage);
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      console.log('Converting image to base64:', uri);
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove the data:image/jpeg;base64, prefix if present
          const base64Data = base64.split(',')[1] || base64;
          console.log('Base64 conversion successful, length:', base64Data.length);
          resolve(base64Data);
        };
        reader.onerror = (error) => {
          console.error('FileReader error:', error);
          reject(new Error('Failed to read image data'));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw new Error('Failed to process image');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/auth/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading && !profile) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={styles.loadingText}>Loading profile...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Picture Section */}
        <ThemedView style={styles.profilePictureSection}>
          <ThemedView style={styles.profilePictureContainer}>
            {loading ? (
              <ThemedView style={[styles.profilePicturePlaceholder, { backgroundColor: colors.tint }]}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </ThemedView>
            ) : profile?.profilePicture ? (
              <Image
                source={{ 
                  uri: profile.profilePicture.startsWith('data:') 
                    ? profile.profilePicture 
                    : profile.profilePicture.startsWith('http') 
                      ? profile.profilePicture 
                      : `data:image/jpeg;base64,${profile.profilePicture}`
                }}
                style={styles.profilePicture}
                onError={(error) => {
                  console.error('Image loading error:', error);
                }}
                onLoad={() => {
                  console.log('Image loaded successfully');
                }}
              />
            ) : (
              <ThemedView style={[styles.profilePicturePlaceholder, { backgroundColor: colors.tint }]}>
                <Ionicons name="person" size={60} color="#FFFFFF" />
              </ThemedView>
            )}
          </ThemedView>
          <TouchableOpacity 
            style={styles.editPictureButton}
            onPress={handleChangePhoto}
            disabled={loading}
          >
            <Ionicons name="camera" size={20} color={colors.tint} />
            <ThemedText style={styles.editPictureText}>
              {loading ? 'Uploading...' : 'Change Photo'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Profile Information */}
        <ThemedView style={styles.profileInfoSection}>
          <ThemedView style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Personal Information</ThemedText>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditing(!editing)}
            >
              <Ionicons
                name={editing ? 'close' : 'create-outline'}
                size={20}
                color={colors.tint}
              />
              <ThemedText style={styles.editButtonText}>
                {editing ? 'Cancel' : 'Edit'}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {/* Full Name */}
          <ThemedView style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>Full Name</ThemedText>
            {editing ? (
              <TextInput
                style={[
                  styles.textInput, 
                  { 
                    borderColor: colors.tint,
                    color: colors.text,
                    backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#FFFFFF'
                  }
                ]}
                value={editData.fullName}
                onChangeText={(text) => setEditData({ ...editData, fullName: text })}
                placeholder="Enter your full name"
                placeholderTextColor={colors.icon}
              />
            ) : (
              <ThemedText style={styles.fieldValue}>{profile?.fullName}</ThemedText>
            )}
          </ThemedView>

          {/* Email */}
          <ThemedView style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>Email</ThemedText>
            <ThemedView style={styles.emailContainer}>
              <ThemedText style={styles.fieldValue}>{profile?.email}</ThemedText>
              {profile?.isEmailVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              )}
            </ThemedView>
          </ThemedView>

          {/* Bio */}
          <ThemedView style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>Bio</ThemedText>
            {editing ? (
              <TextInput
                style={[
                  styles.textArea, 
                  { 
                    borderColor: colors.tint,
                    color: colors.text,
                    backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#FFFFFF'
                  }
                ]}
                value={editData.bio}
                onChangeText={(text) => setEditData({ ...editData, bio: text })}
                placeholder="Tell us about yourself"
                placeholderTextColor={colors.icon}
                multiline
                numberOfLines={3}
              />
            ) : (
              <ThemedText style={styles.fieldValue}>
                {profile?.bio || 'No bio added yet'}
              </ThemedText>
            )}
          </ThemedView>

          {/* Phone Number */}
          <ThemedView style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>Phone Number</ThemedText>
            {editing ? (
              <TextInput
                style={[
                  styles.textInput, 
                  { 
                    borderColor: colors.tint,
                    color: colors.text,
                    backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#FFFFFF'
                  }
                ]}
                value={editData.phoneNumber}
                onChangeText={(text) => setEditData({ ...editData, phoneNumber: text })}
                placeholder="Enter your phone number"
                placeholderTextColor={colors.icon}
                keyboardType="phone-pad"
              />
            ) : (
              <ThemedText style={styles.fieldValue}>
                {profile?.phoneNumber || 'No phone number added'}
              </ThemedText>
            )}
          </ThemedView>



          {/* Save Button */}
          {editing && (
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.tint }]}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
                </>
              )}
            </TouchableOpacity>
          )}
        </ThemedView>

        {/* Logout Section */}
        <ThemedView style={styles.logoutSection}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: '#FF4444' }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            <ThemedText style={styles.logoutButtonText}>Logout</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60, // Account for status bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Ensure logout button is reachable
  },
  profilePictureSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  profilePictureContainer: {
    marginBottom: 16,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPictureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editPictureText: {
    fontSize: 14,
    fontWeight: '500',
  },
  profileInfoSection: {
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.7,
  },
  fieldValue: {
    fontSize: 16,
    lineHeight: 24,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutSection: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 