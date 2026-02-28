import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from '@/contexts/I18nContext';
import { fetchWordPairs, reportWordPairUsage, type WordPair as ApiWordPair, type WordPairUsage } from '@/services/wordsService';

interface Player {
  id: string;
  name: string;
  word: string;
  isImposter: boolean;
  hasReadWord: boolean;
  wordViewCount: number;
  points: number;
  roundPoints: number;
}

interface GameSettings {
  rounds: number;
  roundTime: number; // Total time for the entire round
  startingPlayer: string;
}

const FALLBACK_WORDS: ApiWordPair[] = [
  { normal: 'Pizza', imposter: 'Burger' },
  { normal: 'Ocean', imposter: 'Mountain' },
  { normal: 'Coffee', imposter: 'Tea' },
  { normal: 'Summer', imposter: 'Winter' },
  { normal: 'Music', imposter: 'Art' },
  { normal: 'Sun', imposter: 'Moon' },
  { normal: 'Book', imposter: 'Movie' },
  { normal: 'Cat', imposter: 'Dog' },
];

export default function SingleDeviceGameScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [wordPairs, setWordPairs] = useState<ApiWordPair[]>(FALLBACK_WORDS);
  const [currentStep, setCurrentStep] = useState<'rules' | 'players' | 'roundsAndTime' | 'wordAssignment' | 'gameplay' | 'voting' | 'scoring' | 'finalResults'>('rules');
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    rounds: 3,
    roundTime: 60,
    startingPlayer: '',
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentWordPair, setCurrentWordPair] = useState<ApiWordPair>(FALLBACK_WORDS[0]);
  const [wordsLoading, setWordsLoading] = useState(false);
  const [roundResults, setRoundResults] = useState<WordPairUsage[]>([]);
  const hasReportedUsageRef = useRef(false);
  const [showWordModal, setShowWordModal] = useState(false);
  const [currentPlayerName, setCurrentPlayerName] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isWordRevealed, setIsWordRevealed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(gameSettings.roundTime);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasAlarmed, setHasAlarmed] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const playerNameInputRef = useRef<TextInput>(null);

  const handleBackPress = () => {
    if (currentStep === 'rules') {
      router.back();
    } else if (currentStep === 'players') {
      setCurrentStep('rules');
    } else if (currentStep === 'roundsAndTime') {
      setCurrentStep('players');
    } else {
      // Show confirmation dialog when game is in progress
      Alert.alert(
        t('games.oneWordUnites.exitGame'),
        t('games.oneWordUnites.exitConfirm'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('games.oneWordUnites.exitGameButton'),
            style: 'destructive',
            onPress: () => {
              setCurrentStep('rules');
              setCurrentPlayerIndex(0);
              setCurrentRound(1);
              setCurrentWordPair(wordPairs[0] ?? FALLBACK_WORDS[0]);
                                        setPlayers(players.map(p => ({
                            ...p,
                            word: '',
                            isImposter: false,
                            hasReadWord: false,
                            wordViewCount: 0,
                            roundPoints: 0,
                          })));
            },
          },
        ]
      );
    }
  };

  const addPlayer = () => {
    const trimmedName = newPlayerName.trim();
    if (trimmedName) {
      // Check if player name already exists
      if (players.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
        Alert.alert(t('games.oneWordUnites.playerExists'), t('games.oneWordUnites.playerExistsMessage'));
        return;
      }
      
      const newPlayer: Player = {
        id: Date.now().toString(),
        name: trimmedName,
        word: '',
        isImposter: false,
        hasReadWord: false,
        wordViewCount: 0,
        points: 0,
        roundPoints: 0,
      };
      setPlayers([...players, newPlayer]);
      setNewPlayerName('');
      
      // Keep the input focused after adding a player
      setTimeout(() => {
        playerNameInputRef.current?.focus();
      }, 100);
    }
  };

  const handleAddPlayerButton = () => {
    addPlayer();
    // Ensure the input stays focused
    setTimeout(() => {
      playerNameInputRef.current?.focus();
    }, 50);
  };

  const removePlayer = (playerId: string) => {
    setPlayers(players.filter(p => p.id !== playerId));
  };

  const startGame = async () => {
    if (players.length < 3) {
      Alert.alert(t('games.oneWordUnites.notEnoughPlayers'), t('games.oneWordUnites.need3Players'));
      return;
    }
    setRoundResults([]);
    hasReportedUsageRef.current = false;
    setWordsLoading(true);
    let list = FALLBACK_WORDS;
    try {
      const pairs = await fetchWordPairs(gameSettings.rounds, locale);
      if (pairs.length > 0) {
        list = pairs;
        setWordPairs(pairs);
      }
    } catch {
      setWordPairs(FALLBACK_WORDS);
    } finally {
      setWordsLoading(false);
    }
    const firstPair = list[0];
    setCurrentWordPair(firstPair);
    const randomStartingPlayer = players[Math.floor(Math.random() * players.length)];
    setGameSettings(prev => ({ ...prev, startingPlayer: randomStartingPlayer.name }));
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const numImpostors = Math.ceil(shuffledPlayers.length / 4);
    const imposterIndices: number[] = [];
    while (imposterIndices.length < numImpostors) {
      const randomIndex = Math.floor(Math.random() * shuffledPlayers.length);
      if (!imposterIndices.includes(randomIndex)) imposterIndices.push(randomIndex);
    }
    const updatedPlayers = shuffledPlayers.map((player, index) => ({
      ...player,
      word: imposterIndices.includes(index) ? firstPair.imposter : firstPair.normal,
      isImposter: imposterIndices.includes(index),
      hasReadWord: false,
      wordViewCount: 0,
      roundPoints: 0,
      points: 0,
    }));
    setPlayers(updatedPlayers);
    setCurrentRound(1);
    setCurrentPlayerIndex(0);
    setCurrentStep('wordAssignment');
  };

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    // Only run timer during gameplay phase, not during voting or final results
    if (isTimerRunning && timeRemaining > 0 && currentStep === 'gameplay') {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          
          // Trigger alarm when time reaches 0
          if (newTime === 0) {
            setHasAlarmed(true);
            setIsTimerRunning(false);
            // Trigger haptic feedback and visual alert
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(t('games.oneWordUnites.timesUp'), t('games.oneWordUnites.timesUpMessage'));
          }
          
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTimerRunning, timeRemaining, currentStep]);

  useEffect(() => {
    if (currentStep !== 'finalResults' || roundResults.length === 0 || hasReportedUsageRef.current) return;
    hasReportedUsageRef.current = true;
    const toSend = roundResults.filter((u) => u.pairId);
    if (toSend.length > 0) reportWordPairUsage(toSend).catch(() => {});
  }, [currentStep, roundResults]);

  const startTimer = () => {
    setTimeRemaining(gameSettings.roundTime);
    setIsTimerRunning(true);
    setHasAlarmed(false);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const resumeTimer = () => {
    setIsTimerRunning(true);
  };

  const resetTimer = () => {
    setTimeRemaining(gameSettings.roundTime);
    setIsTimerRunning(false);
    setHasAlarmed(false);
  };

  const assignWordToPlayer = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      setCurrentPlayerName(player.name);
      setIsWordRevealed(false); // Reset word visibility
      setShowWordModal(true);
    }
  };

  const confirmWordRead = () => {
    const updatedPlayers = players.map(p => {
      if (p.name !== currentPlayerName) return p;
      const alreadyRead = p.hasReadWord;
      return {
        ...p,
        hasReadWord: true,
        wordViewCount: alreadyRead ? p.wordViewCount + 1 : 1,
      };
    });
    setPlayers(updatedPlayers);
    setShowWordModal(false);
  };

  const nextPlayer = () => {
    // Always finish the round and go to voting, regardless of current player
    // Stop the timer when entering voting phase
    setIsTimerRunning(false);
    setHasAlarmed(false);
    setCurrentStep('voting');
  };

  const updatePlayerPoints = (playerId: string, points: number) => {
    setPlayers(players.map(player => 
      player.id === playerId 
        ? { ...player, roundPoints: points }
        : player
    ));
  };

  const saveRoundPoints = () => {
    const pairForRound = wordPairs[currentRound - 1];
    if (pairForRound?.id) {
      const avgPoints = players.reduce((s, p) => s + p.roundPoints, 0) / players.length;
      const rating = Math.min(5, Math.max(1, 3 + avgPoints * 0.5));
      setRoundResults((prev) => [...prev, { pairId: pairForRound.id!, rating }]);
    }
    const updatedPlayers = players.map(player => ({
      ...player,
      points: player.points + player.roundPoints,
      roundPoints: 0,
    }));
    setPlayers(updatedPlayers);
    setShowResults(false);
    finishRoundWithPlayers(updatedPlayers);
  };

  const finishRoundWithPlayers = (currentPlayers: Player[]) => {
    if (currentRound < gameSettings.rounds) {
      setCurrentRound(currentRound + 1);
      setCurrentPlayerIndex(0);
      setCurrentStep('wordAssignment');
      
      // Reset players and assign new words, but preserve accumulated points
      const newWordPair = wordPairs[currentRound % wordPairs.length] ?? wordPairs[0];
      setCurrentWordPair(newWordPair);
      
      const shuffledPlayers = [...currentPlayers].sort(() => Math.random() - 0.5);
      
      // Calculate number of impostors: 1 impostor per 4 players
      const numImpostors = Math.ceil(shuffledPlayers.length / 4);
      
      // Randomly select impostor indices
      const imposterIndices: number[] = [];
      while (imposterIndices.length < numImpostors) {
        const randomIndex = Math.floor(Math.random() * shuffledPlayers.length);
        if (!imposterIndices.includes(randomIndex)) {
          imposterIndices.push(randomIndex);
        }
      }
      
      const updatedPlayers = shuffledPlayers.map((player, index) => ({
        ...player,
        word: imposterIndices.includes(index) ? newWordPair.imposter : newWordPair.normal,
        isImposter: imposterIndices.includes(index),
        hasReadWord: false,
        wordViewCount: 0,
        roundPoints: 0,
        points: player.points,
      }));
      
      console.log('Starting new round. Players with accumulated points:', updatedPlayers.map(p => ({ name: p.name, points: p.points })));
      console.log('Impostors for this round:', imposterIndices.map(i => shuffledPlayers[i].name));
      
      setPlayers(updatedPlayers);
      
      // Reset timer for new round
      setTimeRemaining(gameSettings.roundTime);
      setIsTimerRunning(false);
      setHasAlarmed(false);
      setShowResults(false);
    } else {
      // Game finished - show final results
      setCurrentStep('finalResults');
    }
  };



  const renderRules = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedView style={styles.headerContent}>
          <Ionicons name="information-circle" size={24} color={colors.tint} />
          <ThemedText style={styles.headerTitle}>{t('games.oneWordUnites.rulesTitle')}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.placeholder} />
      </ThemedView>
      <ThemedView style={[styles.rulesCard, { 
        backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
        borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB'
      }]}>
        <ThemedView style={styles.cardHeader}>
          <Ionicons name="information-circle" size={24} color={colors.tint} />
          <ThemedText style={styles.cardTitle}>{t('games.oneWordUnites.howToPlay')}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.rulesContent}>
          <ThemedText style={[styles.rulesText, { color: colors.text }]}>{t('games.oneWordUnites.rulesIntro')}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.rulesSection}>
          <ThemedText style={[styles.rulesSectionTitle, { color: colors.text }]}>{t('games.oneWordUnites.scoring')}</ThemedText>
          <ThemedText style={[styles.rulesText, { color: colors.text }]}>{t('games.oneWordUnites.scoringRules')}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.rulesSection}>
          <ThemedText style={[styles.rulesSectionTitle, { color: colors.text }]}>{t('games.oneWordUnites.strategy')}</ThemedText>
          <ThemedText style={[styles.rulesText, { color: colors.text }]}>{t('games.oneWordUnites.strategyRules')}</ThemedText>
        </ThemedView>
      </ThemedView>
      <TouchableOpacity 
        style={[styles.startButton, { backgroundColor: colors.tint }]}
        onPress={() => setCurrentStep('players')}
      >
        <ThemedText style={styles.startButtonText}>{t('common.next')}</ThemedText>
        <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );

  const renderPlayersStep = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedView style={styles.headerContent}>
          <Ionicons name="people" size={24} color={colors.tint} />
          <ThemedText style={styles.headerTitle}>{t('games.oneWordUnites.addPlayers')}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.placeholder} />
      </ThemedView>
      <ThemedText style={[styles.subtitle, { color: colors.text }]}>{t('games.oneWordUnites.playersCount', { count: players.length })}</ThemedText>
      <ThemedView style={[styles.playersCard, { 
        backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
        borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB'
      }]}>
        <View style={styles.addRow}>
          <TextInput
            ref={playerNameInputRef}
            style={[styles.input, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6', color: colors.text }]}
            placeholder={t('games.oneWordUnites.enterPlayerName')}
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
        <ThemedText style={[styles.hint, { color: colors.text }]}>{t('games.oneWordUnites.addAtLeast3')}</ThemedText>
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
      <TouchableOpacity 
        style={[
          styles.startButton, 
          { backgroundColor: players.length >= 3 ? colors.tint : colorScheme === 'dark' ? '#374151' : '#E5E7EB' }
        ]}
        onPress={() => players.length >= 3 && setCurrentStep('roundsAndTime')}
        disabled={players.length < 3}
      >
        <ThemedText style={styles.startButtonText}>{t('common.next')}</ThemedText>
        <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );

  const ROUNDS_MIN = 1;
  const ROUNDS_MAX = 10;
  const TIME_PRESETS = [30, 60, 90, 120];

  const renderRoundsAndTime = () => {
    const cardBg = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
    const cardBorder = colorScheme === 'dark' ? '#374151' : '#E5E7EB';
    const stepperBg = colorScheme === 'dark' ? '#374151' : '#F3F4F6';
    const stepperBorder = colorScheme === 'dark' ? '#4B5563' : '#E5E7EB';
    const chipBg = (v: number) =>
      gameSettings.roundTime === v ? colors.tint : (colorScheme === 'dark' ? '#374151' : '#F3F4F6');
    const chipBorder = (v: number) =>
      gameSettings.roundTime === v ? colors.tint : (colorScheme === 'dark' ? '#4B5563' : '#E5E7EB');
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <Ionicons name="settings" size={24} color={colors.tint} />
            <ThemedText style={styles.headerTitle}>{t('games.oneWordUnites.roundsAndTime')}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.placeholder} />
        </ThemedView>
        <ThemedText style={[styles.roundsTimeSubtitle, { color: colors.text, opacity: 0.7 }]}>
          {t('games.oneWordUnites.roundsSubtitle')}
        </ThemedText>

        <ThemedView style={[styles.roundsTimeCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <ThemedView style={styles.roundsTimeCardHeader}>
            <ThemedView style={[styles.roundsTimeIconWrap, { backgroundColor: colors.tint + '20' }]}>
              <Ionicons name="repeat" size={28} color={colors.tint} />
            </ThemedView>
            <ThemedText style={[styles.roundsTimeCardTitle, { color: colors.text }]}>{t('games.oneWordUnites.rounds')}</ThemedText>
            <ThemedText style={[styles.roundsTimeCardHint, { color: colors.text, opacity: 0.6 }]}>
              {t('games.oneWordUnites.roundsLabel')}
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.roundsTimeStepper}>
            <TouchableOpacity
              style={[styles.roundsTimeStepperBtn, { backgroundColor: stepperBg, borderColor: stepperBorder }]}
              onPress={() => gameSettings.rounds > ROUNDS_MIN && setGameSettings({ ...gameSettings, rounds: gameSettings.rounds - 1 })}
              disabled={gameSettings.rounds <= ROUNDS_MIN}
            >
              <Ionicons name="remove" size={28} color={gameSettings.rounds <= ROUNDS_MIN ? (colorScheme === 'dark' ? '#6B7280' : '#9CA3AF') : colors.tint} />
            </TouchableOpacity>
            <ThemedView style={[styles.roundsTimeValueWrap, { backgroundColor: stepperBg, borderColor: stepperBorder }]}>
              <ThemedText style={[styles.roundsTimeValue, { color: colors.text }]}>{gameSettings.rounds}</ThemedText>
            </ThemedView>
            <TouchableOpacity
              style={[styles.roundsTimeStepperBtn, { backgroundColor: stepperBg, borderColor: stepperBorder }]}
              onPress={() => gameSettings.rounds < ROUNDS_MAX && setGameSettings({ ...gameSettings, rounds: gameSettings.rounds + 1 })}
              disabled={gameSettings.rounds >= ROUNDS_MAX}
            >
              <Ionicons name="add" size={28} color={gameSettings.rounds >= ROUNDS_MAX ? (colorScheme === 'dark' ? '#6B7280' : '#9CA3AF') : colors.tint} />
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>

        <ThemedView style={[styles.roundsTimeCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <ThemedView style={styles.roundsTimeCardHeader}>
            <ThemedView style={[styles.roundsTimeIconWrap, { backgroundColor: colors.tint + '20' }]}>
              <Ionicons name="time" size={28} color={colors.tint} />
            </ThemedView>
            <ThemedText style={[styles.roundsTimeCardTitle, { color: colors.text }]}>{t('games.oneWordUnites.roundTime')}</ThemedText>
            <ThemedText style={[styles.roundsTimeCardHint, { color: colors.text, opacity: 0.6 }]}>
              {t('games.oneWordUnites.timeLabel')}
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.roundsTimeChips}>
            {TIME_PRESETS.map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[styles.roundsTimeChip, { backgroundColor: chipBg(sec), borderColor: chipBorder(sec) }]}
                onPress={() => setGameSettings({ ...gameSettings, roundTime: sec })}
              >
                <ThemedText style={[styles.roundsTimeChipText, { color: gameSettings.roundTime === sec ? '#FFFFFF' : colors.text }]}>
                  {sec >= 60 ? `${sec / 60}m` : `${sec}s`}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>
          <ThemedView style={styles.roundsTimeStepper}>
            <TouchableOpacity
              style={[styles.roundsTimeStepperBtn, { backgroundColor: stepperBg, borderColor: stepperBorder }]}
              onPress={() => setGameSettings({ ...gameSettings, roundTime: Math.max(30, gameSettings.roundTime - 15) })}
            >
              <Ionicons name="remove" size={28} color={colors.tint} />
            </TouchableOpacity>
            <ThemedView style={[styles.roundsTimeValueWrap, { backgroundColor: stepperBg, borderColor: stepperBorder }]}>
              <ThemedText style={[styles.roundsTimeValue, { color: colors.text }]}>{gameSettings.roundTime}s</ThemedText>
            </ThemedView>
            <TouchableOpacity
              style={[styles.roundsTimeStepperBtn, { backgroundColor: stepperBg, borderColor: stepperBorder }]}
              onPress={() => setGameSettings({ ...gameSettings, roundTime: gameSettings.roundTime + 15 })}
            >
              <Ionicons name="add" size={28} color={colors.tint} />
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>

        <TouchableOpacity
          style={[styles.startButton, styles.roundsTimeStartBtn, { backgroundColor: wordsLoading ? (colorScheme === 'dark' ? '#4B5563' : '#9CA3AF') : colors.tint }]}
          onPress={startGame}
          disabled={wordsLoading}
        >
          {wordsLoading ? (
            <ThemedText style={styles.startButtonText}>{t('games.oneWordUnites.loadingWords')}</ThemedText>
          ) : (
            <>
              <Ionicons name="play" size={26} color="#FFFFFF" />
              <ThemedText style={styles.startButtonText}>{t('games.oneWordUnites.startGame')}</ThemedText>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderWordAssignment = () => (
    <ThemedView style={styles.content}>
      {/* Word Assignment Header */}
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedView style={styles.headerContent}>
          <Ionicons name="document-text" size={24} color={colors.tint} />
          <ThemedText style={styles.headerTitle}>{t('games.oneWordUnites.roundWordAssignment', { round: currentRound })}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.placeholder} />
      </ThemedView>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Instructions Card - Only show when not all players have read words */}
        {!players.every(p => p.hasReadWord) && (
          <ThemedView style={[styles.instructionsCard, { 
            backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
            borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB'
          }]}>
            <ThemedView style={styles.cardHeader}>
              <Ionicons name="information-circle" size={24} color={colors.tint} />
              <ThemedText style={styles.cardTitle}>{t('games.oneWordUnites.instructions')}</ThemedText>
            </ThemedView>
            <ThemedText style={[styles.instructionsText, { color: colors.text }]}>
              {t('games.oneWordUnites.passPhone')}
            </ThemedText>
          </ThemedView>
        )}

        {/* Players Progress Card - Only show when not all players have read words */}
        {!players.every(p => p.hasReadWord) && (
          <>
            <ThemedView style={[styles.playersProgressCard, { 
              backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
              borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB'
            }]}>
              <ThemedView style={styles.cardHeader}>
                <Ionicons name="people" size={24} color={colors.tint} />
                <ThemedText style={styles.cardTitle}>
                  {t('games.oneWordUnites.playersReadyTotal', { ready: players.filter(p => p.hasReadWord).length, total: players.length })}
                </ThemedText>
              </ThemedView>

              <ThemedView style={styles.playersGrid}>
                {players.map((player, index) => (
                  <TouchableOpacity 
                    key={player.id}
                    style={[
                      styles.playerAssignmentCard,
                      { 
                        backgroundColor: player.hasReadWord 
                          ? (colorScheme === 'dark' ? '#065F46' : '#D1FAE5') 
                          : (colorScheme === 'dark' ? '#374151' : '#F3F4F6'),
                        borderColor: player.hasReadWord ? '#10B981' : (colorScheme === 'dark' ? '#4B5563' : '#D1D5DB')
                      }
                    ]}
                    onPress={() => assignWordToPlayer(player.id)}
                  >
                    <ThemedView style={styles.playerAssignmentHeader}>
                      <ThemedView style={[styles.playerAssignmentAvatar, { 
                        backgroundColor: player.hasReadWord ? '#10B981' : colors.tint 
                      }]}>
                        <ThemedText style={styles.playerAssignmentInitial}>
                          {player.name.charAt(0).toUpperCase()}
                        </ThemedText>
                      </ThemedView>
                      <ThemedView style={styles.playerAssignmentInfo}>
                        <ThemedText style={[styles.playerAssignmentName, { color: colors.text }]}>
                          {player.name}
                        </ThemedText>
                        <ThemedText style={[styles.playerAssignmentStatus, { 
                          color: player.hasReadWord ? '#10B981' : (colorScheme === 'dark' ? '#9CA3AF' : '#6B7280')
                        }]}>
                          {player.hasReadWord
                            ? ((player.wordViewCount ?? 0) > 1 ? t('games.oneWordUnites.wordReadCount', { count: player.wordViewCount ?? 0 }) : t('games.oneWordUnites.wordRead'))
                            : t('games.oneWordUnites.tapToReadWord')}
                        </ThemedText>
                      </ThemedView>
                      {player.hasReadWord && (
                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                      )}
                    </ThemedView>
                  </TouchableOpacity>
                ))}
              </ThemedView>
            </ThemedView>

            {/* Progress Indicator - Only show when not all players have read words */}
            <ThemedView style={[styles.progressCard, { 
              backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
              borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB'
            }]}>
              <ThemedView style={styles.progressHeader}>
                <Ionicons name="trending-up" size={20} color={colors.tint} />
                <ThemedText style={[styles.progressTitle, { color: colors.text }]}>
                  {t('games.oneWordUnites.wordAssignmentProgress', { ready: players.filter(p => p.hasReadWord).length, total: players.length })}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.progressBar}>
                <ThemedView 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${(players.filter(p => p.hasReadWord).length / players.length) * 100}%`,
                      backgroundColor: colors.tint 
                    }
                  ]} 
                />
              </ThemedView>
            </ThemedView>
          </>
        )}

        {/* Ready to Start Section - Only show when all players have read words */}
        {players.every(p => p.hasReadWord) && (
          <ThemedView style={[styles.readySection, { 
            backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
            borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB'
          }]}>
            <ThemedView style={styles.readyHeader}>
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              <ThemedText style={[styles.readyTitle, { 
                color: colors.text 
              }]}>{t('games.oneWordUnites.allReady')}</ThemedText>
            </ThemedView>
            <ThemedText style={[styles.readySubtitle, { 
              color: colors.text 
            }]}>
              {t('games.oneWordUnites.allReadySubtitle')}
            </ThemedText>
            <TouchableOpacity 
              style={[styles.readyButton, { backgroundColor: colors.tint }]}
              onPress={() => {
                setCurrentStep('gameplay');
                setTimeRemaining(gameSettings.roundTime);
                setIsTimerRunning(true);
                setHasAlarmed(false);
              }}
            >
              <Ionicons name="play" size={24} color="#FFFFFF" />
              <ThemedText style={styles.readyButtonText}>{t('games.oneWordUnites.startClueGuessing')}</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
  );

  const renderGameplay = () => {
    // Calculate timer progress and color
    const timerProgress = (timeRemaining / gameSettings.roundTime) * 100;
    const getTimerColor = () => {
      if (timeRemaining <= 10) return '#EF4444'; // Red for last 10 seconds
      if (timeRemaining <= gameSettings.roundTime * 0.3) return '#F59E0B'; // Orange for last 30%
      return '#10B981'; // Green for normal time
    };
    const timerColor = getTimerColor();

    return (
      <ThemedView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <ThemedView style={[
          styles.timerBackground,
          { 
            backgroundColor: timerColor,
            height: `${100 - timerProgress}%`,
            bottom: 0,
            top: 'auto',
            opacity: 0.4,
            width: '100%',
            left: 0,
            right: 0
          }
        ]} />
        <ThemedView style={[styles.content, { zIndex: 1, backgroundColor: 'transparent' }]}>
        
        {/* Game Header */}
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <Ionicons name="game-controller" size={24} color={colors.tint} />
            <ThemedText style={styles.headerTitle}>{t('games.oneWordUnites.clueGuessing', { round: currentRound })}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.placeholder} />
        </ThemedView>

        <ThemedView style={styles.gameplaySection}>
          {/* Current Player Card */}
          <ThemedView style={[styles.currentPlayerCard, { 
            backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
            borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB'
          }]}>
            <ThemedView style={styles.cardHeader}>
              <Ionicons name="person" size={24} color={colors.tint} />
              <ThemedText style={styles.cardTitle}>{t('games.oneWordUnites.startingWith')}</ThemedText>
            </ThemedView>
            <ThemedView style={styles.currentPlayerInfo}>
              <ThemedView style={[styles.currentPlayerAvatar, { backgroundColor: colors.tint }]}>
                <ThemedText style={styles.currentPlayerInitial}>
                  {players[currentPlayerIndex]?.name.charAt(0).toUpperCase()}
                </ThemedText>
              </ThemedView>
              <ThemedText style={[styles.currentPlayerName, { color: colors.text }]}>
                {players[currentPlayerIndex]?.name}
              </ThemedText>
            </ThemedView>
          </ThemedView>

          {/* Dynamic Timer Card */}
          <ThemedView style={[styles.timerCard, { 
            backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
            borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB'
          }]}>
            <ThemedView style={styles.cardHeader}>
              <Ionicons name="time" size={24} color={timerColor} />
              <ThemedText style={[styles.cardTitle, { color: timerColor }]}>{t('games.oneWordUnites.roundTimer')}</ThemedText>
            </ThemedView>
            
            <ThemedView style={styles.timerDisplay}>
              <ThemedText style={[styles.timerText, { color: timerColor }]}>
                {timeRemaining}s
              </ThemedText>
            </ThemedView>

            {/* Timer Controls */}
            <ThemedView style={styles.timerControls}>
              {isTimerRunning && (
                <TouchableOpacity 
                  style={[styles.timerButton, { backgroundColor: '#F59E0B' }]}
                  onPress={pauseTimer}
                >
                  <Ionicons name="pause" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.timerButtonText}>{t('games.oneWordUnites.pause')}</ThemedText>
                </TouchableOpacity>
              )}
              {!isTimerRunning && timeRemaining < gameSettings.roundTime && timeRemaining > 0 && (
                <TouchableOpacity 
                  style={[styles.timerButton, { backgroundColor: colors.tint }]}
                  onPress={resumeTimer}
                >
                  <Ionicons name="play" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.timerButtonText}>{t('games.oneWordUnites.resume')}</ThemedText>
                </TouchableOpacity>
              )}
              {timeRemaining === 0 && (
                <TouchableOpacity 
                  style={[styles.timerButton, { backgroundColor: '#10B981' }]}
                  onPress={resetTimer}
                >
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.timerButtonText}>{t('games.oneWordUnites.reset')}</ThemedText>
                </TouchableOpacity>
              )}
            </ThemedView>
          </ThemedView>

          {/* Finish Round Button */}
          <TouchableOpacity 
            style={[styles.finishRoundButton, { backgroundColor: colors.tint }]}
            onPress={nextPlayer}
          >
            <Ionicons name="flag" size={24} color="#FFFFFF" />
            <ThemedText style={styles.finishRoundButtonText}>{t('games.oneWordUnites.finishRound')}</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        </ThemedView>
      </ThemedView>
    );
  };

  const renderVoting = () => (
    <ThemedView style={styles.content}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedView style={styles.headerContent}>
          <Ionicons name="checkmark-circle" size={24} color={colors.tint} />
          <ThemedText style={styles.headerTitle}>{t('games.oneWordUnites.votingTime')}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.placeholder} />
      </ThemedView>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Round Complete Card */}
        <ThemedView style={[styles.votingRoundCard, { 
          backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
          borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB'
        }]}>
          <ThemedView style={styles.cardHeader}>
            <Ionicons name="trophy" size={24} color="#F59E0B" />
            <ThemedText style={styles.cardTitle}>{t('games.oneWordUnites.roundComplete', { round: currentRound })}</ThemedText>
          </ThemedView>
          <ThemedText style={[styles.votingInstructionsText, { color: colors.text }]}>
            {t('games.oneWordUnites.voteDiscussion')}
          </ThemedText>
        </ThemedView>

        {/* Players Card */}
        <ThemedView style={[styles.votingPlayersCard, { 
          backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
          borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB'
        }]}>
          <ThemedView style={styles.cardHeader}>
            <Ionicons name="people" size={24} color={colors.tint} />
            <ThemedText style={styles.cardTitle}>{t('games.oneWordUnites.playersReadyToVote')}</ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.votingPlayersGrid}>
            {players.map((player) => (
              <ThemedView key={player.id} style={[styles.votingPlayerItem, { 
                backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6',
                borderColor: colorScheme === 'dark' ? '#4B5563' : '#E5E7EB'
              }]}>
                <ThemedView style={[styles.votingPlayerAvatar, { backgroundColor: colors.tint }]}>
                  <ThemedText style={styles.votingPlayerInitial}>
                    {player.name.charAt(0).toUpperCase()}
                  </ThemedText>
                </ThemedView>
                <ThemedText style={[styles.votingPlayerName, { color: colors.text }]}>
                  {player.name}
                </ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        </ThemedView>

        {/* Show Results Button */}
        <TouchableOpacity 
          style={[styles.votingResultsButton, { backgroundColor: colors.tint }]}
          onPress={() => setShowResults(true)}
        >
          <Ionicons name="eye" size={24} color="#FFFFFF" />
          <ThemedText style={styles.votingResultsButtonText}>{t('games.oneWordUnites.showResults')}</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );

  const renderScoring = () => {
    const cardBg = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
    const cardBorder = colorScheme === 'dark' ? '#374151' : '#E5E7EB';
    const impostors = players.filter(p => p.isImposter).map(p => p.name).join(', ');
    const POINTS = [0, 1, 2];
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <Ionicons name="trophy" size={24} color={colors.tint} />
            <ThemedText style={styles.headerTitle}>{t('games.oneWordUnites.roundResults', { round: currentRound })}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.placeholder} />
        </ThemedView>

        <ThemedView style={[styles.scoringSummaryCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <ThemedView style={styles.scoringSummaryRow}>
            <Ionicons name="eye-off" size={18} color={colors.tint} />
            <ThemedText style={[styles.scoringSummaryLabel, { color: colors.text }]}>{t('games.oneWordUnites.impostors')}</ThemedText>
            <ThemedText style={[styles.scoringSummaryValue, { color: colors.text }]}>{impostors}</ThemedText>
          </ThemedView>
          <ThemedView style={[styles.scoringSummaryRow, styles.scoringSummaryRowLast]}>
            <Ionicons name="book" size={18} color={colors.tint} />
            <ThemedText style={[styles.scoringSummaryLabel, { color: colors.text }]}>{t('games.oneWordUnites.words')}</ThemedText>
            <ThemedText style={[styles.scoringSummaryValue, { color: colors.text }]}>{currentWordPair.normal} / {currentWordPair.imposter}</ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={[styles.scoringGuideCard, { backgroundColor: colors.tint + '18', borderColor: colors.tint + '40' }]}>
          <Ionicons name="information-circle" size={20} color={colors.tint} />
          <ThemedText style={[styles.scoringGuideText, { color: colors.text }]}>
            {t('games.oneWordUnites.scoringGuide')}
          </ThemedText>
        </ThemedView>

        <ThemedText style={[styles.scoringSectionTitle, { color: colors.text }]}>{t('games.oneWordUnites.pointsThisRound')}</ThemedText>
        {players.map((player) => (
          <ThemedView key={player.id} style={[styles.scoringPlayerCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <ThemedView style={styles.scoringPlayerRow}>
              <ThemedView style={[styles.scoringPlayerAvatar, { backgroundColor: colors.tint }]}>
                <ThemedText style={styles.scoringPlayerInitial}>{player.name.charAt(0).toUpperCase()}</ThemedText>
              </ThemedView>
              <ThemedText style={[styles.scoringPlayerName, { color: colors.text }]}>{player.name}</ThemedText>
            </ThemedView>
            <ThemedView style={styles.scoringPointsRow}>
              {POINTS.map((pts) => {
                const selected = player.roundPoints === pts;
                return (
                  <TouchableOpacity
                    key={pts}
                    style={[
                      styles.scoringPointChip,
                      {
                        backgroundColor: selected ? colors.tint : (colorScheme === 'dark' ? '#374151' : '#F3F4F6'),
                        borderColor: selected ? colors.tint : (colorScheme === 'dark' ? '#4B5563' : '#E5E7EB'),
                      }
                    ]}
                    onPress={() => updatePlayerPoints(player.id, pts)}
                  >
                    <ThemedText style={[styles.scoringPointChipText, { color: selected ? '#FFFFFF' : colors.text }]}>{pts}</ThemedText>
                  </TouchableOpacity>
                );
              })}
              <ThemedText style={[styles.scoringPointsSuffix, { color: colors.text }]}>{t('games.oneWordUnites.pts')}</ThemedText>
            </ThemedView>
          </ThemedView>
        ))}

        <TouchableOpacity
          style={[styles.scoringSaveButton, { backgroundColor: colors.tint }]}
          onPress={saveRoundPoints}
        >
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
          <ThemedText style={styles.scoringSaveButtonText}>{t('games.oneWordUnites.saveContinue')}</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderFinalResults = () => {
    const ranked = [...players].sort((a, b) => b.points - a.points);
    const winner = ranked[0];
    const cardBg = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
    const cardBorder = colorScheme === 'dark' ? '#374151' : '#E5E7EB';
    const getRankStyle = (index: number) => {
      if (index === 0) return { bg: '#FEF3C7', border: '#F59E0B', icon: 'trophy' as const };
      if (index === 1) return { bg: '#E5E7EB', border: '#9CA3AF', icon: 'medal' as const };
      if (index === 2) return { bg: '#FED7AA', border: '#EA580C', icon: 'medal' as const };
      return { bg: colorScheme === 'dark' ? '#374151' : '#F3F4F6', border: colorScheme === 'dark' ? '#4B5563' : '#E5E7EB', icon: 'ellipse' as const };
    };
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <Ionicons name="trophy" size={24} color={colors.tint} />
            <ThemedText style={styles.headerTitle}>{t('games.oneWordUnites.gameComplete')}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.placeholder} />
        </ThemedView>

        <ThemedView style={[styles.finalHeroCard, { backgroundColor: colors.tint + '22', borderColor: colors.tint + '50' }]}>
          <ThemedView style={[styles.finalHeroIconWrap, { backgroundColor: colors.tint }]}>
            <Ionicons name="checkmark-done" size={40} color="#FFFFFF" />
          </ThemedView>
          <ThemedText style={[styles.finalHeroTitle, { color: colors.text }]}>{t('games.oneWordUnites.allRoundsDone', { count: gameSettings.rounds })}</ThemedText>
          <ThemedText style={[styles.finalHeroSubtitle, { color: colors.text }]}>{t('games.oneWordUnites.finalStandings')}</ThemedText>
        </ThemedView>

        {winner && (
          <ThemedView style={[styles.finalWinnerCard, { backgroundColor: cardBg, borderColor: '#F59E0B', borderWidth: 2 }]}>
            <ThemedView style={styles.finalWinnerCrown}>
              <Ionicons name="trophy" size={28} color="#F59E0B" />
            </ThemedView>
            <ThemedText style={[styles.finalWinnerLabel, { color: colors.text }]}>{t('games.oneWordUnites.winner')}</ThemedText>
            <ThemedView style={[styles.finalWinnerAvatar, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.finalWinnerInitial}>{winner.name.charAt(0).toUpperCase()}</ThemedText>
            </ThemedView>
            <ThemedText style={[styles.finalWinnerName, { color: colors.text }]}>{winner.name}</ThemedText>
            <ThemedText style={styles.finalWinnerPoints}>{winner.points} {t('games.oneWordUnites.pts')}</ThemedText>
          </ThemedView>
        )}

        <ThemedText style={[styles.finalStandingsTitle, { color: colors.text }]}>{t('games.oneWordUnites.standings')}</ThemedText>
        {ranked.map((player, index) => {
          const rankStyle = getRankStyle(index);
          return (
            <ThemedView key={player.id} style={[styles.finalRowCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
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
              <ThemedText style={[styles.finalRowPoints, { color: colors.text }]}>{player.points} {t('games.oneWordUnites.pts')}</ThemedText>
            </ThemedView>
          );
        })}

        <TouchableOpacity style={[styles.finalBackButton, { backgroundColor: colors.tint }]} onPress={() => router.back()}>
          <Ionicons name="game-controller" size={22} color="#FFFFFF" />
          <ThemedText style={styles.finalBackButtonText}>{t('games.oneWordUnites.backToGames')}</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {currentStep === 'rules' && renderRules()}
      {currentStep === 'players' && renderPlayersStep()}
      {currentStep === 'roundsAndTime' && renderRoundsAndTime()}
      {currentStep === 'wordAssignment' && renderWordAssignment()}
      {currentStep === 'gameplay' && renderGameplay()}
      {currentStep === 'voting' && !showResults && renderVoting()}
      {currentStep === 'voting' && showResults && renderScoring()}
      {currentStep === 'finalResults' && renderFinalResults()}

      {/* Word Modal */}
      <Modal
        visible={showWordModal}
        transparent={true}
        animationType="fade"
      >
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF' }]}>
            <ThemedText style={styles.modalTitle}>{currentPlayerName}</ThemedText>
            <ThemedText style={styles.modalSubtitle}>{t('games.oneWordUnites.yourWordIs')}</ThemedText>
            
            <TouchableOpacity 
              style={styles.wordContainer}
              onPress={() => setIsWordRevealed(!isWordRevealed)}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.wordText}>
                {isWordRevealed 
                  ? players.find(p => p.name === currentPlayerName)?.word
                  : '*'.repeat(5)
                }
              </ThemedText>
              <ThemedText style={styles.wordHint}>
                {isWordRevealed ? t('games.oneWordUnites.tapToHide') : t('games.oneWordUnites.tapToReveal')}
              </ThemedText>
            </TouchableOpacity>
            
            <ThemedText style={styles.modalInstructions}>
              {players.find(p => p.name === currentPlayerName)?.hasReadWord
                ? t('games.oneWordUnites.viewingAgain')
                : t('games.oneWordUnites.readThenConfirm')}
            </ThemedText>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.tint }]}
              onPress={confirmWordRead}
            >
              <ThemedText style={styles.modalButtonText}>
                {players.find(p => p.name === currentPlayerName)?.hasReadWord ? t('common.done') : t('games.oneWordUnites.gotTheWord')}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </Modal>
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
  scrollContent: {
    flex: 1,
  },
  scrollableContent: {
    flex: 1,
  },
  fixedBottom: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeholder: {
    width: 40,
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
  // New game-themed styles
  gameConfigCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  playersCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subtitle: { fontSize: 15, marginBottom: 20, opacity: 0.8 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 8 },
  playerList: { gap: 8 },
  playerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  rulesCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  numberValueContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  emptyPlayers: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'transparent',
  },
  emptyPlayersText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  playersList: {
    marginTop: 16,
    backgroundColor: 'transparent',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    gap: 12,
    flex: 1,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rulesContent: {
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
  },
  rulesSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.3)',
    backgroundColor: 'transparent',
  },
  rulesSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  rulesText: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.9,
  },
  roundsTimeSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  roundsTimeCard: {
    marginBottom: 20,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  roundsTimeCardHeader: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  roundsTimeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  roundsTimeCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  roundsTimeCardHint: {
    fontSize: 14,
  },
  roundsTimeStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: 'transparent',
  },
  roundsTimeStepperBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  roundsTimeValueWrap: {
    minWidth: 80,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundsTimeValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  roundsTimeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  roundsTimeChip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  roundsTimeChipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  roundsTimeStartBtn: {
    marginTop: 8,
    marginBottom: 32,
    paddingVertical: 18,
    borderRadius: 16,
  },
  // Word Assignment styles
  instructionsCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsText: {
    fontSize: 16,
    lineHeight: 24,
  },
  playersProgressCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  playersGrid: {
    gap: 12,
    backgroundColor: 'transparent',
  },
  playerAssignmentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  playerAssignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  playerAssignmentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAssignmentInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  playerAssignmentInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  playerAssignmentName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  playerAssignmentStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  readySection: {
    marginBottom: 20,
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  readyHeader: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  readyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
    marginTop: 8,
  },
  readySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    color: '#065F46',
    marginBottom: 24,
  },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  readyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  // Gameplay styles
  timerBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0, // Changed from -1 to 0 to make it visible
    minHeight: 0,
    width: '100%',
    flex: 1,
  },
  currentPlayerCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'transparent',
  },
  currentPlayerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPlayerInitial: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  currentPlayerName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  timerCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  timerLabel: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  timerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'transparent',
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  timerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  clueInstructionsCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  finishRoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginVertical: 20,
  },
  settingItem: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  numberInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    maxWidth: 150,
  },
  numberButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberValue: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  addPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  removeButton: {
    padding: 4,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginVertical: 20,
    gap: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  playerCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  playerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  playerCardName: {
    fontSize: 18,
    fontWeight: '600',
  },
  playerCardStatus: {
    fontSize: 14,
    opacity: 0.7,
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 20,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 20,
  },
  finishRoundButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  gameplaySection: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  currentPlayerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  roundInfoText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.7,
  },
  timerText: {
    fontSize: 18,
    opacity: 0.7,
  },
  clueInstructions: {
    backgroundColor: '#F3F4F6',
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  clueInstructionsText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    color: '#000',
  },
  scoringGuide: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 24,
    borderRadius: 16,
    margin: 20,
    alignItems: 'center',
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 16,
  },
  wordText: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
    lineHeight: 40,
    paddingVertical: 8,
  },
  wordContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    minWidth: 200,
    minHeight: 40,
  },
  wordHint: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: 'italic',
    color: '#000',
  },
  proceedSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 20,
  },
  proceedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000',
  },
  proceedSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 20,
    color: '#000',
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  pauseTimerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  pauseTimerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resumeTimerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  resumeTimerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resetTimerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  resetTimerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalInstructions: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 24,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 10,
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
  playerWord: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  scoringContainer: {
    flex: 1,
    marginBottom: 20,
  },
  scoringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  scoringPlayerName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  pointsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  pointsInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    width: 80,
    textAlign: 'center',
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 6,
    width: 80,
    overflow: 'hidden',
  },
  picker: {
    height: 40,
    width: 80,
  },
  pointsButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
  },
  pointButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pointsLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  scoringSummaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  scoringSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  scoringSummaryRowLast: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  scoringSummaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 72,
  },
  scoringSummaryValue: {
    fontSize: 14,
    flex: 1,
    opacity: 0.9,
  },
  scoringGuideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  scoringGuideText: {
    fontSize: 13,
    flex: 1,
    opacity: 0.9,
  },
  scoringSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  scoringPlayerCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  scoringPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
    backgroundColor: 'transparent',
  },
  scoringPlayerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoringPlayerInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scoringPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  scoringPointChip: {
    minWidth: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoringPointChipText: {
    fontSize: 17,
    fontWeight: '700',
  },
  scoringPointsSuffix: {
    fontSize: 14,
    opacity: 0.7,
    marginLeft: 4,
  },
  scoringSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  scoringSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  finalResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 12,
  },
  finalPointsText: {
    fontSize: 16,
    fontWeight: '600',
  },
  finalHeroCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  finalHeroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  finalHeroTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  finalHeroSubtitle: {
    fontSize: 15,
    opacity: 0.8,
  },
  finalWinnerCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  finalWinnerCrown: {
    position: 'absolute',
    top: -14,
  },
  finalWinnerLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.8,
    marginBottom: 10,
  },
  finalWinnerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  finalWinnerInitial: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  finalWinnerName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  finalWinnerPoints: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  finalStandingsTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  finalRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 14,
  },
  finalRankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalRankNumber: {
    fontSize: 15,
    fontWeight: '700',
  },
  finalRowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalRowInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  finalRowName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  finalRowPoints: {
    fontSize: 16,
    fontWeight: '700',
    opacity: 0.9,
  },
  finalBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 36,
  },
  finalBackButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  // Voting styles
  votingRoundCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  votingInstructionsText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
  },
  votingPlayersCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  votingPlayersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
    backgroundColor: 'transparent',
  },
  votingPlayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  votingPlayerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  votingPlayerInitial: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  votingPlayerName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  votingResultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    gap: 8,
  },
  votingResultsButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
}); 