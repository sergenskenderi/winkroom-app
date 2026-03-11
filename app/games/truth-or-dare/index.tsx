import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/contexts/I18nContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { fetchTruthOrDare, type TruthOrDareItem } from '@/services/truthOrDareService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const options = { headerShown: false };

type Step = 'rules' | 'players' | 'play';
type PlayPhase = 'spinning' | 'choose' | 'result';

interface Player {
  id: string;
  name: string;
}

function shuffleIndices(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
}

function pickOne<T>(arr: T[], remainingRef: React.MutableRefObject<number[]>): T | null {
  if (arr.length === 0) return null;
  if (remainingRef.current.length === 0) remainingRef.current = shuffleIndices(arr.length);
  const idx = remainingRef.current.pop();
  return arr[idx ?? 0] ?? null;
}

export default function TruthOrDareScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [step, setStep] = useState<Step>('rules');
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [truths, setTruths] = useState<TruthOrDareItem[]>([]);
  const [dares, setDares] = useState<TruthOrDareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [playPhase, setPlayPhase] = useState<PlayPhase>('spinning');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [currentItem, setCurrentItem] = useState<TruthOrDareItem | null>(null);
  const truthRemainingRef = useRef<number[]>([]);
  const dareRemainingRef = useRef<number[]>([]);

  const lang = (locale ?? 'en').toLowerCase().split(/[-_]/)[0];

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchTruthOrDare('truth', 50, lang),
      fetchTruthOrDare('dare', 50, lang),
    ]).then(([tList, dList]) => {
      if (cancelled) return;
      setTruths(tList);
      setDares(dList);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [lang]);

  useEffect(() => {
    if (step !== 'play' || playPhase !== 'spinning' || players.length === 0) return;
    const totalSteps = 25;
    let stepCount = 0;
    let delay = 80;
    const run = () => {
      if (stepCount >= totalSteps) {
        const idx = Math.floor(Math.random() * players.length);
        setHighlightedIndex(idx);
        setSelectedPlayer(players[idx]);
        setPlayPhase('choose');
        return;
      }
      setHighlightedIndex((i) => (i + 1) % players.length);
      stepCount += 1;
      if (stepCount > totalSteps - 8) delay += 40;
      timeoutRef = setTimeout(run, delay);
    };
    let timeoutRef = setTimeout(run, delay);
    return () => clearTimeout(timeoutRef);
  }, [step, playPhase, players.length]);

  const handleBack = () => {
    if (step === 'rules') router.back();
    else if (step === 'players') setStep('rules');
    else if (step === 'play') {
      Alert.alert(
        t('games.truthOrDare.exitTitle'),
        t('games.truthOrDare.exitMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('games.truthOrDare.exitConfirm'), style: 'destructive', onPress: () => setStep('players') },
        ]
      );
    }
  };

  const addPlayer = () => {
    const name = newPlayerName.trim();
    if (!name) return;
    if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert(t('games.wrongAnswers.playerExists'), t('games.wrongAnswers.playerExistsMessage'));
      return;
    }
    setPlayers([...players, { id: Date.now().toString(), name }]);
    setNewPlayerName('');
  };

  const removePlayer = (id: string) => setPlayers(players.filter((p) => p.id !== id));

  const startPlay = () => {
    if (players.length < 2) {
      Alert.alert(t('games.wrongAnswers.notEnoughPlayers'), t('games.wrongAnswers.addAtLeast2'));
      return;
    }
    setPlayPhase('spinning');
    setSelectedPlayer(null);
    setCurrentItem(null);
    setHighlightedIndex(0);
    setStep('play');
  };

  const chooseTruth = () => {
    const item = pickOne(truths, truthRemainingRef);
    setCurrentItem(item);
    setPlayPhase('result');
  };

  const chooseDare = () => {
    const item = pickOne(dares, dareRemainingRef);
    setCurrentItem(item);
    setPlayPhase('result');
  };

  const nextTurn = () => {
    setPlayPhase('spinning');
    setSelectedPlayer(null);
    setCurrentItem(null);
    setHighlightedIndex(Math.floor(Math.random() * players.length));
  };

  const cardBg = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
  const border = colorScheme === 'dark' ? '#374151' : '#E5E7EB';
  const topPadding = { paddingTop: Math.max(insets.top, 16) };

  if (loading) {
    return (
      <ThemedView style={[styles.container, topPadding]}>
        <View style={styles.centered}>
          <ThemedText style={[styles.loadingText, { color: colors.text }]}>{t('common.loading')}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (step === 'rules') {
    return (
      <ThemedView style={[styles.container, topPadding]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>{t('games.truthOrDare.title')}</ThemedText>
          <View style={styles.placeholder} />
        </View>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <ThemedText style={styles.cardTitle}>{t('games.truthOrDare.howToPlay')}</ThemedText>
            <ThemedText style={[styles.body, { color: colors.text }]}>{t('games.truthOrDare.rules')}</ThemedText>
          </ThemedView>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.tint }]} onPress={() => setStep('players')}>
            <ThemedText style={styles.primaryBtnText}>{t('common.next')}</ThemedText>
            <Ionicons name="arrow-forward" size={24} color="#FFF" />
          </TouchableOpacity>
        </ScrollView>
      </ThemedView>
    );
  }

  if (step === 'players') {
    return (
      <ThemedView style={[styles.container, topPadding]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>{t('games.truthOrDare.addPlayers')}</ThemedText>
          <View style={styles.placeholder} />
        </View>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <ThemedText style={[styles.subtitle, { color: colors.text }]}>{t('games.wrongAnswers.playersCount', { count: players.length })}</ThemedText>
          <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6', color: colors.text }]}
                placeholder={t('games.wrongAnswers.enterPlayerName')}
                placeholderTextColor="#9CA3AF"
                value={newPlayerName}
                onChangeText={setNewPlayerName}
                onSubmitEditing={addPlayer}
              />
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={addPlayer}>
                <Ionicons name="add" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <ThemedText style={[styles.hint, { color: colors.text }]}>{t('games.wrongAnswers.addAtLeast2')}</ThemedText>
            {players.map((p) => (
              <View key={p.id} style={[styles.playerRow, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6' }]}>
                <ThemedText style={[styles.playerName, { color: colors.text }]}>{p.name}</ThemedText>
                <TouchableOpacity onPress={() => removePlayer(p.id)} hitSlop={12}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ThemedView>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.tint }]} onPress={startPlay}>
            <ThemedText style={styles.primaryBtnText}>{t('games.synonyms.startGame')}</ThemedText>
            <Ionicons name="arrow-forward" size={24} color="#FFF" />
          </TouchableOpacity>
        </ScrollView>
      </ThemedView>
    );
  }

  if (playPhase === 'spinning') {
    return (
      <ThemedView style={[styles.container, topPadding]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>{t('games.truthOrDare.whosTurn')}</ThemedText>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.spinArea}>
          {players.map((p, i) => (
            <Animated.View
              key={p.id}
              style={[
                styles.spinChip,
                {
                  backgroundColor: i === highlightedIndex ? colors.tint : cardBg,
                  borderColor: i === highlightedIndex ? colors.tint : border,
                  transform: [{ scale: i === highlightedIndex ? 1.15 : 1 }],
                },
              ]}
            >
              <ThemedText
                style={[styles.spinChipText, { color: i === highlightedIndex ? '#FFF' : colors.text }]}
                numberOfLines={1}
              >
                {p.name}
              </ThemedText>
            </Animated.View>
          ))}
        </View>
      </ThemedView>
    );
  }

  if (playPhase === 'choose') {
    return (
      <ThemedView style={[styles.container, topPadding]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>{t('games.truthOrDare.title')}</ThemedText>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.choiceArea}>
          <ThemedText style={[styles.choicePrompt, { color: colors.text }]}>
            {t('games.truthOrDare.choosePrompt', { name: selectedPlayer?.name ?? '' })}
          </ThemedText>
          <View style={styles.choiceRow}>
            <TouchableOpacity
              style={[styles.choiceCard, { backgroundColor: '#3B82F6', borderColor: '#2563EB' }]}
              onPress={chooseTruth}
            >
              <Ionicons name="chatbubble-ellipses" size={40} color="#FFF" />
              <ThemedText style={styles.choiceCardText}>{t('games.truthOrDare.truth')}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.choiceCard, { backgroundColor: '#EF4444', borderColor: '#DC2626' }]}
              onPress={chooseDare}
            >
              <Ionicons name="flame" size={40} color="#FFF" />
              <ThemedText style={styles.choiceCardText}>{t('games.truthOrDare.dare')}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, topPadding]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>
          {currentItem?.type === 'truth' ? t('games.truthOrDare.truth') : t('games.truthOrDare.dare')}
        </ThemedText>
        <View style={styles.placeholder} />
      </View>
      <ThemedView style={[styles.resultCard, { backgroundColor: cardBg, borderColor: border }]}>
        <ThemedText style={[styles.resultLabel, { color: colors.text }]}>{selectedPlayer?.name}</ThemedText>
        <ThemedText style={[styles.resultText, { color: colors.text }]}>
          {currentItem?.text ?? t('games.truthOrDare.noContent')}
        </ThemedText>
      </ThemedView>
      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.tint }]} onPress={nextTurn}>
        <ThemedText style={styles.primaryBtnText}>{t('games.truthOrDare.nextTurn')}</ThemedText>
        <Ionicons name="arrow-forward" size={24} color="#FFF" />
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 20 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  placeholder: { width: 40 },
  scroll: { flex: 1, paddingHorizontal: 16 },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 22 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginHorizontal: 16, marginBottom: 32, borderRadius: 12 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 14, marginBottom: 12, paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, fontSize: 16 },
  addBtn: { padding: 12, borderRadius: 12 },
  hint: { fontSize: 13, marginTop: 8, marginBottom: 12 },
  playerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, marginTop: 8 },
  playerName: { fontSize: 16 },
  spinArea: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap: 12, padding: 20 },
  spinChip: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, borderWidth: 2 },
  spinChipText: { fontSize: 18, fontWeight: '600', maxWidth: 120 },
  choiceArea: { flex: 1, padding: 20, justifyContent: 'center' },
  choicePrompt: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 32 },
  choiceRow: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  choiceCard: { width: '45%', padding: 24, borderRadius: 20, borderWidth: 2, alignItems: 'center', gap: 12 },
  choiceCardText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  resultCard: { flex: 1, marginHorizontal: 16, padding: 24, borderRadius: 16, borderWidth: 1, justifyContent: 'center' },
  resultLabel: { fontSize: 14, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  resultText: { fontSize: 22, fontWeight: '700', textAlign: 'center', lineHeight: 32 },
});
