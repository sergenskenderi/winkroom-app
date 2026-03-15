import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { TERMS_CONTENT } from '@/constants/LegalContent';
import { useTranslation } from '@/contexts/I18nContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function TermsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>{t('home.terms')}</ThemedText>
        <ThemedView style={styles.placeholder} />
      </ThemedView>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.body, { color: colors.text }]}>{TERMS_CONTENT.trim()}</ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8 },
  backButton: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', flex: 1 },
  placeholder: { width: 36 },
  scroll: { flex: 1, paddingHorizontal: 20, paddingBottom: 24 },
  body: { fontSize: 15, lineHeight: 24 },
});
