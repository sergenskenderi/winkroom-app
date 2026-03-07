import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/contexts/I18nContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { fetchNeverHaveIEverQuestions, type NeverHaveIEverQuestionItem } from '@/services/neverHaveIEverService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const options = { headerShown: false };

function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  return arr.sort(() => Math.random() - 0.5);
}

export default function NeverHaveIEverScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [step, setStep] = useState<'intro' | 'game'>('intro');
  const [questions, setQuestions] = useState<NeverHaveIEverQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const remainingRef = useRef<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    const lang = (locale ?? 'en').toLowerCase().split(/[-_]/)[0];
    fetchNeverHaveIEverQuestions(100, lang)
      .then((list) => {
        if (cancelled) return;
        const shuffled = list?.length ? [...list].sort(() => Math.random() - 0.5) : [];
        setQuestions(shuffled);
        remainingRef.current = [];
        setCurrentIndex(null);
      })
      .catch(() => setQuestions([]))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [locale]);

  const currentQuestion = step === 'game' && questions.length > 0 && currentIndex !== null
    ? questions[currentIndex]
    : null;

  const pickNext = () => {
    if (questions.length === 0) return;
    if (remainingRef.current.length === 0) {
      remainingRef.current = shuffleIndices(questions.length);
    }
    const next = remainingRef.current.pop();
    setCurrentIndex(next ?? null);
  };

  const handleNext = () => {
    if (questions.length === 0) return;
    pickNext();
  };

  const handleStart = () => {
    if (questions.length === 0) {
      setStep('game');
      setCurrentIndex(null);
      return;
    }
    if (remainingRef.current.length === 0) {
      remainingRef.current = shuffleIndices(questions.length);
    }
    const next = remainingRef.current.pop();
    setCurrentIndex(next ?? null);
    setStep('game');
  };

  const topPadding = { paddingTop: Math.max(insets.top, 16) };

  if (loading) {
    return (
      <ThemedView style={[styles.container, topPadding]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={[styles.loadingText, { color: colors.text }]}>{t('common.loading')}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const cardBg = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
  const border = colorScheme === 'dark' ? '#374151' : '#E5E7EB';

  if (step === 'intro') {
    return (
      <ThemedView style={[styles.container, topPadding]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <Ionicons name="hand-left" size={24} color={colors.tint} />
            <ThemedText style={styles.headerTitle}>{t('games.neverHaveIEver.title')}</ThemedText>
          </ThemedView>
          <View style={styles.placeholder} />
        </ThemedView>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedText style={styles.cardTitle}>{t('games.neverHaveIEver.howToPlay')}</ThemedText>
          <ThemedText style={[styles.rulesText, { color: colors.text }]}>{t('games.neverHaveIEver.rules')}</ThemedText>
        </ThemedView>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.tint }]}
          onPress={handleStart}
        >
          <ThemedText style={styles.primaryButtonText}>{t('games.neverHaveIEver.start')}</ThemedText>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, topPadding]}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{t('games.neverHaveIEver.title')}</ThemedText>
        <View style={styles.placeholder} />
      </ThemedView>
      <ThemedView style={[styles.questionCard, { backgroundColor: cardBg, borderColor: border }]}>
        <ThemedText style={[styles.questionText, { color: colors.text }]}>
          {currentQuestion?.question ?? t('games.neverHaveIEver.noQuestions')}
        </ThemedText>
      </ThemedView>
      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor: colors.tint }]}
        onPress={handleNext}
      >
        <ThemedText style={styles.primaryButtonText}>{t('games.neverHaveIEver.next')}</ThemedText>
        <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 16 },
  backButton: { padding: 8 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  placeholder: { width: 40 },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  rulesText: { fontSize: 15, lineHeight: 22 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 32,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  questionCard: {
    flex: 1,
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionText: { fontSize: 22, fontWeight: '700', textAlign: 'center', lineHeight: 32 },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
  },
});
