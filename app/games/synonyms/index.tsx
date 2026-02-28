import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/contexts/I18nContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { fetchCharadesWords } from '@/services/charadesWordsService';
import { Ionicons } from '@expo/vector-icons';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Step = 'rules' | 'players' | 'teamsChoice' | 'teams' | 'roundsAndTime' | 'game';
type TeamMode = 'random' | 'custom';
type GamePhase = 'rotate' | 'countdown' | 'playing' | 'feedbackGreen' | 'feedbackRed' | 'turnResults' | 'gameOver';

interface Player {
  id: string;
  name: string;
}

interface WordResult {
  word: string;
  guessed: boolean;
}

const FALLBACK_WORDS = [
  'Happy', 'Fast', 'Big', 'Cold', 'Bright', 'Quiet', 'Strong', 'Soft',
  'Clean', 'Brave', 'Calm', 'Kind', 'Smart', 'Funny', 'Loud', 'Warm',
];

const ROUNDS_MIN = 1;
const ROUNDS_MAX = 10;
const TIME_PRESETS = [15, 30, 45, 60];
const TILT_THRESHOLD = 0.68;
const TILT_COOLDOWN_MS = 1200;
const FEEDBACK_MS = 1200;

export const options = { headerShown: false };

export default function SynonymsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [currentStep, setCurrentStep] = useState<Step>('rules');
  const [words, setWords] = useState<string[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [playInTeams, setPlayInTeams] = useState<boolean | null>(null);
  const [teamMode, setTeamMode] = useState<TeamMode>('random');
  const [teamNames, setTeamNames] = useState<[string, string]>(['Team 1', 'Team 2']);
  const [playerTeam, setPlayerTeam] = useState<Record<string, 0 | 1>>({});
  const [randomSplit, setRandomSplit] = useState<[string[], string[]]>([[], []]);
  const [teamScores, setTeamScores] = useState<[number, number]>([0, 0]);
  const [playerScores, setPlayerScores] = useState<Record<string, number>>({});
  const [numRounds, setNumRounds] = useState(3);
  const [roundTime, setRoundTime] = useState(30);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [turnWords, setTurnWords] = useState<string[]>([]);
  const [wordIndex, setWordIndex] = useState(0);
  const wordPoolRef = useRef<{ list: string[]; index: number }>({ list: [], index: 0 });
  const [gamePhase, setGamePhase] = useState<GamePhase>('rotate');
  const [countdown, setCountdown] = useState(3);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [turnResults, setTurnResults] = useState<WordResult[]>([]);
  const [isLandscape, setIsLandscape] = useState(false);
  const tiltCooldownRef = useRef(0);
  const accelRef = useRef({ x: 0, y: 0, z: 0 });
  const turnWordsRef = useRef<string[]>([]);
  const wordIndexRef = useRef(0);
  turnWordsRef.current = turnWords;
  wordIndexRef.current = wordIndex;

  useEffect(() => {
    let cancelled = false;
    fetchCharadesWords(150, locale).then((list) => {
      if (!cancelled && list.length > 0) setWords(list);
    });
    return () => { cancelled = true; };
  }, [locale]);

  useEffect(() => {
    if (currentStep !== 'teams') return;
    if (teamMode === 'random' && players.length >= 2) {
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      const mid = Math.ceil(shuffled.length / 2);
      setRandomSplit([shuffled.slice(0, mid).map((p) => p.id), shuffled.slice(mid).map((p) => p.id)]);
    }
  }, [currentStep, teamMode, players.length]);

  const landscapeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (currentStep === 'game' && gamePhase === 'rotate') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    }
  }, [currentStep, gamePhase]);

  useEffect(() => {
    if (currentStep === 'game' && gamePhase === 'gameOver') {
      ScreenOrientation.unlockAsync().catch(() => {});
    }
  }, [currentStep, gamePhase]);

  useEffect(() => {
    if (currentStep !== 'game' || (gamePhase !== 'rotate' && gamePhase !== 'playing' && gamePhase !== 'countdown')) return;
    Accelerometer.setUpdateInterval(200);
    const sub = Accelerometer.addListener((data) => {
      const { x, y, z } = data;
      const ax = Math.abs(x);
      const ay = Math.abs(y);
      const az = Math.abs(z);
      const horizontalDominant = (ax > 0.6 || ay > 0.6) && az < 0.9;
      if (horizontalDominant) {
        if (landscapeDebounceRef.current) {
          clearTimeout(landscapeDebounceRef.current);
          landscapeDebounceRef.current = null;
        }
        setIsLandscape(true);
      } else {
        if (!landscapeDebounceRef.current) {
          landscapeDebounceRef.current = setTimeout(() => {
            landscapeDebounceRef.current = null;
            setIsLandscape(false);
          }, 600);
        }
      }
    });
    return () => {
      if (landscapeDebounceRef.current) clearTimeout(landscapeDebounceRef.current);
      sub.remove();
    };
  }, [currentStep, gamePhase]);

  const isPlayingLandscapeRef = useRef(true);
  isPlayingLandscapeRef.current = isLandscape;
  const feedbackRedReasonRef = useRef<'pass' | 'timeUp'>('timeUp');
  useEffect(() => {
    if (currentStep !== 'game' || gamePhase !== 'playing') return;
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener((data) => {
      if (!isPlayingLandscapeRef.current) return;
      accelRef.current = data;
      const { z } = data;
      if (Date.now() <= tiltCooldownRef.current) return;
      if (z > TILT_THRESHOLD) {
        tiltCooldownRef.current = Date.now() + TILT_COOLDOWN_MS;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const words = turnWordsRef.current;
        const idx = wordIndexRef.current;
        if (words[idx]) setGamePhase('feedbackGreen');
      } else if (z < -TILT_THRESHOLD) {
        tiltCooldownRef.current = Date.now() + TILT_COOLDOWN_MS;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const words = turnWordsRef.current;
        const idx = wordIndexRef.current;
        if (words[idx]) {
          feedbackRedReasonRef.current = 'pass';
          setGamePhase('feedbackRed');
        }
      }
    });
    return () => sub.remove();
  }, [currentStep, gamePhase]);

  useEffect(() => {
    if (gamePhase !== 'feedbackGreen') return;
    const id = setTimeout(() => {
      const words = turnWordsRef.current;
      const idx = wordIndexRef.current;
      const word = words[idx];
      if (word) {
        setTurnResults((prev) => (prev.some((r) => r.word === word) ? prev : [...prev, { word, guessed: true }]));
        const pool = wordPoolRef.current;
        const nextWord = pool.list[pool.index];
        if (nextWord) {
          pool.index += 1;
          setTurnWords((prev) => [...prev, nextWord]);
          setWordIndex((i) => i + 1);
        }
      }
      setGamePhase('playing');
    }, FEEDBACK_MS);
    return () => clearTimeout(id);
  }, [gamePhase]);

  const didFinishTurnRef = useRef(false);
  useEffect(() => {
    if (gamePhase !== 'playing' || wordIndex < turnWords.length || turnWords.length === 0) return;
    if (didFinishTurnRef.current) return;
    didFinishTurnRef.current = true;
    const fullResults: WordResult[] = turnWords.map((w) => ({
      word: w,
      guessed: turnResults.some((r) => r.word === w && r.guessed),
    }));
    setTurnResults(fullResults);
    const points = fullResults.filter((r) => r.guessed).length;
    const player = players[currentPlayerIndex];
    if (player) {
      setPlayerScores((s) => ({ ...s, [player.id]: (s[player.id] ?? 0) + points }));
      if (playInTeams && (playerTeam[player.id] === 0 || playerTeam[player.id] === 1)) {
        const ti = playerTeam[player.id];
        setTeamScores((s) => {
          const next: [number, number] = [...s];
          next[ti] = next[ti] + points;
          return next;
        });
      }
    }
    setGamePhase('turnResults');
  }, [gamePhase, wordIndex, turnWords, turnResults, players, currentPlayerIndex, playInTeams, playerTeam]);

  useEffect(() => {
    if (gamePhase === 'countdown' || gamePhase === 'playing') didFinishTurnRef.current = false;
  }, [gamePhase]);

  useEffect(() => {
    if (gamePhase !== 'playing' || timerRemaining > 0) return;
    feedbackRedReasonRef.current = 'timeUp';
    setTurnResults((prev) => {
      const next = [...prev];
      for (let i = wordIndex; i < turnWords.length; i++) {
        const w = turnWords[i];
        if (!next.some((r) => r.word === w)) next.push({ word: w, guessed: false });
      }
      return next;
    });
    setWordIndex(turnWords.length);
    setGamePhase('feedbackRed');
  }, [gamePhase, timerRemaining, wordIndex, turnWords]);

  useEffect(() => {
    if (gamePhase !== 'feedbackRed') return;
    const id = setTimeout(() => {
      if (feedbackRedReasonRef.current === 'pass') {
        const words = turnWordsRef.current;
        const idx = wordIndexRef.current;
        const word = words[idx];
        if (word) {
          setTurnResults((prev) => (prev.some((r) => r.word === word) ? prev : [...prev, { word, guessed: false }]));
          const pool = wordPoolRef.current;
          const nextWord = pool.list[pool.index];
          if (nextWord) {
            pool.index += 1;
            setTurnWords((prev) => [...prev, nextWord]);
            setWordIndex((i) => i + 1);
          }
        }
        setGamePhase('playing');
      } else {
        const fullResults: WordResult[] = turnWords.map((w) => ({
          word: w,
          guessed: turnResults.some((r) => r.word === w && r.guessed),
        }));
        setTurnResults(fullResults);
        const points = fullResults.filter((r) => r.guessed).length;
        const player = players[currentPlayerIndex];
        if (player) {
          setPlayerScores((s) => ({ ...s, [player.id]: (s[player.id] ?? 0) + points }));
          if (playInTeams && (playerTeam[player.id] === 0 || playerTeam[player.id] === 1)) {
            const ti = playerTeam[player.id];
            setTeamScores((s) => {
              const next: [number, number] = [...s];
              next[ti] = next[ti] + points;
              return next;
            });
          }
        }
        setGamePhase('turnResults');
      }
    }, FEEDBACK_MS);
    return () => clearTimeout(id);
  }, [gamePhase, wordIndex, turnWords, turnResults, players, currentPlayerIndex, playInTeams, playerTeam]);

  useEffect(() => {
    if (gamePhase !== 'playing' || timerRemaining <= 0 || !isLandscape) return;
    const id = setInterval(() => setTimerRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [gamePhase, timerRemaining, isLandscape]);

  const regenerateRandomTeams = () => {
    if (players.length < 2) return;
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const mid = Math.ceil(shuffled.length / 2);
    setRandomSplit([shuffled.slice(0, mid).map((p) => p.id), shuffled.slice(mid).map((p) => p.id)]);
  };

  const team0Players = teamMode === 'random' ? players.filter((p) => randomSplit[0].includes(p.id)) : players.filter((p) => playerTeam[p.id] === 0);
  const team1Players = teamMode === 'random' ? players.filter((p) => randomSplit[1].includes(p.id)) : players.filter((p) => playerTeam[p.id] === 1);

  const addPlayer = () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    if (players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert(t('games.synonyms.playerExists'), t('games.synonyms.playerExistsMessage'));
      return;
    }
    setPlayers([...players, { id: Date.now().toString(), name: trimmed }]);
    setNewPlayerName('');
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id));
    setPlayerTeam((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const setTeamForPlayer = (playerId: string, team: 0 | 1) => {
    setPlayerTeam((prev) => ({ ...prev, [playerId]: team }));
  };

  const countdownRef = useRef(3);
  const startTurn = useCallback(() => {
    didFinishTurnRef.current = false;
    const pool = words.length > 0 ? words : FALLBACK_WORDS;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const first = shuffled[0] ?? FALLBACK_WORDS[0];
    wordPoolRef.current = { list: shuffled, index: 1 };
    setTurnWords([first]);
    setWordIndex(0);
    setTurnResults([]);
    setTimerRemaining(roundTime);
    countdownRef.current = 3;
    setCountdown(3);
    setGamePhase('countdown');
  }, [words, roundTime]);

  useEffect(() => {
    if (gamePhase !== 'countdown') return;
    let intervalId: ReturnType<typeof setInterval>;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        countdownRef.current -= 1;
        const next = countdownRef.current;
        setCountdown(next);
        if (next <= 0 && isLandscape) setGamePhase('playing');
      }, 1000);
    }, 80);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [gamePhase, isLandscape]);

  useEffect(() => {
    if (gamePhase === 'countdown' && countdown <= 0 && isLandscape) setGamePhase('playing');
  }, [gamePhase, countdown, isLandscape]);

  const handleBackPress = () => {
    if (currentStep === 'rules') {
      router.back();
      return;
    }
    if (currentStep === 'players') setCurrentStep('rules');
    else if (currentStep === 'teamsChoice') setCurrentStep('players');
    else if (currentStep === 'teams') setCurrentStep('teamsChoice');
    else if (currentStep === 'roundsAndTime') setCurrentStep(playInTeams ? 'teams' : 'teamsChoice');
    else if (currentStep === 'game') {
      Alert.alert(t('games.charades.exitGame'), t('games.charades.exitConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('games.charades.exitGameButton'), style: 'destructive', onPress: () => { ScreenOrientation.unlockAsync().catch(() => {}); setCurrentStep('rules'); } },
      ]);
    }
  };

  const goFromTeamsChoice = () => {
    if (playInTeams === true) setCurrentStep('teams');
    else {
      setCurrentStep('roundsAndTime');
    }
  };

  const startGame = () => {
    if (players.length < 2) {
      Alert.alert(t('games.synonyms.notEnoughPlayers'), t('games.synonyms.addAtLeast2'));
      return;
    }
    if (playInTeams) {
      if (teamMode === 'custom') {
        const assigned = players.filter((p) => playerTeam[p.id] === 0 || playerTeam[p.id] === 1).length;
        if (assigned < players.length) {
          Alert.alert(t('common.error'), t('games.synonyms.assignPlayers'));
          return;
        }
        if (team0Players.length === 0 || team1Players.length === 0) {
          Alert.alert(t('common.error'), t('games.synonyms.bothTeamsRequired'));
          return;
        }
      } else {
        const next: Record<string, 0 | 1> = {};
        randomSplit[0].forEach((id) => { next[id] = 0; });
        randomSplit[1].forEach((id) => { next[id] = 1; });
        setPlayerTeam(next);
      }
    }
    setCurrentRound(1);
    setCurrentPlayerIndex(0);
    setTeamScores([0, 0]);
    setPlayerScores({});
    setCurrentStep('game');
    setGamePhase('rotate');
  };

  const confirmStartFromRounds = () => {
    setCurrentRound(1);
    setCurrentPlayerIndex(0);
    setTeamScores([0, 0]);
    setPlayerScores({});
    setCurrentStep('game');
    setGamePhase('rotate');
  };

  const onTurnResultsNext = () => {
    if (currentPlayerIndex + 1 < players.length) {
      setCurrentPlayerIndex((i) => i + 1);
      startTurn();
    } else if (currentRound < numRounds) {
      setCurrentRound((r) => r + 1);
      setCurrentPlayerIndex(0);
      startTurn();
    } else {
      setGamePhase('gameOver');
    }
  };

  const cardBg = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
  const border = colorScheme === 'dark' ? '#374151' : '#E5E7EB';

  const renderRules = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedView style={styles.headerContent}>
          <Ionicons name="document-text" size={24} color={colors.tint} />
          <ThemedText style={styles.headerTitle}>{t('games.synonyms.rulesTitle')}</ThemedText>
        </ThemedView>
        <View style={styles.placeholder} />
      </ThemedView>
      <ThemedView style={[styles.rulesCard, { backgroundColor: cardBg, borderColor: border }]}>
        <ThemedText style={[styles.rulesCardTitle, { color: colors.text }]}>{t('games.synonyms.rulesHowToPlay')}</ThemedText>
        <ThemedText style={[styles.rulesText, { color: colors.text }]}>{t('games.synonyms.rulesIntro')}</ThemedText>
        <ThemedView style={styles.rulesSection}>
          <ThemedText style={[styles.rulesSectionTitle, { color: colors.text }]}>{t('games.synonyms.rulesDescribeTitle')}</ThemedText>
          <ThemedText style={[styles.rulesText, { color: colors.text }]}>{t('games.synonyms.rulesDescribe')}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.rulesSection}>
          <ThemedText style={[styles.rulesSectionTitle, { color: colors.text }]}>{t('games.synonyms.rulesCharadesTitle')}</ThemedText>
          <ThemedText style={[styles.rulesText, { color: colors.text }]}>{t('games.synonyms.rulesCharades')}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.rulesSection}>
          <ThemedText style={[styles.rulesSectionTitle, { color: colors.text }]}>{t('games.synonyms.rulesTurnTitle')}</ThemedText>
          <ThemedText style={[styles.rulesText, { color: colors.text }]}>{t('games.synonyms.rulesTurn')}</ThemedText>
        </ThemedView>
      </ThemedView>
      <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.tint }]} onPress={() => setCurrentStep('players')}>
        <ThemedText style={styles.primaryButtonText}>{t('common.next')}</ThemedText>
        <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );

  const renderPlayers = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedView style={styles.headerContent}>
          <Ionicons name="people" size={24} color={colors.tint} />
          <ThemedText style={styles.headerTitle}>{t('games.synonyms.addPlayers')}</ThemedText>
        </ThemedView>
        <View style={styles.placeholder} />
      </ThemedView>
      <ThemedText style={[styles.subtitle, { color: colors.text }]}>{t('games.synonyms.playersCount', { count: players.length })}</ThemedText>
      <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6', color: colors.text }]}
            placeholder={t('games.synonyms.enterPlayerName')}
            placeholderTextColor="#9CA3AF"
            value={newPlayerName}
            onChangeText={setNewPlayerName}
            onSubmitEditing={addPlayer}
            blurOnSubmit={false}
          />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={addPlayer}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <ThemedText style={[styles.hint, { color: colors.text }]}>{t('games.synonyms.addAtLeast2')}</ThemedText>
        <View style={styles.playerList}>
          {players.map((p) => (
            <View key={p.id} style={[styles.playerRow, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6' }]}>
              <ThemedText style={[styles.playerName, { color: colors.text }]}>{p.name}</ThemedText>
              <TouchableOpacity onPress={() => removePlayer(p.id)} hitSlop={12}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ThemedView>
      <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.tint }]} onPress={() => setCurrentStep('teamsChoice')} disabled={players.length < 2}>
        <ThemedText style={styles.primaryButtonText}>{t('common.next')}</ThemedText>
        <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );

  const renderTeamsChoice = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedView style={styles.headerContent}>
          <Ionicons name="people" size={24} color={colors.tint} />
          <ThemedText style={styles.headerTitle}>{t('games.synonyms.playInTeams')}</ThemedText>
        </ThemedView>
        <View style={styles.placeholder} />
      </ThemedView>
      <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
        <TouchableOpacity style={[styles.teamModeRow, { backgroundColor: playInTeams === true ? colors.tint + '22' : (colorScheme === 'dark' ? '#374151' : '#F3F4F6'), borderColor: playInTeams === true ? colors.tint : border }]} onPress={() => setPlayInTeams(true)}>
          <Ionicons name="people" size={24} color={playInTeams === true ? colors.tint : colors.text} />
          <ThemedText style={[styles.teamModeTitle, { color: colors.text }]}>{t('games.synonyms.yes')}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.teamModeRow, { backgroundColor: playInTeams === false ? colors.tint + '22' : (colorScheme === 'dark' ? '#374151' : '#F3F4F6'), borderColor: playInTeams === false ? colors.tint : border }]} onPress={() => setPlayInTeams(false)}>
          <Ionicons name="person" size={24} color={playInTeams === false ? colors.tint : colors.text} />
          <ThemedText style={[styles.teamModeTitle, { color: colors.text }]}>{t('games.synonyms.no')}</ThemedText>
        </TouchableOpacity>
      </ThemedView>
      <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.tint }]} onPress={goFromTeamsChoice} disabled={playInTeams === null}>
        <ThemedText style={styles.primaryButtonText}>{t('common.next')}</ThemedText>
        <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );

  const renderTeams = () => {
    const isRandom = teamMode === 'random';
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <Ionicons name="people" size={24} color={colors.tint} />
            <ThemedText style={styles.headerTitle}>{t('games.synonyms.teamSetup')}</ThemedText>
          </ThemedView>
          <View style={styles.placeholder} />
        </ThemedView>
        <ThemedText style={[styles.subtitle, { color: colors.text }]}>{t('games.synonyms.teamSetupSubtitle')}</ThemedText>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <TouchableOpacity style={[styles.teamModeRow, { backgroundColor: isRandom ? colors.tint + '22' : (colorScheme === 'dark' ? '#374151' : '#F3F4F6'), borderColor: isRandom ? colors.tint : border }]} onPress={() => setTeamMode('random')}>
            <Ionicons name="shuffle" size={24} color={isRandom ? colors.tint : colors.text} />
            <ThemedText style={[styles.teamModeTitle, { color: colors.text }]}>{t('games.synonyms.randomTeams')}</ThemedText>
            <ThemedText style={[styles.teamModeDesc, { color: colors.text }]}>{t('games.synonyms.randomTeamsDesc')}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.teamModeRow, { backgroundColor: !isRandom ? colors.tint + '22' : (colorScheme === 'dark' ? '#374151' : '#F3F4F6'), borderColor: !isRandom ? colors.tint : border }]} onPress={() => setTeamMode('custom')}>
            <Ionicons name="create" size={24} color={!isRandom ? colors.tint : colors.text} />
            <ThemedText style={[styles.teamModeTitle, { color: colors.text }]}>{t('games.synonyms.customTeams')}</ThemedText>
            <ThemedText style={[styles.teamModeDesc, { color: colors.text }]}>{t('games.synonyms.customTeamsDesc')}</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>{t('games.synonyms.teamName')}</ThemedText>
          <View style={styles.teamNameRow}>
            <TextInput style={[styles.teamNameInput, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6', color: colors.text }]} value={teamNames[0]} onChangeText={(v) => setTeamNames([v, teamNames[1]])} placeholder={t('games.synonyms.teamOne')} />
            <TextInput style={[styles.teamNameInput, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6', color: colors.text }]} value={teamNames[1]} onChangeText={(v) => setTeamNames([teamNames[0], v])} placeholder={t('games.synonyms.teamTwo')} />
          </View>
        </ThemedView>
        {teamMode === 'custom' && (
          <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>{t('games.synonyms.assignPlayers')}</ThemedText>
            {players.map((p) => (
              <View key={p.id} style={styles.teamAssignRow}>
                <ThemedText style={[styles.playerName, { color: colors.text, flex: 1 }]}>{p.name}</ThemedText>
                <TouchableOpacity style={[styles.teamChip, { backgroundColor: (playerTeam[p.id] ?? -1) === 0 ? colors.tint : (colorScheme === 'dark' ? '#374151' : '#F3F4F6') }]} onPress={() => setTeamForPlayer(p.id, 0)}>
                  <ThemedText style={[styles.teamChipText, { color: (playerTeam[p.id] ?? -1) === 0 ? '#FFF' : colors.text }]}>{teamNames[0]}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.teamChip, { backgroundColor: (playerTeam[p.id] ?? -1) === 1 ? colors.tint : (colorScheme === 'dark' ? '#374151' : '#F3F4F6') }]} onPress={() => setTeamForPlayer(p.id, 1)}>
                  <ThemedText style={[styles.teamChipText, { color: (playerTeam[p.id] ?? -1) === 1 ? '#FFF' : colors.text }]}>{teamNames[1]}</ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </ThemedView>
        )}
        {teamMode === 'random' && (
          <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <TouchableOpacity style={[styles.regenerateButton, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6' }]} onPress={regenerateRandomTeams}>
              <Ionicons name="shuffle" size={20} color={colors.tint} />
              <ThemedText style={[styles.regenerateButtonText, { color: colors.tint }]}>{t('games.synonyms.regenerateTeams')}</ThemedText>
            </TouchableOpacity>
            <ThemedText style={[styles.sectionLabel, { color: colors.text, marginTop: 16 }]}>{teamNames[0]}</ThemedText>
            {team0Players.map((p) => (
              <ThemedText key={p.id} style={[styles.roleLabel, { color: colors.text }]}>{p.name}</ThemedText>
            ))}
            <ThemedText style={[styles.sectionLabel, { color: colors.text, marginTop: 12 }]}>{teamNames[1]}</ThemedText>
            {team1Players.map((p) => (
              <ThemedText key={p.id} style={[styles.roleLabel, { color: colors.text }]}>{p.name}</ThemedText>
            ))}
          </ThemedView>
        )}
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.tint }]} onPress={() => setCurrentStep('roundsAndTime')}>
          <ThemedText style={styles.primaryButtonText}>{t('common.next')}</ThemedText>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderRoundsAndTime = () => {
    const stepperBg = colorScheme === 'dark' ? '#374151' : '#F3F4F6';
    const stepperBorder = colorScheme === 'dark' ? '#4B5563' : '#E5E7EB';
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <Ionicons name="settings" size={24} color={colors.tint} />
            <ThemedText style={styles.headerTitle}>{t('games.synonyms.roundsAndTime')}</ThemedText>
          </ThemedView>
          <View style={styles.placeholder} />
        </ThemedView>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>{t('games.synonyms.rounds')}</ThemedText>
          <ThemedText style={[styles.hint, { color: colors.text }]}>{t('games.synonyms.roundsLabel')}</ThemedText>
          <View style={styles.timerCustomRow}>
            <TouchableOpacity style={[styles.timerNumBtn, { backgroundColor: stepperBg }]} onPress={() => setNumRounds((n) => Math.max(ROUNDS_MIN, n - 1))} disabled={numRounds <= ROUNDS_MIN}>
              <Ionicons name="remove" size={24} color={colors.text} />
            </TouchableOpacity>
            <ThemedText style={[styles.timerText, { color: colors.text, fontSize: 24 }]}>{numRounds}</ThemedText>
            <TouchableOpacity style={[styles.timerNumBtn, { backgroundColor: stepperBg }]} onPress={() => setNumRounds((n) => Math.min(ROUNDS_MAX, n + 1))} disabled={numRounds >= ROUNDS_MAX}>
              <Ionicons name="add" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </ThemedView>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>{t('games.synonyms.roundTime')}</ThemedText>
          <ThemedText style={[styles.hint, { color: colors.text }]}>{t('games.synonyms.timeLabel')}</ThemedText>
          <View style={styles.timerChipsRow}>
            {TIME_PRESETS.map((sec) => (
              <TouchableOpacity key={sec} style={[styles.timerChip, { backgroundColor: roundTime === sec ? colors.tint : stepperBg }]} onPress={() => setRoundTime(sec)}>
                <ThemedText style={[styles.timerChipText, { color: roundTime === sec ? '#FFFFFF' : colors.text }]}>{sec}s</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.tint }]} onPress={confirmStartFromRounds}>
          <ThemedText style={styles.primaryButtonText}>{t('games.synonyms.startGame')}</ThemedText>
          <Ionicons name="play" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderGame = () => {
    if (gamePhase === 'rotate') {
      const onStart = () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {}); startTurn(); };
      const nextPlayerName = players[currentPlayerIndex]?.name ?? '';
      return (
        <ThemedView style={styles.gameContainer}>
          <ThemedView style={styles.rotateBox}>
            <ThemedText style={[styles.rotatePlayerLabel, { color: colors.text }]}>{t('games.synonyms.nextUp')}: {nextPlayerName}</ThemedText>
            <Ionicons name="phone-portrait-outline" size={64} color={colors.tint} />
            <ThemedText style={[styles.rotateText, { color: colors.text }]}>{t('games.synonyms.rotatePhone')}</ThemedText>
            {isLandscape ? (
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.tint, marginTop: 24 }]} onPress={onStart}>
                <ThemedText style={styles.primaryButtonText}>{t('common.next')}</ThemedText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.continueLink} onPress={onStart}>
                <ThemedText style={[styles.continueLinkText, { color: colors.tint }]}>{t('common.continue')}</ThemedText>
              </TouchableOpacity>
            )}
          </ThemedView>
        </ThemedView>
      );
    }
    if (gamePhase === 'countdown') {
      const display = countdown > 0 ? String(countdown) : t('games.synonyms.getReady');
      return (
        <View style={[styles.gameContainer, { backgroundColor: colorScheme === 'dark' ? colors.background : '#F9FAFB' }]}>
          <View style={[styles.countdownCircle, { backgroundColor: colors.tint + '25', borderColor: colors.tint }]}>
            <Text style={[styles.countdownText, { color: colors.tint }]}>{display}</Text>
          </View>
        </View>
      );
    }
    if (gamePhase === 'feedbackGreen') {
      return <View style={[styles.feedbackScreenFull, { backgroundColor: '#10B981' }]} />;
    }
    if (gamePhase === 'feedbackRed') {
      return <View style={[styles.feedbackScreenFull, { backgroundColor: '#EF4444' }]} />;
    }
    if (gamePhase === 'playing') {
      const word = turnWords[wordIndex];
      const timerColor = timerRemaining <= 10 ? '#EF4444' : '#10B981';
      return (
        <ThemedView style={styles.gameContainer}>
          {!isLandscape && (
            <View style={[styles.landscapeOverlay, { backgroundColor: colors.background }]}>
              <Ionicons name="phone-portrait-outline" size={48} color={colors.tint} />
              <ThemedText style={[styles.rotateText, { color: colors.text, marginTop: 16 }]}>{t('games.synonyms.rotatePhone')}</ThemedText>
            </View>
          )}
          <ThemedView style={styles.header}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.tint} />
            </TouchableOpacity>
            <ThemedText style={[styles.timerBadge, { color: timerColor }]}>{t('games.synonyms.remainingSeconds', { s: timerRemaining })}</ThemedText>
            <View style={styles.placeholder} />
          </ThemedView>
          <ThemedView style={[styles.wordCard, { backgroundColor: cardBg, borderColor: border, borderWidth: 1, borderRadius: 16 }]}>
            <Text style={[styles.wordTextLarge, { color: colors.text }]} numberOfLines={2} adjustsFontSizeToFit>{word ?? '—'}</Text>
          </ThemedView>
          <ThemedText style={[styles.hint, { color: colors.text }]}>{t('games.synonyms.tiltToGuess')}</ThemedText>
        </ThemedView>
      );
    }
    if (gamePhase === 'turnResults') {
      const allResults = turnWords.map((w) => ({ word: w, guessed: turnResults.some((r) => r.word === w && r.guessed) }));
      const playerName = players[currentPlayerIndex]?.name ?? '';
      const guessedCount = allResults.filter((r) => r.guessed).length;
      return (
        <ScrollView style={styles.resultsContent} contentContainerStyle={styles.resultsContentContainer} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.resultsHeader}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.tint} />
            </TouchableOpacity>
            <ThemedText style={[styles.resultsTitle, { color: colors.text }]}>{t('games.synonyms.roundResults')}</ThemedText>
            <View style={styles.placeholder} />
          </ThemedView>
          <ThemedText style={[styles.resultsPlayerLabel, { color: colors.text }]}>{playerName}</ThemedText>
          <ThemedText style={[styles.resultsScoreLabel, { color: colors.text }]}>{guessedCount} {t('games.synonyms.guessed')}</ThemedText>
          <View style={styles.resultsWordGrid}>
            {allResults.map((r) => (
              <View key={r.word} style={[styles.resultsWordChip, { backgroundColor: r.guessed ? '#10B981' : '#EF4444' }]}>
                <Ionicons name={r.guessed ? 'checkmark-circle' : 'close-circle'} size={22} color="#FFFFFF" />
                <Text style={styles.resultsWordText} numberOfLines={1}>{r.word}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={[styles.primaryButton, styles.resultsNextBtn, { backgroundColor: colors.tint }]} onPress={onTurnResultsNext}>
            <ThemedText style={styles.primaryButtonText}>
              {currentPlayerIndex + 1 < players.length ? t('games.synonyms.nextPlayer') : currentRound < numRounds ? t('games.synonyms.nextRound') : t('games.synonyms.finalScores')}
            </ThemedText>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </ScrollView>
      );
    }
    if (gamePhase === 'gameOver') {
      return (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.header}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.tint} />
            </TouchableOpacity>
            <ThemedView style={styles.headerContent}>
              <Ionicons name="trophy" size={24} color={colors.tint} />
              <ThemedText style={styles.headerTitle}>{playInTeams ? t('games.synonyms.gameOver') : t('games.synonyms.gameComplete')}</ThemedText>
            </ThemedView>
            <View style={styles.placeholder} />
          </ThemedView>
          {playInTeams && <ThemedText style={[styles.subtitle, { color: colors.text }]}>{t('games.synonyms.finalScores')}</ThemedText>}
          {playInTeams ? (
            <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <View style={styles.finalTeamBlock}>
                <View style={styles.scoreRow}>
                  <ThemedText style={[styles.teamScoreName, { color: colors.text }]}>{teamNames[0]}</ThemedText>
                  <ThemedText style={[styles.teamScoreValue, { color: colors.text }]}>{team0Players.reduce((s, p) => s + (playerScores[p.id] ?? 0), 0)} pts</ThemedText>
                </View>
                {team0Players.map((p) => (
                  <View key={p.id} style={styles.finalPlayerRow}>
                    <ThemedText style={[styles.finalPlayerName, { color: colors.text }]}>{p.name}</ThemedText>
                    <ThemedText style={[styles.finalPlayerPts, { color: colors.text }]}>{playerScores[p.id] ?? 0} pts</ThemedText>
                  </View>
                ))}
              </View>
              <View style={[styles.finalTeamBlock, styles.finalTeamBlockBorder]}>
                <View style={styles.scoreRow}>
                  <ThemedText style={[styles.teamScoreName, { color: colors.text }]}>{teamNames[1]}</ThemedText>
                  <ThemedText style={[styles.teamScoreValue, { color: colors.text }]}>{team1Players.reduce((s, p) => s + (playerScores[p.id] ?? 0), 0)} pts</ThemedText>
                </View>
                {team1Players.map((p) => (
                  <View key={p.id} style={styles.finalPlayerRow}>
                    <ThemedText style={[styles.finalPlayerName, { color: colors.text }]}>{p.name}</ThemedText>
                    <ThemedText style={[styles.finalPlayerPts, { color: colors.text }]}>{playerScores[p.id] ?? 0} pts</ThemedText>
                  </View>
                ))}
              </View>
            </ThemedView>
          ) : (
            <>
              <ThemedView style={[styles.finalHeroCard, { backgroundColor: colors.tint + '22', borderColor: colors.tint + '50' }]}>
                <ThemedView style={[styles.finalHeroIconWrap, { backgroundColor: colors.tint }]}>
                  <Ionicons name="checkmark-done" size={40} color="#FFFFFF" />
                </ThemedView>
                <ThemedText style={[styles.finalHeroTitle, { color: colors.text }]}>{t('games.synonyms.allRoundsDone', { count: numRounds })}</ThemedText>
                <ThemedText style={[styles.finalHeroSubtitle, { color: colors.text }]}>{t('games.synonyms.finalStandings')}</ThemedText>
              </ThemedView>
              {(() => {
                const ranked = [...players].sort((a, b) => (playerScores[b.id] ?? 0) - (playerScores[a.id] ?? 0));
                const winner = ranked[0];
                const cardBg = colorScheme === 'dark' ? '#1F2937' : '#F9FAFB';
                const getRankStyle = (index: number) => {
                  if (index === 0) return { bg: '#FEF3C7', border: '#F59E0B', icon: 'trophy' as const };
                  if (index === 1) return { bg: '#E5E7EB', border: '#9CA3AF', icon: 'medal' as const };
                  if (index === 2) return { bg: '#FED7AA', border: '#EA580C', icon: 'medal' as const };
                  return { bg: colorScheme === 'dark' ? '#374151' : '#F3F4F6', border: colorScheme === 'dark' ? '#4B5563' : '#E5E7EB', icon: 'ellipse' as const };
                };
                return (
                  <>
                    {winner && (
                      <ThemedView style={[styles.finalWinnerCard, { backgroundColor: cardBg, borderColor: '#F59E0B', borderWidth: 2 }]}>
                        <ThemedView style={styles.finalWinnerCrown}>
                          <Ionicons name="trophy" size={28} color="#F59E0B" />
                        </ThemedView>
                        <ThemedText style={[styles.finalWinnerLabel, { color: colors.text }]}>{t('games.synonyms.winner')}</ThemedText>
                        <ThemedView style={[styles.finalWinnerAvatar, { backgroundColor: colors.tint }]}>
                          <ThemedText style={styles.finalWinnerInitial}>{winner.name.charAt(0).toUpperCase()}</ThemedText>
                        </ThemedView>
                        <ThemedText style={[styles.finalWinnerName, { color: colors.text }]}>{winner.name}</ThemedText>
                        <ThemedText style={styles.finalWinnerPoints}>{(playerScores[winner.id] ?? 0)} {t('games.synonyms.pts')}</ThemedText>
                      </ThemedView>
                    )}
                    <ThemedText style={[styles.finalStandingsTitle, { color: colors.text }]}>{t('games.synonyms.standings')}</ThemedText>
                    {ranked.map((player, index) => {
                      const rankStyle = getRankStyle(index);
                      const pts = playerScores[player.id] ?? 0;
                      return (
                        <ThemedView key={player.id} style={[styles.finalRowCard, { backgroundColor: cardBg, borderColor: rankStyle.border }]}>
                          <ThemedView style={[styles.finalRankBadge, { backgroundColor: rankStyle.bg, borderColor: rankStyle.border }]}>
                            {rankStyle.icon === 'trophy' ? (
                              <Ionicons name="trophy" size={18} color="#B45309" />
                            ) : rankStyle.icon === 'medal' ? (
                              <ThemedText style={[styles.finalRankNumber, { color: index === 1 ? '#4B5563' : '#9A3412' }]}>{index + 1}</ThemedText>
                            ) : (
                              <ThemedText style={[styles.finalRankNumber, { color: colors.text }]}>{index + 1}</ThemedText>
                            )}
                          </ThemedView>
                          <ThemedView style={[styles.finalRowAvatar, { backgroundColor: index === 0 ? colors.tint : (colorScheme === 'dark' ? '#4B5563' : '#E5E7EB') }]}>
                            <ThemedText style={styles.finalRowInitial}>{player.name.charAt(0).toUpperCase()}</ThemedText>
                          </ThemedView>
                          <ThemedText style={[styles.finalRowName, { color: colors.text }]} numberOfLines={1}>{player.name}</ThemedText>
                          <ThemedText style={[styles.finalRowPoints, { color: colors.text }]}>{pts} {t('games.synonyms.pts')}</ThemedText>
                        </ThemedView>
                      );
                    })}
                  </>
                );
              })()}
            </>
          )}
          <TouchableOpacity style={[styles.primaryButton, styles.finalBackButton, { backgroundColor: colors.tint }]} onPress={() => { ScreenOrientation.unlockAsync().catch(() => {}); router.back(); }}>
            <Ionicons name="game-controller" size={22} color="#FFFFFF" />
            <ThemedText style={styles.primaryButtonText}>{t('games.synonyms.backToGames')}</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      );
    }
    return null;
  };

  return (
    <ThemedView style={styles.container}>
      {currentStep === 'rules' && renderRules()}
      {currentStep === 'players' && renderPlayers()}
      {currentStep === 'teamsChoice' && renderTeamsChoice()}
      {currentStep === 'teams' && renderTeams()}
      {currentStep === 'roundsAndTime' && renderRoundsAndTime()}
      {currentStep === 'game' && renderGame()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  content: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backButton: { padding: 8 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  placeholder: { width: 40 },
  rulesCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  rulesCardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  rulesText: { fontSize: 15, lineHeight: 22, opacity: 0.95 },
  rulesSection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.25)', backgroundColor: 'transparent' },
  rulesSectionTitle: { fontSize: 17, fontWeight: '600', marginBottom: 10 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, marginBottom: 32 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 8 },
  playerList: { gap: 8 },
  playerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  playerName: { fontSize: 16, fontWeight: '500' },
  subtitle: { fontSize: 15, marginBottom: 20, opacity: 0.8 },
  sectionLabel: { fontSize: 14, fontWeight: '600', opacity: 0.8, marginBottom: 8 },
  roleLabel: { fontSize: 16, marginBottom: 12 },
  teamModeRow: { padding: 16, borderRadius: 12, borderWidth: 2, marginBottom: 12 },
  teamModeTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  teamModeDesc: { fontSize: 14, opacity: 0.85 },
  teamNameRow: { flexDirection: 'row', gap: 12 },
  teamNameInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  teamAssignRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  teamChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  teamChipText: { fontSize: 14, fontWeight: '600' },
  regenerateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  regenerateButtonText: { fontSize: 16, fontWeight: '600' },
  timerChipsRow: { flexDirection: 'row', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  timerChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  timerChipText: { fontSize: 15, fontWeight: '600' },
  timerCustomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginVertical: 16 },
  timerNumBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  timerText: { fontSize: 48, fontWeight: 'bold' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  scoreRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.2)' },
  teamScoreName: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  teamScoreValue: { fontSize: 22, fontWeight: 'bold', minWidth: 36, textAlign: 'right' },
  finalTeamBlock: { paddingVertical: 8 },
  finalTeamBlockBorder: { borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.25)' },
  finalPlayerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingLeft: 16 },
  finalPlayerName: { fontSize: 16, opacity: 0.9 },
  finalPlayerPts: { fontSize: 16, fontWeight: '600' },
  gameContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  rotateBox: { alignItems: 'center' },
  rotatePlayerLabel: { fontSize: 22, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  rotateText: { fontSize: 18, marginTop: 16, textAlign: 'center' },
  continueLink: { marginTop: 24, padding: 12 },
  continueLinkText: { fontSize: 16, fontWeight: '600' },
  countdownContainer: { backgroundColor: 'transparent' },
  countdownCircle: { width: 160, height: 160, borderRadius: 80, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  countdownText: { fontSize: 80, fontWeight: 'bold' },
  timerBadge: { fontSize: 24, fontWeight: 'bold' },
  wordCard: { paddingVertical: 48, paddingHorizontal: 40, marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  wordText: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  wordTextLarge: { fontSize: 100, fontWeight: 'bold', textAlign: 'center', lineHeight: 120 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 8 },
  resultsContent: { flex: 1 },
  resultsContentContainer: { paddingHorizontal: 24, paddingBottom: 32, maxWidth: 600, alignSelf: 'center', width: '100%' },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  resultsTitle: { fontSize: 22, fontWeight: 'bold' },
  resultsPlayerLabel: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  resultsScoreLabel: { fontSize: 15, opacity: 0.85, marginBottom: 16 },
  resultsWordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  resultsWordChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  resultsWordText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', maxWidth: 160 },
  resultsNextBtn: { alignSelf: 'center' },
  feedbackScreen: { flex: 1, width: '100%' },
  feedbackScreenFull: { position: 'absolute', top: -80, left: 0, right: 0, bottom: 0, zIndex: 100 },
  landscapeOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: 'center', alignItems: 'center', padding: 24 },
  finalBackButton: { marginTop: 24 },
  finalHeroCard: { alignItems: 'center', padding: 24, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  finalHeroIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  finalHeroTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  finalHeroSubtitle: { fontSize: 15, opacity: 0.9 },
  finalWinnerCard: { alignItems: 'center', padding: 20, borderRadius: 16, borderWidth: 2, marginBottom: 16 },
  finalWinnerCrown: { marginBottom: 8 },
  finalWinnerLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, opacity: 0.9 },
  finalWinnerAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  finalWinnerInitial: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  finalWinnerName: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  finalWinnerPoints: { fontSize: 16, fontWeight: '600', color: '#F59E0B' },
  finalStandingsTitle: { fontSize: 17, fontWeight: '600', marginBottom: 12 },
  finalRowCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 12 },
  finalRankBadge: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  finalRankNumber: { fontSize: 14, fontWeight: '700' },
  finalRowAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  finalRowInitial: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  finalRowName: { flex: 1, fontSize: 16, fontWeight: '500' },
  finalRowPoints: { fontSize: 15, fontWeight: '600' },
});
