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

  const handleBackPress = () => {
    router.back();
  };

  const handleSingleDeviceMode = () => {
    router.push('/games/one-word-unites/single-device' as any);
  };

  const handleMultiDeviceMode = () => {
    router.push('/games/one-word-unites/multi-device' as any);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
        </ThemedView>

        {/* Game Icon */}
        <ThemedView style={styles.gameIconContainer}>
          <Ionicons name="people" size={48} color="#FFFFFF" />
        </ThemedView>

        {/* Game Title */}
        <ThemedView style={styles.titleSection}>
          <ThemedText style={styles.gameTitle}>{t('games.oneWordUnites.title')}</ThemedText>
          <ThemedText style={styles.gameSubtitle}>{t('games.oneWordUnites.subtitle')}</ThemedText>
        </ThemedView>

        {/* Game Description */}
        <ThemedView style={styles.descriptionSection}>
          <ThemedText style={styles.description}>{t('games.oneWordUnites.description')}</ThemedText>
        </ThemedView>

        {/* Game Modes */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>🎮 {t('games.oneWordUnites.gameModes')}</ThemedText>
          
          {/* Single Device Mode */}
          <TouchableOpacity 
            style={[styles.modeCard, { backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF' }]}
            onPress={handleSingleDeviceMode}
            activeOpacity={0.8}
          >
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

          {/* Multi Device Mode */}
          <ThemedView 
            style={[
              styles.modeCard, 
              styles.disabledCard,
              { 
                backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6',
                opacity: 0.6
              }
            ]}
          >
            <ThemedView style={styles.modeHeader}>
              <Ionicons name="phone-portrait-outline" size={32} color="#9CA3AF" />
              <ThemedView style={styles.modeTitleContainer}>
                <ThemedText style={[styles.modeTitle, styles.disabledText]}>{t('games.oneWordUnites.multiDevice')}</ThemedText>
                <ThemedText style={styles.comingSoonText}>({t('games.oneWordUnites.comingSoon')})</ThemedText>
              </ThemedView>
            </ThemedView>
            <ThemedText style={[styles.modeDescription, styles.disabledText]}>
              {t('games.oneWordUnites.multiDeviceDesc')}
            </ThemedText>
            <ThemedView style={styles.modeFeatures}>
              <ThemedText style={[styles.modeFeature, styles.disabledText]}>• {t('games.oneWordUnites.multiDeviceFeature1')}</ThemedText>
              <ThemedText style={[styles.modeFeature, styles.disabledText]}>• {t('games.oneWordUnites.multiDeviceFeature2')}</ThemedText>
              <ThemedText style={[styles.modeFeature, styles.disabledText]}>• {t('games.oneWordUnites.multiDeviceFeature3')}</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  gameIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0a7ea4',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    paddingVertical: 8
  },
  gameSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  descriptionSection: {
    marginBottom: 32,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    opacity: 0.8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
  },
  modeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  modeDescription: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
    marginBottom: 12,
  },
  modeFeatures: {
    gap: 4,
    backgroundColor: 'transparent',
  },
  modeFeature: {
    fontSize: 14,
    opacity: 0.7,
  },
  disabledCard: {
    opacity: 0.6,
  },
  modeTitleContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'transparent',
  },
  disabledText: {
    opacity: 0.6,
  },
  comingSoonText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 2,
  },
}); 