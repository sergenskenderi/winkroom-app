import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/contexts/I18nContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { fetchCharadesWords } from '@/services/charadesWordsService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Step = 'rules' | 'players' | 'teams' | 'game';
type TeamMode = 'random' | 'custom';

interface CharadesPlayer {
  id: string;
  name: string;
}

const CHARADES_WORDS = [
  'Dancing', 'Swimming', 'Reading', 'Cooking', 'Singing', 'Running', 'Sleeping', 'Fishing',
  'Painting', 'Football', 'Basketball', 'Tennis', 'Elephant', 'Butterfly', 'Airplane', 'Umbrella',
  'Telephone', 'Pizza', 'Birthday', 'Christmas', 'Rainbow', 'Snowman', 'Camping', 'Surfing',
  'Guitar', 'Piano', 'Camera', 'Bridge', 'Mountain', 'Dragon', 'Treasure', 'Pirate',
];

export const options = { headerShown: false };

export default function CharadesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [currentStep, setCurrentStep] = useState<Step>('rules');
  const [words, setWords] = useState<string[]>([]);
  const [players, setPlayers] = useState<CharadesPlayer[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [teamMode, setTeamMode] = useState<TeamMode>('random');
  const [teamNames, setTeamNames] = useState<[string, string]>(['Team 1', 'Team 2']);
  const [playerTeam, setPlayerTeam] = useState<Record<string, 0 | 1>>({});
  const [teamScores, setTeamScores] = useState<[number, number]>([0, 0]);
  const [currentWord, setCurrentWord] = useState('');
  const [isWordRevealed, setIsWordRevealed] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60);
  const [timerRemaining, setTimerRemaining] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [randomSplit, setRandomSplit] = useState<[string[], string[]]>([[], []]);

  useEffect(() => {
    fetchCharadesWords(50, locale).then((list) => {
      if (list.length > 0) setWords(list);
    });
  }, [locale]);

  useEffect(() => {
    if (currentStep === 'teams' && teamMode === 'random' && players.length >= 2) {
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      const mid = Math.ceil(shuffled.length / 2);
      setRandomSplit([shuffled.slice(0, mid).map((p) => p.id), shuffled.slice(mid).map((p) => p.id)]);
    }
  }, [currentStep, teamMode, players.length]);

  const regenerateRandomTeams = () => {
    if (players.length < 2) return;
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const mid = Math.ceil(shuffled.length / 2);
    setRandomSplit([shuffled.slice(0, mid).map((p) => p.id), shuffled.slice(mid).map((p) => p.id)]);
  };

  const team0Players = teamMode === 'random' ? players.filter((p) => randomSplit[0].includes(p.id)) : players.filter((p) => playerTeam[p.id] === 0);
  const team1Players = teamMode === 'random' ? players.filter((p) => randomSplit[1].includes(p.id)) : players.filter((p) => playerTeam[p.id] === 1);

  useEffect(() => {
    if (!isTimerRunning || timerRemaining <= 0 || currentStep !== 'game') return;
    const interval = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(t('games.oneWordUnites.timesUp'), t('games.charades.timesUpMessage'));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, timerRemaining, currentStep, t]);

  const addPlayer = () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    if (players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert(t('games.oneWordUnites.playerExists'), t('games.oneWordUnites.playerExistsMessage'));
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

  const pickWord = () => {
    const list = words.length > 0 ? words : CHARADES_WORDS;
    const word = list[Math.floor(Math.random() * list.length)];
    setCurrentWord(word);
    setIsWordRevealed(false);
  };

  const onWordCardPress = () => {
    if (!currentWord) {
      pickWord();
      setIsWordRevealed(true);
    } else {
      setIsWordRevealed((r) => !r);
    }
  };

  const addScore = (teamIndex: 0 | 1, points: number) => {
    setTeamScores((prev) => {
      const next: [number, number] = [...prev];
      next[teamIndex] = Math.max(0, next[teamIndex] + points);
      return next;
    });
  };

  const startTimer = () => {
    setTimerRemaining(timerDuration);
    setIsTimerRunning(true);
  };
  const pauseTimer = () => setIsTimerRunning(false);
  const resumeTimer = () => setIsTimerRunning(true);
  const resetTimer = () => {
    setTimerRemaining(timerDuration);
    setIsTimerRunning(false);
  };

  const handleBackPress = () => {
    if (currentStep === 'rules') {
      router.back();
      return;
    }
    if (currentStep === 'players') setCurrentStep('rules');
    else if (currentStep === 'teams') setCurrentStep('players');
    else if (currentStep === 'game') setCurrentStep('teams');
  };

  const startGame = () => {
    if (players.length < 2) {
      Alert.alert(t('games.oneWordUnites.notEnoughPlayers'), t('games.charades.addAtLeast2'));
      return;
    }
    if (teamMode === 'custom') {
      const assigned = players.filter((p) => playerTeam[p.id] === 0 || playerTeam[p.id] === 1).length;
      if (assigned < players.length) {
        Alert.alert(t('common.error'), t('games.charades.assignPlayers'));
        return;
      }
      if (team0Players.length === 0 || team1Players.length === 0) {
        Alert.alert(t('common.error'), t('games.charades.bothTeamsRequired'));
        return;
      }
    } else {
      const next: Record<string, 0 | 1> = {};
      randomSplit[0].forEach((id) => { next[id] = 0; });
      randomSplit[1].forEach((id) => { next[id] = 1; });
      setPlayerTeam(next);
    }
    setCurrentStep('game');
  };

  const TIMER_PRESETS = [30, 60, 90, 120];

  const renderRules = () => {
    const cardBg = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
    const border = colorScheme === 'dark' ? '#374151' : '#E5E7EB';
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <Ionicons name="document-text" size={24} color={colors.tint} />
            <ThemedText style={styles.headerTitle}>{t('games.charades.rulesTitle')}</ThemedText>
          </ThemedView>
          <View style={styles.placeholder} />
        </ThemedView>
        <ThemedView style={[styles.rulesCard, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedText style={[styles.rulesCardTitle, { color: colors.text }]}>{t('games.charades.rulesHowToPlay')}</ThemedText>
          <ThemedText style={[styles.rulesText, { color: colors.text }]}>{t('games.charades.rulesIntro')}</ThemedText>
          <ThemedView style={styles.rulesSection}>
            <ThemedText style={[styles.rulesSectionTitle, { color: colors.text }]}>{t('games.charades.rulesBasicsTitle')}</ThemedText>
            <ThemedText style={[styles.rulesText, { color: colors.text }]}>{t('games.charades.rulesBasics')}</ThemedText>
          </ThemedView>
          <ThemedView style={styles.rulesSection}>
            <ThemedText style={[styles.rulesSectionTitle, { color: colors.text }]}>{t('games.charades.rulesTurnTitle')}</ThemedText>
            <ThemedText style={[styles.rulesText, { color: colors.text }]}>{t('games.charades.rulesTurn')}</ThemedText>
          </ThemedView>
        </ThemedView>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.tint }]} onPress={() => setCurrentStep('players')}>
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
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <Ionicons name="people" size={24} color={colors.tint} />
            <ThemedText style={styles.headerTitle}>{t('games.charades.addPlayers')}</ThemedText>
          </ThemedView>
          <View style={styles.placeholder} />
        </ThemedView>
        <ThemedText style={[styles.subtitle, { color: colors.text }]}>{t('games.charades.playersCount', { count: players.length })}</ThemedText>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6', color: colors.text }]}
              placeholder={t('games.charades.enterPlayerName')}
              placeholderTextColor="#9CA3AF"
              value={newPlayerName}
              onChangeText={setNewPlayerName}
              onSubmitEditing={addPlayer}
            />
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={addPlayer}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <ThemedText style={[styles.hint, { color: colors.text }]}>{t('games.charades.addAtLeast2')}</ThemedText>
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
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.tint }]} onPress={() => setCurrentStep('teams')} disabled={players.length < 2}>
          <ThemedText style={styles.primaryButtonText}>{t('common.next')}</ThemedText>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderTeams = () => {
    const cardBg = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
    const border = colorScheme === 'dark' ? '#374151' : '#E5E7EB';
    const isRandom = teamMode === 'random';
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <Ionicons name="people" size={24} color={colors.tint} />
            <ThemedText style={styles.headerTitle}>{t('games.charades.teamSetup')}</ThemedText>
          </ThemedView>
          <View style={styles.placeholder} />
        </ThemedView>
        <ThemedText style={[styles.subtitle, { color: colors.text }]}>{t('games.charades.teamSetupSubtitle')}</ThemedText>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <TouchableOpacity style={[styles.teamModeRow, { backgroundColor: isRandom ? colors.tint + '22' : (colorScheme === 'dark' ? '#374151' : '#F3F4F6'), borderColor: isRandom ? colors.tint : border }]} onPress={() => setTeamMode('random')}>
            <Ionicons name="shuffle" size={24} color={isRandom ? colors.tint : colors.text} />
            <ThemedText style={[styles.teamModeTitle, { color: colors.text }]}>{t('games.charades.randomTeams')}</ThemedText>
            <ThemedText style={[styles.teamModeDesc, { color: colors.text }]}>{t('games.charades.randomTeamsDesc')}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.teamModeRow, { backgroundColor: !isRandom ? colors.tint + '22' : (colorScheme === 'dark' ? '#374151' : '#F3F4F6'), borderColor: !isRandom ? colors.tint : border }]} onPress={() => setTeamMode('custom')}>
            <Ionicons name="create" size={24} color={!isRandom ? colors.tint : colors.text} />
            <ThemedText style={[styles.teamModeTitle, { color: colors.text }]}>{t('games.charades.customTeams')}</ThemedText>
            <ThemedText style={[styles.teamModeDesc, { color: colors.text }]}>{t('games.charades.customTeamsDesc')}</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>{t('games.charades.teamName')}</ThemedText>
          <View style={styles.teamNameRow}>
            <TextInput
              style={[styles.teamNameInput, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6', color: colors.text }]}
              value={teamNames[0]}
              onChangeText={(v) => setTeamNames([v, teamNames[1]])}
              placeholder={t('games.charades.teamOne')}
            />
            <TextInput
              style={[styles.teamNameInput, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6', color: colors.text }]}
              value={teamNames[1]}
              onChangeText={(v) => setTeamNames([teamNames[0], v])}
              placeholder={t('games.charades.teamTwo')}
            />
          </View>
        </ThemedView>
        {teamMode === 'custom' && (
          <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>{t('games.charades.assignPlayers')}</ThemedText>
            {players.map((p) => (
              <View key={p.id} style={styles.teamAssignRow}>
                <ThemedText style={[styles.playerName, { color: colors.text, flex: 1 }]}>{p.name}</ThemedText>
                <TouchableOpacity style={[styles.teamChip, (playerTeam[p.id] ?? -1) === 0 && { backgroundColor: colors.tint }]} onPress={() => setTeamForPlayer(p.id, 0)}>
                  <ThemedText style={[styles.teamChipText, { color: (playerTeam[p.id] ?? -1) === 0 ? '#FFF' : colors.text }]}>{teamNames[0]}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.teamChip, (playerTeam[p.id] ?? -1) === 1 && { backgroundColor: colors.tint }]} onPress={() => setTeamForPlayer(p.id, 1)}>
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
              <ThemedText style={[styles.regenerateButtonText, { color: colors.tint }]}>{t('games.charades.regenerateTeams')}</ThemedText>
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
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.tint }]} onPress={startGame}>
          <ThemedText style={styles.primaryButtonText}>{t('games.oneWordUnites.startGame')}</ThemedText>
          <Ionicons name="play" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderGame = () => {
    const cardBg = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
    const border = colorScheme === 'dark' ? '#374151' : '#E5E7EB';
    const timerProgress = timerDuration > 0 ? (timerRemaining / timerDuration) * 100 : 0;
    const timerColor = timerRemaining <= 10 ? '#EF4444' : timerRemaining <= timerDuration * 0.3 ? '#F59E0B' : '#10B981';
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <ThemedText style={styles.headerTitle}>{t('games.charades.currentWord')}</ThemedText>
          </ThemedView>
          <View style={styles.placeholder} />
        </ThemedView>
        <TouchableOpacity style={[styles.wordCard, { backgroundColor: cardBg, borderColor: border }]} onPress={onWordCardPress} activeOpacity={0.8}>
          <ThemedText style={[styles.wordText, { color: colors.text }]}>
            {!currentWord ? t('games.charades.tapToGetWord') : isWordRevealed ? currentWord : '••••••'}
          </ThemedText>
          <ThemedText style={[styles.hint, { color: colors.text }]}>
            {!currentWord ? '' : isWordRevealed ? t('games.charades.tapToHideBeforePass') : t('games.charades.tapToSeeWord')}
          </ThemedText>
          {currentWord ? (
            <TouchableOpacity style={[styles.nextWordLink, { borderColor: colors.tint }]} onPress={pickWord}>
              <ThemedText style={[styles.nextWordLinkText, { color: colors.tint }]}>{t('games.charades.nextWord')}</ThemedText>
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedView style={styles.cardHeader}>
            <Ionicons name="time" size={24} color={timerColor} />
            <ThemedText style={[styles.cardTitle, { color: timerColor }]}>{t('games.charades.timer')}</ThemedText>
          </ThemedView>
          <View style={styles.timerChipsRow}>
            {TIMER_PRESETS.map((sec) => (
              <TouchableOpacity key={sec} style={[styles.timerChip, { backgroundColor: timerDuration === sec ? colors.tint : (colorScheme === 'dark' ? '#374151' : '#F3F4F6') }]} onPress={() => { setTimerDuration(sec); if (!isTimerRunning) setTimerRemaining(sec); }}>
                <ThemedText style={[styles.timerChipText, { color: timerDuration === sec ? '#FFFFFF' : colors.text }]}>{sec}s</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.timerCustomRow}>
            <TouchableOpacity style={[styles.timerNumBtn, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6' }]} onPress={() => { const next = Math.max(15, timerDuration - 15); setTimerDuration(next); if (!isTimerRunning) setTimerRemaining(next); }}>
              <Ionicons name="remove" size={24} color={colors.text} />
            </TouchableOpacity>
            <ThemedView style={[styles.timerDisplay, styles.timerDisplayLarge]}>
              <ThemedText style={[styles.timerText, { color: timerColor }]} numberOfLines={1} adjustsFontSizeToFit>{timerRemaining}</ThemedText>
              <ThemedText style={[styles.timerSecondsLabel, { color: timerColor }]}>s</ThemedText>
            </ThemedView>
            <TouchableOpacity style={[styles.timerNumBtn, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6' }]} onPress={() => { const next = Math.min(600, timerDuration + 15); setTimerDuration(next); if (!isTimerRunning) setTimerRemaining(next); }}>
              <Ionicons name="add" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={[styles.timerProgressBar, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB' }]}>
            <View style={[styles.timerProgressFill, { backgroundColor: timerColor, width: `${timerProgress}%` }]} />
          </View>
          <View style={styles.timerControls}>
            {isTimerRunning && <TouchableOpacity style={[styles.timerBtn, { backgroundColor: '#F59E0B' }]} onPress={pauseTimer}><Ionicons name="pause" size={20} color="#FFFFFF" /><ThemedText style={styles.timerBtnText}>{t('games.oneWordUnites.pause')}</ThemedText></TouchableOpacity>}
            {!isTimerRunning && timerRemaining < timerDuration && timerRemaining > 0 && <TouchableOpacity style={[styles.timerBtn, { backgroundColor: colors.tint }]} onPress={resumeTimer}><Ionicons name="play" size={20} color="#FFFFFF" /><ThemedText style={styles.timerBtnText}>{t('games.oneWordUnites.resume')}</ThemedText></TouchableOpacity>}
            {!isTimerRunning && <TouchableOpacity style={[styles.timerBtn, { backgroundColor: timerRemaining === 0 ? '#10B981' : colors.tint }]} onPress={timerRemaining === 0 ? resetTimer : startTimer}><Ionicons name={timerRemaining === 0 ? 'refresh' : 'play'} size={20} color="#FFFFFF" /><ThemedText style={styles.timerBtnText}>{timerRemaining === 0 ? t('games.oneWordUnites.reset') : t('games.charades.startTimer')}</ThemedText></TouchableOpacity>}
          </View>
        </ThemedView>
        <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>{t('games.charades.scores')}</ThemedText>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.scoreRow}>
            <ThemedText style={[styles.teamScoreName, { color: colors.text }]}>{teamNames[0]}</ThemedText>
            <View style={styles.scoreControls}>
              <TouchableOpacity style={[styles.scoreMinusBtn, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB' }]} onPress={() => addScore(0, -1)}>
                <Ionicons name="remove" size={24} color={colors.text} />
              </TouchableOpacity>
              <ThemedText style={[styles.teamScoreValue, { color: colors.text }]}>{teamScores[0]}</ThemedText>
              <TouchableOpacity style={[styles.scorePlusBtn, { backgroundColor: colors.tint }]} onPress={() => addScore(0, 1)}>
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.scoreRow, styles.scoreRowBorder]}>
            <ThemedText style={[styles.teamScoreName, { color: colors.text }]}>{teamNames[1]}</ThemedText>
            <View style={styles.scoreControls}>
              <TouchableOpacity style={[styles.scoreMinusBtn, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB' }]} onPress={() => addScore(1, -1)}>
                <Ionicons name="remove" size={24} color={colors.text} />
              </TouchableOpacity>
              <ThemedText style={[styles.teamScoreValue, { color: colors.text }]}>{teamScores[1]}</ThemedText>
              <TouchableOpacity style={[styles.scorePlusBtn, { backgroundColor: colors.tint }]} onPress={() => addScore(1, 1)}>
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </ThemedView>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.tint }]} onPress={() => router.back()}>
          <Ionicons name="game-controller" size={22} color="#FFFFFF" />
          <ThemedText style={styles.primaryButtonText}>{t('games.charades.backToGames')}</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {currentStep === 'rules' && renderRules()}
      {currentStep === 'players' && renderPlayers()}
      {currentStep === 'teams' && renderTeams()}
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
  rulesSection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.25)' },
  rulesSectionTitle: { fontSize: 17, fontWeight: '600', marginBottom: 10 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, marginBottom: 32 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
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
  teamChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#E5E7EB' },
  teamChipText: { fontSize: 14, fontWeight: '600' },
  regenerateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  regenerateButtonText: { fontSize: 16, fontWeight: '600' },
  wordCard: { paddingVertical: 32, paddingHorizontal: 28, borderRadius: 16, borderWidth: 1, marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  wordText: { fontSize: 28, fontWeight: 'bold', lineHeight: 36, marginBottom: 8, textAlign: 'center' },
  nextWordLink: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 2 },
  nextWordLinkText: { fontSize: 15, fontWeight: '600' },
  timerChipsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  timerChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  timerChipText: { fontSize: 15, fontWeight: '600' },
  timerCustomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginVertical: 16, paddingVertical: 8 },
  timerNumBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  timerDisplay: { alignItems: 'center' },
  timerDisplayLarge: { flexDirection: 'row', alignItems: 'center', minWidth: 100, minHeight: 64, justifyContent: 'center' },
  timerText: { fontSize: 48, fontWeight: 'bold', minWidth: 72, lineHeight: 56 },
  timerSecondsLabel: { fontSize: 28, fontWeight: '600', marginLeft: 2, lineHeight: 34 },
  timerProgressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  timerProgressFill: { height: '100%', borderRadius: 4 },
  timerControls: { flexDirection: 'row', justifyContent: 'center', gap: 12, flexWrap: 'wrap' },
  timerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  timerBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  scoreRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.2)' },
  teamScoreName: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  scoreControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreMinusBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  scorePlusBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  teamScoreValue: { fontSize: 22, fontWeight: 'bold', minWidth: 36, textAlign: 'center' },
});
