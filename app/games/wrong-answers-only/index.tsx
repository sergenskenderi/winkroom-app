import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/contexts/I18nContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { fetchWrongAnswerQuestions, reportWrongAnswerQuestionUsage, type WrongAnswerQuestionItem } from '@/services/wrongAnswersService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  PanResponder,
} from 'react-native';

type Step = 'rules' | 'players' | 'game';
type GamePhase = 'askerIntro' | 'asking' | 'roundSummary' | 'final';

interface Player {
  id: string;
  name: string;
}

interface QuestionItem {
  id?: string;
  question: string;
}

const FALLBACK_QUESTIONS: QuestionItem[] = [
  { question: 'What is your favorite food?' },
  { question: 'What is your dream job?' },
  { question: 'Where would you like to travel next?' },
  { question: 'What is your biggest fear?' },
  { question: 'What is your favorite movie?' },
  { question: 'What is your secret talent?' },
  { question: 'What is something you cannot live without?' },
  { question: 'What is your favorite hobby?' },
];

export const options = { headerShown: false };

export default function WrongAnswersOnlyScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { t, locale } = useTranslation();

  const [step, setStep] = useState<Step>('rules');
  const [phase, setPhase] = useState<GamePhase>('asking');
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const questionPoolRef = useRef<{ list: QuestionItem[]; index: number }>({
    list: [],
    index: 0,
  });
  const usedQuestionIdsRef = useRef<Set<string>>(new Set());
  const reportedIdsRef = useRef<Set<string>>(new Set());
  const [currentQuestion, setCurrentQuestion] = useState<QuestionItem | null>(null);

  const [currentAskerIndex, setCurrentAskerIndex] = useState(0);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [numberOfRounds, setNumberOfRounds] = useState(2);
  const [currentAnswerIndex, setCurrentAnswerIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [timePerPerson, setTimePerPerson] = useState(30);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const timerFiredRef = useRef(false);
  const handleAnswerRef = useRef<(c: boolean) => void>(() => {});
  const goToRoundSummaryRef = useRef(() => {});

  useEffect(() => {
    let cancelled = false;
    const lang = locale ?? 'en';
    fetchWrongAnswerQuestions(80, lang)
      .then((items: WrongAnswerQuestionItem[]) => {
        if (cancelled) return;
        if (!items || items.length === 0) {
          setQuestions(FALLBACK_QUESTIONS);
          return;
        }
        const mapped: QuestionItem[] = items.map((x) => ({
          id: x.id,
          question: x.question,
        }));
        setQuestions(mapped);
      })
      .catch(() => {
        setQuestions(FALLBACK_QUESTIONS);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    if (phase !== 'final') return;
    const ids = Array.from(reportedIdsRef.current);
    if (ids.length === 0) return;
    reportWrongAnswerQuestionUsage(ids).catch(() => {});
  }, [phase]);

  useEffect(() => {
    if (phase === 'asking') {
      timerFiredRef.current = false;
      setTimeRemaining(timePerPerson);
    }
  }, [phase, currentAskerIndex, timePerPerson]);

  useEffect(() => {
    if (phase !== 'asking' || timePerPerson <= 0) return;
    const id = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (!timerFiredRef.current) {
            timerFiredRef.current = true;
            goToRoundSummaryRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, currentAskerIndex, timePerPerson]);

  const handleBack = () => {
    if (step === 'rules') {
      router.back();
      return;
    }
    if (step === 'players') {
      setStep('rules');
      return;
    }
    Alert.alert(
      t('games.oneWordUnites.exitGame'),
      t('games.oneWordUnites.exitConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('games.oneWordUnites.exitGameButton'),
          style: 'destructive',
          onPress: () => {
            setStep('rules');
            setPhase('asking');
            setCurrentAskerIndex(0);
            setCurrentRoundIndex(0);
            setCurrentAnswerIndex(0);
            setScores({});
            setCurrentQuestion(null);
            usedQuestionIdsRef.current = new Set();
            reportedIdsRef.current = new Set();
          },
        },
      ]
    );
  };

  const addPlayer = () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    if (players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert(
        t('games.wrongAnswers.playerExists'),
        t('games.wrongAnswers.playerExistsMessage')
      );
      return;
    }
    setPlayers([
      ...players,
      {
        id: Date.now().toString(),
        name: trimmed,
      },
    ]);
    setNewPlayerName('');
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const ensureQuestionPool = () => {
    const base = questions.length > 0 ? questions : FALLBACK_QUESTIONS;
    if (!questionPoolRef.current.list.length || questionPoolRef.current.list.length !== base.length) {
      const shuffled = [...base].sort(() => Math.random() - 0.5);
      questionPoolRef.current.list = shuffled;
      questionPoolRef.current.index = 0;
    }
  };

  const pickNextQuestion = () => {
    ensureQuestionPool();
    const pool = questionPoolRef.current;
    const used = usedQuestionIdsRef.current;
    let next: QuestionItem | null = null;
    let attempts = 0;
    const maxAttempts = pool.list.length + 1;
    while (attempts < maxAttempts) {
      if (pool.index >= pool.list.length) {
        const allUsed = pool.list.every((q) => q.id && used.has(q.id));
        if (allUsed && pool.list.length > 0) {
          used.clear();
          pool.list = [...pool.list].sort(() => Math.random() - 0.5);
        }
        pool.index = 0;
      }
      const candidate = pool.list[pool.index];
      pool.index += 1;
      if (candidate && (!candidate.id || !used.has(candidate.id))) {
        next = candidate;
        break;
      }
      attempts += 1;
    }
    setCurrentQuestion(next ?? null);
    if (next?.id) {
      used.add(next.id);
      reportedIdsRef.current.add(next.id);
    }
  };

  const startGame = () => {
    if (players.length < 2) {
      Alert.alert(
        t('games.wrongAnswers.notEnoughPlayers'),
        t('games.wrongAnswers.addAtLeast2')
      );
      return;
    }
    setScores({});
    setCurrentAskerIndex(0);
    setCurrentRoundIndex(0);
    setCurrentAnswerIndex(0);
    setPhase('askerIntro');
    usedQuestionIdsRef.current = new Set();
    reportedIdsRef.current = new Set();
    setStep('game');
  };

  const startAskerRound = () => {
    pickNextQuestion();
    setPhase('asking');
  };

  const totalRounds = numberOfRounds;
  const isLastAskerOfRound = currentAskerIndex + 1 >= players.length;
  const isLastRound = currentRoundIndex + 1 >= numberOfRounds;

  const getAnswerOrderForAsker = (askerIndex: number) => {
    const list: number[] = [];
    players.forEach((_, index) => {
      if (index !== askerIndex) list.push(index);
    });
    return list;
  };

  const handleAnswer = (isCorrect: boolean) => {
    const askerIndex = currentAskerIndex;
    const order = getAnswerOrderForAsker(askerIndex);
    const answerIndex = order[currentAnswerIndex];
    const answerPlayer = players[answerIndex];
    if (isCorrect && answerPlayer) {
      setScores((prev) => ({
        ...prev,
        [answerPlayer.id]: (prev[answerPlayer.id] ?? 0) + 1,
      }));
    }
    pickNextQuestion();
    if (players.length > 2) {
      setCurrentAnswerIndex((i) => (i + 1) % order.length);
    }
  };
  handleAnswerRef.current = handleAnswer;

  const goToRoundSummary = () => setPhase('roundSummary');
  goToRoundSummaryRef.current = goToRoundSummary;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 60) {
          handleAnswer(true);
        } else if (gestureState.dx < -60) {
          handleAnswer(false);
        }
      },
    })
  ).current;

  const goToNextAsker = () => {
    const nextAsker = currentAskerIndex + 1;
    setCurrentAskerIndex(nextAsker);
    setCurrentAnswerIndex(0);
    setPhase('askerIntro');
  };

  const handleScoreboardContinue = () => {
    if (isLastAskerOfRound && isLastRound) {
      setPhase('final');
      return;
    }
    if (isLastAskerOfRound && !isLastRound) {
      setCurrentRoundIndex((r) => r + 1);
      setCurrentAskerIndex(0);
      setCurrentAnswerIndex(0);
      setPhase('askerIntro');
      return;
    }
    goToNextAsker();
  };

  const renderRules = () => {
    const cardBg = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
    const border = colorScheme === 'dark' ? '#374151' : '#E5E7EB';
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <Ionicons name="document-text" size={24} color={colors.tint} />
            <ThemedText style={styles.headerTitle}>
              {t('games.wrongAnswers.rulesTitle')}
            </ThemedText>
          </ThemedView>
          <View style={styles.placeholder} />
        </ThemedView>
        <ThemedView style={[styles.rulesCard, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedText style={styles.rulesCardTitle}>
            {t('games.wrongAnswers.rulesHowToPlay')}
          </ThemedText>
          <ThemedText style={[styles.rulesText, { color: colors.text }]}>
            {t('games.wrongAnswers.rulesIntro')}
          </ThemedText>
        </ThemedView>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.tint }]}
          onPress={() => setStep('players')}
        >
          <ThemedText style={styles.primaryButtonText}>{t('common.next')}</ThemedText>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderPlayers = () => {
    const cardBg = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
    const border = colorScheme === 'dark' ? '#374151' : '#E5E7EB';
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <Ionicons name="people" size={24} color={colors.tint} />
            <ThemedText style={styles.headerTitle}>
              {t('games.wrongAnswers.addPlayers')}
            </ThemedText>
          </ThemedView>
          <View style={styles.placeholder} />
        </ThemedView>
        <ThemedText style={[styles.subtitle, { color: colors.text }]}>
          {t('games.wrongAnswers.playersCount', { count: players.length })}
        </ThemedText>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.addRow}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6',
                  color: colors.text,
                },
              ]}
              placeholder={t('games.wrongAnswers.enterPlayerName')}
              placeholderTextColor="#9CA3AF"
              value={newPlayerName}
              onChangeText={setNewPlayerName}
              onSubmitEditing={addPlayer}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.tint }]}
              onPress={addPlayer}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <ThemedText style={[styles.hint, { color: colors.text }]}>
            {t('games.wrongAnswers.addAtLeast2')}
          </ThemedText>
          <View style={styles.playerList}>
            {players.map((p) => (
              <View
                key={p.id}
                style={[
                  styles.playerRow,
                  { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6' },
                ]}
              >
                <ThemedText style={[styles.playerName, { color: colors.text }]}>
                  {p.name}
                </ThemedText>
                <TouchableOpacity onPress={() => removePlayer(p.id)} hitSlop={12}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ThemedView>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border, marginTop: 16 }]}>
          <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>
            {t('games.wrongAnswers.roundsLabel')}
          </ThemedText>
          <View style={styles.roundsRow}>
            {[1, 2, 3].map((n) => (
              <TouchableOpacity
                key={n}
                style={[
                  styles.roundChip,
                  {
                    backgroundColor: numberOfRounds === n ? colors.tint : colorScheme === 'dark' ? '#374151' : '#F3F4F6',
                    borderColor: numberOfRounds === n ? colors.tint : border,
                  },
                ]}
                onPress={() => setNumberOfRounds(n)}
              >
                <ThemedText
                  style={[
                    styles.roundChipText,
                    { color: numberOfRounds === n ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {n}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border, marginTop: 16 }]}>
          <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>
            {t('games.wrongAnswers.timePerQuestionLabel')}
          </ThemedText>
          <View style={styles.roundsRow}>
            {[30, 45, 60].map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[
                  styles.roundChip,
                  {
                    backgroundColor: timePerPerson === sec ? colors.tint : colorScheme === 'dark' ? '#374151' : '#F3F4F6',
                    borderColor: timePerPerson === sec ? colors.tint : border,
                  },
                ]}
                onPress={() => setTimePerPerson(sec)}
              >
                <ThemedText
                  style={[
                    styles.roundChipText,
                    { color: timePerPerson === sec ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {t('games.wrongAnswers.timeSeconds', { seconds: sec })}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor:
                players.length >= 2 ? colors.tint : colorScheme === 'dark' ? '#374151' : '#E5E7EB',
            },
          ]}
          onPress={startGame}
          disabled={players.length < 2}
        >
          <ThemedText style={styles.primaryButtonText}>{t('games.synonyms.startGame')}</ThemedText>
          <Ionicons name="play" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderAskerIntro = () => {
    const cardBg = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
    const border = colorScheme === 'dark' ? '#374151' : '#E5E7EB';
    const asker = players[currentAskerIndex];
    const roundNumber = currentRoundIndex + 1;
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.content}>
          <ThemedView style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.tint} />
            </TouchableOpacity>
            <ThemedView style={styles.headerContent}>
              <Ionicons name="help-buoy" size={24} color={colors.tint} />
              <ThemedText style={styles.headerTitle}>
                {t('games.wrongAnswers.roundLabel', { round: roundNumber, total: totalRounds })}
              </ThemedText>
            </ThemedView>
            <View style={styles.placeholder} />
          </ThemedView>
          <ThemedView style={[styles.askerIntroCard, { backgroundColor: cardBg, borderColor: border }]}>
            <ThemedText style={[styles.askerIntroLabel, { color: colors.text }]}>
              {t('games.wrongAnswers.currentAsker')}
            </ThemedText>
            <View style={[styles.askerIntroAvatar, { backgroundColor: colors.tint }]}>
              <Text style={styles.askerIntroInitial}>
                {asker?.name ? asker.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <ThemedText style={[styles.askerIntroName, { color: colors.text }]}>
              {asker?.name ?? '—'}
            </ThemedText>
            <TouchableOpacity
              style={[styles.primaryButton, styles.askerIntroButton, { backgroundColor: colors.tint }]}
              onPress={startAskerRound}
            >
              <ThemedText style={styles.primaryButtonText}>{t('common.next')}</ThemedText>
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    );
  };

  const renderGameAsking = () => {
    const cardBg = colorScheme === 'dark' ? '#111827' : '#FFFFFF';
    const border = colorScheme === 'dark' ? '#374151' : '#E5E7EB';
    const asker = players[currentAskerIndex];
    const order = getAnswerOrderForAsker(currentAskerIndex);
    const answererIndex = order[currentAnswerIndex];
    const answerer = players[answererIndex];
    const roundNumber = currentRoundIndex + 1;
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.content}>
          <ThemedView style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.tint} />
            </TouchableOpacity>
            <ThemedView style={styles.headerContent}>
              <Ionicons name="help-buoy" size={24} color={colors.tint} />
              <ThemedText style={styles.headerTitle}>
                {t('games.wrongAnswers.roundLabel', { round: roundNumber, total: totalRounds })}
              </ThemedText>
            </ThemedView>
            <View style={styles.placeholder} />
          </ThemedView>
          <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <ThemedText style={styles.sectionLabel}>
              {t('games.wrongAnswers.currentAsker')}
            </ThemedText>
            <View style={styles.playerBadgeRow}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.tint },
                ]}
              >
                <Text style={styles.avatarInitial}>
                  {asker?.name ? asker.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
              <ThemedText style={[styles.playerTitle, { color: colors.text }]}>
                {asker?.name ?? '—'}
              </ThemedText>
            </View>
            <ThemedText style={[styles.sectionLabel, { marginTop: 16 }]}>
              {t('games.wrongAnswers.currentAnswerer')}
            </ThemedText>
            <ThemedText style={[styles.playerSubtitle, { color: colors.text }]}>
              {answerer?.name ?? '—'}
            </ThemedText>
            <View style={[styles.timerRow, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6', borderColor: border }]}>
              <Ionicons name="time-outline" size={20} color={timeRemaining <= 10 ? '#EF4444' : colors.tint} />
              <ThemedText style={[styles.timerText, { color: colors.text }]}>
                {t('games.wrongAnswers.timeForThisQuestion', { time: timeRemaining })}
              </ThemedText>
            </View>
            <ThemedText style={[styles.sectionLabel, { marginTop: 20 }]}>
              {t('games.wrongAnswers.questionTitle')}
            </ThemedText>
            <ThemedView
              style={[
                styles.questionCard,
                { backgroundColor: colorScheme === 'dark' ? '#111827' : '#F9FAFB', borderColor: border },
              ]}
              {...panResponder.panHandlers}
            >
              <ThemedText style={[styles.questionText, { color: colors.text }]}>
                {currentQuestion?.question ?? '—'}
              </ThemedText>
            </ThemedView>
            <ThemedText style={[styles.hint, { color: colors.text, marginTop: 12 }]}>
              {t('games.wrongAnswers.swipeHint')}
            </ThemedText>
          </ThemedView>
          <View style={styles.answerButtonsRow}>
            <TouchableOpacity
              style={[styles.answerButton, { backgroundColor: '#EF4444' }]}
              onPress={() => handleAnswer(false)}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
              <ThemedText style={styles.answerButtonText}>
                {t('games.wrongAnswers.wrongButton')}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.answerButton, { backgroundColor: '#10B981' }]}
              onPress={() => handleAnswer(true)}
            >
              <Ionicons name="checkmark" size={22} color="#FFFFFF" />
              <ThemedText style={styles.answerButtonText}>
                {t('games.wrongAnswers.correctButton')}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ThemedView>
    );
  };

  const renderScoreboard = () => {
    const cardBg = colorScheme === 'dark' ? '#111827' : '#FFFFFF';
    const border = colorScheme === 'dark' ? '#374151' : '#E5E7EB';
    const combined = players.map((p) => ({
      player: p,
      score: scores[p.id] ?? 0,
    }));
    const sorted = [...combined].sort((a, b) => b.score - a.score);
    const currentAsker = players[currentAskerIndex];
    const showFinalButton = isLastAskerOfRound && isLastRound;
    const showNextRoundButton = isLastAskerOfRound && !isLastRound;
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <Ionicons name="podium" size={24} color={colors.tint} />
            <ThemedText style={styles.headerTitle}>
              {t('games.wrongAnswers.scoreboardTitle')}
            </ThemedText>
          </ThemedView>
          <View style={styles.placeholder} />
        </ThemedView>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedText style={styles.sectionLabel}>
            {t('games.wrongAnswers.roundFinishedTitle')}
          </ThemedText>
          <ThemedText style={[styles.hint, { color: colors.text, marginTop: 8 }]}>
            {t('games.wrongAnswers.roundFinishedSubtitle')}
          </ThemedText>
          <View style={{ marginTop: 16, marginBottom: 8 }}>
            <ThemedText style={[styles.sectionLabel, { marginBottom: 8 }]}>
              {t('games.wrongAnswers.pointsLabel')}
            </ThemedText>
            {sorted.map(({ player, score }) => (
              <View
                key={player.id}
                style={[
                  styles.scoreRow,
                  { backgroundColor: colorScheme === 'dark' ? '#111827' : '#F3F4F6' },
                ]}
              >
                <View style={styles.scoreRowLeft}>
                  <View
                    style={[
                      styles.avatarSmall,
                      {
                        backgroundColor: colors.tint,
                      },
                    ]}
                  >
                    <Text style={styles.avatarInitialSmall}>
                      {player.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <ThemedText style={[styles.scoreName, { color: colors.text }]}>
                    {player.name}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.scoreValue, { color: colors.text }]}>
                  {score} {t('games.wrongAnswers.pts')}
                </ThemedText>
              </View>
            ))}
          </View>
        </ThemedView>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.tint }]}
          onPress={handleScoreboardContinue}
        >
          <ThemedText style={styles.primaryButtonText}>
            {showFinalButton
              ? t('games.wrongAnswers.showFinalResults')
              : showNextRoundButton
                ? t('games.wrongAnswers.nextRound')
                : t('games.wrongAnswers.nextAsker')}
          </ThemedText>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        {currentAsker && !isLastAskerOfRound && (
          <ThemedText style={[styles.hint, { color: colors.text }]}>
            {t('games.wrongAnswers.currentAsker')}: {currentAsker.name}
          </ThemedText>
        )}
      </ScrollView>
    );
  };

  const renderFinal = () => {
    const cardBg = colorScheme === 'dark' ? '#111827' : '#FFFFFF';
    const border = colorScheme === 'dark' ? '#374151' : '#E5E7EB';
    const combined = players.map((p) => ({
      player: p,
      score: scores[p.id] ?? 0,
    }));
    const sorted = [...combined].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <Ionicons name="trophy" size={24} color={colors.tint} />
            <ThemedText style={styles.headerTitle}>
              {t('games.wrongAnswers.gameComplete')}
            </ThemedText>
          </ThemedView>
          <View style={styles.placeholder} />
        </ThemedView>
        <ThemedView style={[styles.finalHeroCard, { borderColor: colors.tint + '55' }]}>
          <ThemedView style={[styles.finalHeroIconWrap, { backgroundColor: colors.tint }]}>
            <Ionicons name="checkmark-done" size={40} color="#FFFFFF" />
          </ThemedView>
          <ThemedText style={[styles.finalHeroTitle, { color: colors.text }]}>
            {t('games.wrongAnswers.allRoundsDone')}
          </ThemedText>
          <ThemedText style={[styles.finalHeroSubtitle, { color: colors.text }]}>
            {t('games.wrongAnswers.standings')}
          </ThemedText>
        </ThemedView>
        {winner && (
          <ThemedView
            style={[
              styles.finalWinnerCard,
              { backgroundColor: cardBg, borderColor: '#F59E0B', borderWidth: 2 },
            ]}
          >
            <ThemedView style={styles.finalWinnerCrown}>
              <Ionicons name="trophy" size={28} color="#F59E0B" />
            </ThemedView>
            <ThemedText style={[styles.finalWinnerLabel, { color: colors.text }]}>
              {t('games.wrongAnswers.winner')}
            </ThemedText>
            <ThemedView style={[styles.finalWinnerAvatar, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.finalWinnerInitial}>
                {winner.player.name}
              </ThemedText>
            </ThemedView>
            <ThemedText style={styles.finalWinnerPoints}>
              {winner.score} {t('games.wrongAnswers.pts')}
            </ThemedText>
          </ThemedView>
        )}
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          {sorted.map(({ player, score }) => (
            <View key={player.id} style={styles.finalRowCard}>
              <ThemedText style={[styles.finalRowName, { color: colors.text }]}>
                {player.name}
              </ThemedText>
              <ThemedText style={[styles.finalRowPoints, { color: colors.text }]}>
                {score} {t('games.wrongAnswers.pts')}
              </ThemedText>
            </View>
          ))}
        </ThemedView>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.tint }]}
          onPress={() => router.back()}
        >
          <Ionicons name="game-controller" size={22} color="#FFFFFF" />
          <ThemedText style={styles.primaryButtonText}>
            {t('games.wrongAnswers.backToGames')}
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {step === 'rules' && renderRules()}
      {step === 'players' && renderPlayers()}
      {step === 'game' && phase === 'askerIntro' && renderAskerIntro()}
      {step === 'game' && phase === 'asking' && renderGameAsking()}
      {step === 'game' && phase === 'roundSummary' && renderScoreboard()}
      {step === 'game' && phase === 'final' && renderFinal()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  content: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: { padding: 8 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  placeholder: { width: 40 },
  rulesCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  rulesCardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  rulesText: { fontSize: 15, lineHeight: 22, opacity: 0.95 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 32,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  askerIntroCard: {
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'center',
  },
  askerIntroLabel: { fontSize: 16, fontWeight: '600', marginBottom: 16, opacity: 0.9 },
  askerIntroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  askerIntroInitial: { color: '#FFFFFF', fontSize: 32, fontWeight: '700' },
  askerIntroName: { fontSize: 24, fontWeight: '700', marginBottom: 24 },
  askerIntroButton: { alignSelf: 'stretch' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  roundsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  roundChip: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  roundChipText: { fontSize: 16, fontWeight: '600' },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  timerText: { fontSize: 16, fontWeight: '600' },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 8 },
  playerList: { gap: 8 },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  playerName: { fontSize: 16, fontWeight: '500' },
  subtitle: { fontSize: 15, marginBottom: 20, opacity: 0.8 },
  sectionLabel: { fontSize: 14, fontWeight: '600', opacity: 0.8, marginBottom: 4 },
  playerBadgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
  playerTitle: { fontSize: 18, fontWeight: '600' },
  playerSubtitle: { fontSize: 16, marginTop: 4 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  questionCard: {
    marginTop: 12,
    paddingVertical: 24,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionText: { fontSize: 22, fontWeight: '700', textAlign: 'center', lineHeight: 30 },
  answerButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  answerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  answerButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  scoreRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialSmall: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  scoreName: { fontSize: 16, fontWeight: '500' },
  scoreValue: { fontSize: 16, fontWeight: '600' },
  finalHeroCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  finalHeroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  finalHeroTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  finalHeroSubtitle: { fontSize: 15, opacity: 0.9 },
  finalWinnerCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  finalWinnerCrown: { marginBottom: 8 },
  finalWinnerLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, opacity: 0.9 },
  finalWinnerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  finalWinnerInitial: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  finalWinnerName: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  finalWinnerPoints: { fontSize: 16, fontWeight: '600', color: '#F59E0B' },
  finalRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    gap: 10,
  },
  finalRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    color: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E7EB',
  },
  finalRankNumber: { fontSize: 14, fontWeight: '700' },
  finalRowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalRowInitial: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  finalRowName: { flex: 1, fontSize: 16, fontWeight: '500' },
  finalRowPoints: { fontSize: 15, fontWeight: '600' },
});

