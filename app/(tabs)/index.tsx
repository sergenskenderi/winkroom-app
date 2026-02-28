import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTranslation } from '@/contexts/I18nContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

const GAMES = [
  { id: 'one-word-unites', route: '/games/one-word-unites', icon: 'people' as const, accent: '#6366F1' },
  { id: 'guess-the-paint', route: '/games/mafia-role-assignment', icon: 'color-palette' as const, accent: '#8B5CF6' },
  { id: 'fool-dance', route: '/games/charades', icon: 'musical-notes' as const, accent: '#10B981' },
  { id: 'synonyms', route: '/games/synonyms', icon: 'swap-horizontal' as const, accent: '#F59E0B' },
];

export default function GamesScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { t } = useTranslation();
  const isDark = colorScheme === 'dark';
  const cardBg = isDark ? '#1F2937' : '#FFFFFF';
  const descColor = isDark ? '#9CA3AF' : '#666666';

  const handleGamePress = (game: (typeof GAMES)[0]) => {
    if (game.route) router.push(game.route as any);
  };

  const handleRateUs = () => {
    Linking.openURL('https://apps.apple.com/app/idXXXXXXXX').catch(() =>
      Alert.alert(t('common.error'), t('home.couldNotOpen'))
    );
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  const handleTerms = () => {
    Linking.openURL('https://example.com/terms').catch(() =>
      Alert.alert(t('common.error'), t('home.couldNotOpenTerms'))
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {GAMES.map((game) => {
          const canPress = !!game.route;
          return (
            <TouchableOpacity
              key={game.id}
              activeOpacity={0.85}
              onPress={() => handleGamePress(game)}
              disabled={!canPress}
              style={[styles.card, { backgroundColor: cardBg }]}
            >
              <View style={styles.cardTop}>
                <ThemedText style={styles.cardTitle}>{t(`home.dashboard.${game.id}.title`)}</ThemedText>
                <ThemedText style={[styles.cardDescription, { color: descColor }]}>
                  {t(`home.dashboard.${game.id}.description`)}
                </ThemedText>
              </View>
              <View style={[styles.cardIllustration, { backgroundColor: game.accent + '18' }]}>
                <View style={[styles.cardIconWrap, { backgroundColor: game.accent }]}>
                  <Ionicons name={game.icon} size={48} color="#FFFFFF" />
                </View>
                {!canPress && (
                  <View style={styles.comingSoonBadge}>
                    <ThemedText style={styles.comingSoonText}>{t('games.oneWordUnites.comingSoon')}</ThemedText>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={[styles.footer, { backgroundColor: cardBg }]}>
          <TouchableOpacity style={styles.footerRow} onPress={handleRateUs} activeOpacity={0.7}>
            <Ionicons name="star" size={22} color={descColor} />
            <ThemedText style={[styles.footerText, { color: descColor }]}>{t('home.rateUs')}</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={descColor} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerRow} onPress={handleSettings} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={22} color={descColor} />
            <ThemedText style={[styles.footerText, { color: descColor }]}>{t('home.settings')}</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={descColor} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerRow} onPress={handleTerms} activeOpacity={0.7}>
            <Ionicons name="document-text-outline" size={22} color={descColor} />
            <ThemedText style={[styles.footerText, { color: descColor }]}>{t('home.terms')}</ThemedText>
            <Ionicons name="chevron-forward" size={20} color={descColor} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  cardTop: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    lineHeight: 32,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  cardIllustration: {
    height: 140,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  comingSoonBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    borderRadius: 28,
    padding: 16,
    marginBottom: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
});
