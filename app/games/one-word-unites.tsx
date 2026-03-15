import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function OneWordUnitesGameScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/games/one-word-unites/single-device' as any);
  }, [router]);
  return null;
}

/* Game Modes screen - commented out; home goes direct to single-device (Game Rules)
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/contexts/I18nContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function OneWordUnitesGameScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { t } = useTranslation();
  const handleBackPress = () => router.back();
  const handleSingleDeviceMode = () => router.push('/games/one-word-unites/single-device' as any);
  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
        </ThemedView>
        <ThemedView style={styles.gameIconContainer}>
          <Ionicons name="people" size={48} color="#FFFFFF" />
        </ThemedView>
        <ThemedView style={styles.titleSection}>
          <ThemedText style={styles.gameTitle}>{t('games.oneWordUnites.title')}</ThemedText>
          <ThemedText style={styles.gameSubtitle}>{t('games.oneWordUnites.subtitle')}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.descriptionSection}>
          <ThemedText style={styles.description}>{t('games.oneWordUnites.description')}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>🎮 {t('games.oneWordUnites.gameModes')}</ThemedText>
          <TouchableOpacity style={[styles.modeCard, { backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF' }]} onPress={handleSingleDeviceMode} activeOpacity={0.8}>
            <ThemedView style={styles.modeHeader}>
              <Ionicons name="phone-portrait" size={32} color={colors.tint} />
              <ThemedText style={styles.modeTitle}>{t('games.oneWordUnites.singleDevice')}</ThemedText>
            </ThemedView>
            <ThemedText style={styles.modeDescription}>{t('games.oneWordUnites.singleDeviceDesc')}</ThemedText>
            <ThemedView style={styles.modeFeatures}>
              <ThemedText style={styles.modeFeature}>• {t('games.oneWordUnites.singleDeviceFeature1')}</ThemedText>
              <ThemedText style={styles.modeFeature}>• {t('games.oneWordUnites.singleDeviceFeature2')}</ThemedText>
              <ThemedText style={styles.modeFeature}>• {t('games.oneWordUnites.singleDeviceFeature3')}</ThemedText>
            </ThemedView>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}
const styles = StyleSheet.create({ container: {}, content: {}, header: {}, backButton: {}, headerTitle: {}, placeholder: {}, gameIconContainer: {}, titleSection: {}, gameTitle: {}, gameSubtitle: {}, descriptionSection: {}, description: {}, section: {}, sectionTitle: {}, sectionText: {}, modeCard: {}, modeHeader: {}, modeTitle: {}, modeDescription: {}, modeFeatures: {}, modeFeature: {}, disabledCard: {}, modeTitleContainer: {}, disabledText: {}, comingSoonText: {} });
*/ 