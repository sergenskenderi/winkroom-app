import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { Config } from '@/constants/Config';
import { useTranslation } from '@/contexts/I18nContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Alert, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { type LocaleCode } from '@/constants/locales';

const LOCALE_OPTIONS: LocaleCode[] = ['en', 'tr', 'it', 'de', 'fr', 'es', 'sq'];

const THEME_OPTIONS: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { t, locale, setLocale, localeNames } = useTranslation();
  const { themePreference, setThemePreference } = useTheme();
  const cardBg = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
  const cardBorder = colorScheme === 'dark' ? '#374151' : '#E5E7EB';

  const themeLabel = (value: 'light' | 'dark' | 'system') => {
    if (value === 'light') return t('home.themeLight');
    if (value === 'dark') return t('home.themeDark');
    return t('home.themeSystem');
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert(t('common.error'), t('home.couldNotOpen')));
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>{t('home.settings')}</ThemedText>
        <ThemedView style={styles.placeholder} />
      </ThemedView>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <ThemedView style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <ThemedView style={styles.sectionHeader}>
            <Ionicons name="sunny" size={24} color={colors.tint} />
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>{t('home.theme')}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.localeList}>
            {THEME_OPTIONS.map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.localeRow, themePreference === value && { backgroundColor: colors.tint + '20' }]}
                onPress={() => setThemePreference(value)}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.localeName, { color: colors.text }]}>{themeLabel(value)}</ThemedText>
                {themePreference === value && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.tint} />
                )}
              </TouchableOpacity>
            ))}
          </ThemedView>
        </ThemedView>
        <ThemedView style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <ThemedView style={styles.sectionHeader}>
            <Ionicons name="language" size={24} color={colors.tint} />
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>{t('home.language')}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.localeList}>
            {LOCALE_OPTIONS.map((code) => (
              <TouchableOpacity
                key={code}
                style={[styles.localeRow, locale === code && { backgroundColor: colors.tint + '20' }]}
                onPress={() => setLocale(code)}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.localeName, { color: colors.text }]}>{localeNames[code]}</ThemedText>
                {locale === code && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.tint} />
                )}
              </TouchableOpacity>
            ))}
          </ThemedView>
        </ThemedView>
        <ThemedView style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <ThemedView style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={24} color={colors.tint} />
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>{t('home.legal')}</ThemedText>
          </ThemedView>
          <TouchableOpacity style={[styles.localeRow, { backgroundColor: 'transparent' }]} onPress={() => openUrl(Config.PRIVACY_POLICY_URL)} activeOpacity={0.7}>
            <ThemedText style={[styles.localeName, { color: colors.text }]}>{t('home.privacyPolicy')}</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.localeRow, { backgroundColor: 'transparent' }]} onPress={() => openUrl(Config.TERMS_URL)} activeOpacity={0.7}>
            <ThemedText style={[styles.localeName, { color: colors.text }]}>{t('home.terms')}</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.localeRow, { backgroundColor: 'transparent' }]} onPress={() => openUrl(Config.SUPPORT_URL)} activeOpacity={0.7}>
            <ThemedText style={[styles.localeName, { color: colors.text }]}>{t('home.support')}</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={colors.tint} />
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  placeholder: {
    width: 36,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  localeList: {
    gap: 4,
    backgroundColor: 'transparent',
  },
  localeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  localeName: {
    fontSize: 16,
    fontWeight: '500',
  },
});
