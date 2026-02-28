import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/contexts/I18nContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Step = 'rules' | 'players' | 'roleSelection' | 'roleAssignment' | 'done';
type Role = 'town' | 'mafia' | 'detective' | 'doctor' | 'prostitute';

interface MafiaPlayer {
  id: string;
  name: string;
  role: Role;
  hasReadRole: boolean;
  roleViewCount: number;
}

const ROLE_KEYS: Record<Role, string> = {
  town: 'games.mafia.roleTown',
  mafia: 'games.mafia.roleMafia',
  detective: 'games.mafia.roleDetective',
  doctor: 'games.mafia.roleDoctor',
  prostitute: 'games.mafia.roleProstitute',
};

export const options = { headerShown: false };

export default function MafiaRoleAssignmentScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<Step>('rules');
  const [players, setPlayers] = useState<MafiaPlayer[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [includeDoctor, setIncludeDoctor] = useState(false);
  const [includeProstitute, setIncludeProstitute] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [currentPlayerName, setCurrentPlayerName] = useState('');
  const [isRoleRevealed, setIsRoleRevealed] = useState(false);
  const [randomSelectedName, setRandomSelectedName] = useState<string | null>(null);
  const [timerDuration, setTimerDuration] = useState(60);
  const [timerRemaining, setTimerRemaining] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    if (players.length <= 3) {
      setIncludeDoctor(false);
      setIncludeProstitute(false);
    }
  }, [players.length]);

  useEffect(() => {
    if (!isTimerRunning || timerRemaining <= 0 || currentStep !== 'done') return;
    const interval = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(t('games.oneWordUnites.timesUp'), t('games.mafia.timesUpMessage'));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, timerRemaining, currentStep, t]);

  const pickRandomPlayer = () => {
    if (players.length === 0) return;
    const idx = Math.floor(Math.random() * players.length);
    setRandomSelectedName(players[idx].name);
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
    else if (currentStep === 'roleSelection') setCurrentStep('players');
    else if (currentStep === 'roleAssignment' || currentStep === 'done') setCurrentStep('roleSelection');
  };

  const addPlayer = () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    if (players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert(t('games.oneWordUnites.playerExists'), t('games.oneWordUnites.playerExistsMessage'));
      return;
    }
    setPlayers([...players, { id: Date.now().toString(), name: trimmed, role: 'town', hasReadRole: false, roleViewCount: 0 }]);
    setNewPlayerName('');
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter((p) => p.id !== id));
  };

  const assignRoles = () => {
    const n = players.length;
    if (n < 3) {
      Alert.alert(t('games.oneWordUnites.notEnoughPlayers'), t('games.oneWordUnites.need3Players'));
      return;
    }
    const numMafia = Math.max(1, Math.floor(n / 4));
    const pool: Role[] = [];
    for (let i = 0; i < numMafia; i++) pool.push('mafia');
    pool.push('detective');
    if (includeDoctor) pool.push('doctor');
    if (includeProstitute) pool.push('prostitute');
    while (pool.length < n) pool.push('town');
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setPlayers(
      players.map((p, i) => ({
        ...p,
        role: shuffled[i],
        hasReadRole: false,
        roleViewCount: 0,
      }))
    );
    setCurrentStep('roleAssignment');
  };

  const openRoleModal = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    if (player) {
      setCurrentPlayerName(player.name);
      setIsRoleRevealed(false);
      setShowRoleModal(true);
    }
  };

  const confirmRoleRead = () => {
    setPlayers(
      players.map((p) => {
        if (p.name !== currentPlayerName) return p;
        const alreadyRead = p.hasReadRole;
        return {
          ...p,
          hasReadRole: true,
          roleViewCount: alreadyRead ? p.roleViewCount + 1 : 1,
        };
      })
    );
    setShowRoleModal(false);
  };

  const renderRules = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedView style={styles.headerContent}>
          <Ionicons name="information-circle" size={24} color={colors.tint} />
          <ThemedText style={styles.headerTitle}>{t('games.mafia.rulesTitle')}</ThemedText>
        </ThemedView>
        <View style={styles.placeholder} />
      </ThemedView>
      <ThemedView style={[styles.rulesCard, { backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF', borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB' }]}>
        <ThemedView style={styles.rulesCardHeader}>
          <Ionicons name="information-circle" size={24} color={colors.tint} />
          <ThemedText style={[styles.rulesCardTitle, { color: colors.text }]}>{t('games.mafia.rulesHowToPlay')}</ThemedText>
        </ThemedView>
        <ThemedText style={[styles.rulesText, { color: colors.text }]}>{t('games.mafia.rulesIntro')}</ThemedText>
        <ThemedView style={styles.rulesSection}>
          <ThemedText style={[styles.rulesSectionTitle, { color: colors.text }]}>{t('games.mafia.rulesRolesTitle')}</ThemedText>
          <ThemedText style={[styles.rulesText, { color: colors.text }]}>{t('games.mafia.rulesRoles')}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.rulesSection}>
          <ThemedText style={[styles.rulesSectionTitle, { color: colors.text }]}>{t('games.mafia.rulesNightDayTitle')}</ThemedText>
          <ThemedText style={[styles.rulesText, { color: colors.text }]}>{t('games.mafia.rulesNightDay')}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.rulesSection}>
          <ThemedText style={[styles.rulesSectionTitle, { color: colors.text }]}>{t('games.mafia.rulesWinningTitle')}</ThemedText>
          <ThemedText style={[styles.rulesText, { color: colors.text }]}>{t('games.mafia.rulesWinning')}</ThemedText>
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
          <ThemedText style={styles.headerTitle}>{t('games.mafia.addPlayers')}</ThemedText>
        </ThemedView>
        <View style={styles.placeholder} />
      </ThemedView>
      <ThemedView style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF', borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB' }]}>
        <ThemedText style={styles.cardTitle}>{t('games.mafia.playersCount', { count: players.length })}</ThemedText>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6', borderColor: colorScheme === 'dark' ? '#4B5563' : '#D1D5DB' }]}
            value={newPlayerName}
            onChangeText={setNewPlayerName}
            placeholder={t('games.mafia.enterPlayerName')}
            placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
            onSubmitEditing={addPlayer}
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={addPlayer}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {players.length === 0 ? (
          <ThemedText style={[styles.hint, { color: colorScheme === 'dark' ? '#6B7280' : '#9CA3AF' }]}>{t('games.mafia.addAtLeast3')}</ThemedText>
        ) : (
          <View style={styles.playerList}>
            {players.map((p) => (
              <View key={p.id} style={[styles.playerRow, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6' }]}>
                <ThemedText style={[styles.playerName, { color: colors.text }]}>{p.name}</ThemedText>
                <TouchableOpacity onPress={() => removePlayer(p.id)}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ThemedView>
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: players.length >= 3 ? colors.tint : (colorScheme === 'dark' ? '#374151' : '#E5E7EB') }]}
        onPress={() => players.length >= 3 && setCurrentStep('roleSelection')}
        disabled={players.length < 3}
      >
        <ThemedText style={styles.primaryButtonText}>{t('common.next')}</ThemedText>
        <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );

  const renderRoleSelection = () => {
    const cardBg = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
    const border = colorScheme === 'dark' ? '#374151' : '#E5E7EB';
    const checkBg = (v: boolean) => (v ? colors.tint : (colorScheme === 'dark' ? '#374151' : '#F3F4F6'));
    const n = players.length;
    const optionalEnabled = n > 3;
    const onlyOneOptional = n === 4;
    const doctorDisabled = !optionalEnabled || (onlyOneOptional && includeProstitute);
    const prostituteDisabled = !optionalEnabled || (onlyOneOptional && includeDoctor);
    const onDoctorPress = () => {
      if (doctorDisabled) return;
      if (onlyOneOptional) setIncludeProstitute(false);
      setIncludeDoctor(!includeDoctor);
    };
    const onProstitutePress = () => {
      if (prostituteDisabled) return;
      if (onlyOneOptional) setIncludeDoctor(false);
      setIncludeProstitute(!includeProstitute);
    };
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <Ionicons name="shield" size={24} color={colors.tint} />
            <ThemedText style={styles.headerTitle}>{t('games.mafia.roleSelection')}</ThemedText>
          </ThemedView>
          <View style={styles.placeholder} />
        </ThemedView>
        <ThemedText style={[styles.subtitle, { color: colors.text }]}>{t('games.mafia.roleSelectionSubtitle')}</ThemedText>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>{t('games.mafia.alwaysInGame')}</ThemedText>
          <ThemedText style={[styles.roleLabel, { color: colors.text }]}>{t('games.mafia.roleTown')}</ThemedText>
          <ThemedText style={[styles.roleLabel, { color: colors.text }]}>{t('games.mafia.roleMafia')}</ThemedText>
          <ThemedText style={[styles.roleLabel, { color: colors.text }]}>{t('games.mafia.roleDetective')}</ThemedText>
          <ThemedText style={[styles.sectionLabel, { color: colors.text, marginTop: 16 }]}>{t('games.mafia.optionalRoles')}</ThemedText>
          <TouchableOpacity
            style={[styles.checkRow, { backgroundColor: checkBg(includeDoctor) }, doctorDisabled && styles.checkRowDisabled]}
            onPress={onDoctorPress}
            disabled={doctorDisabled}
            activeOpacity={doctorDisabled ? 1 : 0.7}
          >
            <Ionicons name={includeDoctor ? 'checkbox' : 'square-outline'} size={24} color={includeDoctor ? '#FFF' : (doctorDisabled ? '#9CA3AF' : colors.text)} />
            <ThemedText style={[styles.checkRowLabel, doctorDisabled && { color: '#9CA3AF', opacity: 0.8 }]}>{t('games.mafia.roleDoctor')}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.checkRow, { backgroundColor: checkBg(includeProstitute) }, prostituteDisabled && styles.checkRowDisabled]}
            onPress={onProstitutePress}
            disabled={prostituteDisabled}
            activeOpacity={prostituteDisabled ? 1 : 0.7}
          >
            <Ionicons name={includeProstitute ? 'checkbox' : 'square-outline'} size={24} color={includeProstitute ? '#FFF' : (prostituteDisabled ? '#9CA3AF' : colors.text)} />
            <ThemedText style={[styles.checkRowLabel, prostituteDisabled && { color: '#9CA3AF', opacity: 0.8 }]}>{t('games.mafia.roleProstitute')}</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.tint }]} onPress={assignRoles}>
          <ThemedText style={styles.primaryButtonText}>{t('common.next')}</ThemedText>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderRoleAssignment = () => {
    const cardBg = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
    const border = colorScheme === 'dark' ? '#374151' : '#E5E7EB';
    const allReady = players.every((p) => p.hasReadRole);
    return (
      <ThemedView style={styles.content}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedView style={styles.headerContent}>
            <Ionicons name="document-text" size={24} color={colors.tint} />
            <ThemedText style={styles.headerTitle}>{t('games.mafia.assignRoles')}</ThemedText>
          </ThemedView>
          <View style={styles.placeholder} />
        </ThemedView>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {!allReady && (
            <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <ThemedText style={[styles.instructionsText, { color: colors.text }]}>{t('games.mafia.assignRolesSubtitle')}</ThemedText>
            </ThemedView>
          )}
          <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <ThemedText style={styles.cardTitle}>
              {t('games.oneWordUnites.playersReadyTotal', { ready: players.filter((p) => p.hasReadRole).length, total: players.length })}
            </ThemedText>
            <View style={styles.playersGrid}>
              {players.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.playerCard,
                    {
                      backgroundColor: p.hasReadRole ? (colorScheme === 'dark' ? '#065F46' : '#D1FAE5') : (colorScheme === 'dark' ? '#374151' : '#F3F4F6'),
                      borderColor: p.hasReadRole ? '#10B981' : border,
                    },
                  ]}
                  onPress={() => openRoleModal(p.id)}
                >
                  <View style={[styles.playerCardAvatar, { backgroundColor: p.hasReadRole ? '#10B981' : colors.tint }]}>
                    <ThemedText style={styles.playerCardInitial}>{p.name.charAt(0).toUpperCase()}</ThemedText>
                  </View>
                  <ThemedText style={[styles.playerCardName, { color: colors.text }]} numberOfLines={1}>{p.name}</ThemedText>
                  <ThemedText style={[styles.playerCardStatus, { color: p.hasReadRole ? '#10B981' : (colorScheme === 'dark' ? '#9CA3AF' : '#6B7280') }]}>
                    {p.hasReadRole
                      ? (p.roleViewCount > 1 ? t('games.oneWordUnites.wordReadCount', { count: p.roleViewCount }) : t('games.mafia.roleRead'))
                      : t('games.mafia.tapToReadRole')}
                  </ThemedText>
                  {p.hasReadRole && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                </TouchableOpacity>
              ))}
            </View>
          </ThemedView>
          {allReady && (
            <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              <ThemedText style={[styles.readyTitle, { color: colors.text }]}>{t('games.mafia.allReady')}</ThemedText>
              <ThemedText style={[styles.readySubtitle, { color: colors.text }]}>{t('games.mafia.allReadySubtitle')}</ThemedText>
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.tint }]} onPress={() => setCurrentStep('done')}>
                <ThemedText style={styles.primaryButtonText}>{t('common.done')}</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}
        </ScrollView>
      </ThemedView>
    );
  };

  const renderDone = () => {
    const cardBg = colorScheme === 'dark' ? '#1F2937' : '#FFFFFF';
    const border = colorScheme === 'dark' ? '#374151' : '#E5E7EB';
    const timerProgress = timerDuration > 0 ? (timerRemaining / timerDuration) * 100 : 0;
    const timerColor = timerRemaining <= 10 ? '#EF4444' : timerRemaining <= timerDuration * 0.3 ? '#F59E0B' : '#10B981';
    const TIMER_PRESETS = [30, 60, 90, 120];
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <Ionicons name="checkmark-done" size={48} color="#10B981" />
          <ThemedText style={[styles.doneTitle, { color: colors.text }]}>{t('games.mafia.rolesAssigned')}</ThemedText>
          <ThemedText style={[styles.doneSubtitle, { color: colors.text }]}>{t('games.mafia.rolesAssignedSubtitle')}</ThemedText>
        </ThemedView>
        <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>{t('games.mafia.gameActions')}</ThemedText>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedView style={styles.cardHeader}>
            <Ionicons name="shuffle" size={24} color={colors.tint} />
            <ThemedText style={[styles.cardHeaderTitle, { color: colors.text }]}>{t('games.mafia.randomSelector')}</ThemedText>
          </ThemedView>
          <ThemedText style={[styles.hint, { color: colors.text }]}>{t('games.mafia.tapToPickRandom')}</ThemedText>
          <TouchableOpacity
            style={[styles.randomButton, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6' }]}
            onPress={pickRandomPlayer}
            disabled={players.length === 0}
          >
            <ThemedText style={[styles.randomButtonLabel, { color: colors.text }]}>
              {randomSelectedName ? t('games.mafia.selectedPlayer') : '—'}
            </ThemedText>
            <ThemedText style={[styles.randomButtonName, { color: colors.text }]}>
              {randomSelectedName ?? (players.length === 0 ? '' : '...')}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <ThemedView style={styles.cardHeader}>
            <Ionicons name="time" size={24} color={timerColor} />
            <ThemedText style={[styles.cardHeaderTitle, { color: timerColor }]}>{t('games.mafia.timer')}</ThemedText>
          </ThemedView>
          <ThemedText style={[styles.hint, { color: colors.text, marginBottom: 12 }]}>{t('games.mafia.setTime')}</ThemedText>
          <View style={styles.timerChipsRow}>
            {TIMER_PRESETS.map((sec) => (
              <TouchableOpacity
                key={sec}
                style={[styles.timerChip, { backgroundColor: timerDuration === sec ? colors.tint : (colorScheme === 'dark' ? '#374151' : '#F3F4F6') }]}
                onPress={() => { setTimerDuration(sec); if (!isTimerRunning) setTimerRemaining(sec); }}
              >
                <ThemedText style={[styles.timerChipText, { color: timerDuration === sec ? '#FFFFFF' : colors.text }]}>{sec}s</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.timerCustomRow}>
            <TouchableOpacity
              style={[styles.timerNumBtn, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6' }]}
              onPress={() => {
                const next = Math.max(15, timerDuration - 15);
                setTimerDuration(next);
                if (!isTimerRunning) setTimerRemaining(next);
              }}
            >
              <Ionicons name="remove" size={24} color={colors.text} />
            </TouchableOpacity>
            <ThemedView style={[styles.timerDisplay, styles.timerDisplayLarge]}>
              <ThemedText style={[styles.timerText, { color: timerColor }]} numberOfLines={1} adjustsFontSizeToFit>
                {timerRemaining}
              </ThemedText>
              <ThemedText style={[styles.timerSecondsLabel, { color: timerColor }]}>s</ThemedText>
            </ThemedView>
            <TouchableOpacity
              style={[styles.timerNumBtn, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6' }]}
              onPress={() => {
                const next = Math.min(600, timerDuration + 15);
                setTimerDuration(next);
                if (!isTimerRunning) setTimerRemaining(next);
              }}
            >
              <Ionicons name="add" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={[styles.timerProgressBar, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB' }]}>
            <View style={[styles.timerProgressFill, { backgroundColor: timerColor, width: `${timerProgress}%` }]} />
          </View>
          <View style={styles.timerControls}>
            {isTimerRunning && (
              <TouchableOpacity style={[styles.timerBtn, { backgroundColor: '#F59E0B' }]} onPress={pauseTimer}>
                <Ionicons name="pause" size={20} color="#FFFFFF" />
                <ThemedText style={styles.timerBtnText}>{t('games.oneWordUnites.pause')}</ThemedText>
              </TouchableOpacity>
            )}
            {!isTimerRunning && timerRemaining < timerDuration && timerRemaining > 0 && (
              <TouchableOpacity style={[styles.timerBtn, { backgroundColor: colors.tint }]} onPress={resumeTimer}>
                <Ionicons name="play" size={20} color="#FFFFFF" />
                <ThemedText style={styles.timerBtnText}>{t('games.oneWordUnites.resume')}</ThemedText>
              </TouchableOpacity>
            )}
            {!isTimerRunning && (
              <TouchableOpacity
                style={[styles.timerBtn, { backgroundColor: timerRemaining === 0 ? '#10B981' : colors.tint }]}
                onPress={timerRemaining === 0 ? resetTimer : startTimer}
              >
                <Ionicons name={timerRemaining === 0 ? 'refresh' : 'play'} size={20} color="#FFFFFF" />
                <ThemedText style={styles.timerBtnText}>
                  {timerRemaining === 0 ? t('games.oneWordUnites.reset') : t('games.mafia.startTimer')}
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </ThemedView>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.tint }]} onPress={() => router.back()}>
          <Ionicons name="game-controller" size={22} color="#FFFFFF" />
          <ThemedText style={styles.primaryButtonText}>{t('games.mafia.backToGames')}</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const currentPlayer = players.find((p) => p.name === currentPlayerName);

  return (
    <ThemedView style={styles.container}>
      {currentStep === 'rules' && renderRules()}
      {currentStep === 'players' && renderPlayers()}
      {currentStep === 'roleSelection' && renderRoleSelection()}
      {currentStep === 'roleAssignment' && renderRoleAssignment()}
      {currentStep === 'done' && renderDone()}

      <Modal visible={showRoleModal} transparent animationType="fade">
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF' }]}>
            <ThemedText style={styles.modalTitle}>{currentPlayerName}</ThemedText>
            <ThemedText style={styles.modalSubtitle}>{t('games.mafia.yourRoleIs')}</ThemedText>
            <TouchableOpacity style={styles.roleRevealBox} onPress={() => setIsRoleRevealed(!isRoleRevealed)}>
              <ThemedText style={styles.roleRevealText}>
                {isRoleRevealed && currentPlayer ? t(ROLE_KEYS[currentPlayer.role]) : '••••••'}
              </ThemedText>
              <ThemedText style={styles.roleRevealHint}>{isRoleRevealed ? t('games.oneWordUnites.tapToHide') : t('games.oneWordUnites.tapToReveal')}</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.modalHint}>
              {currentPlayer?.hasReadRole ? t('games.oneWordUnites.viewingAgain') : t('games.mafia.readThenConfirm')}
            </ThemedText>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.tint }]} onPress={confirmRoleRead}>
              <ThemedText style={styles.primaryButtonText}>
                {currentPlayer?.hasReadRole ? t('common.done') : t('games.mafia.gotTheRole')}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  content: { flex: 1, paddingHorizontal: 16 },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backButton: { padding: 8 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  placeholder: { width: 40 },
  rulesCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  rulesCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, backgroundColor: 'transparent' },
  rulesCardTitle: { fontSize: 18, fontWeight: 'bold' },
  rulesText: { fontSize: 15, lineHeight: 22, opacity: 0.95 },
  rulesSection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.25)', backgroundColor: 'transparent' },
  rulesSectionTitle: { fontSize: 17, fontWeight: '600', marginBottom: 10 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, marginBottom: 32 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 15, textAlign: 'center', marginTop: 8 },
  playerList: { gap: 8 },
  playerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  playerName: { fontSize: 16, fontWeight: '500' },
  subtitle: { fontSize: 15, marginBottom: 20, opacity: 0.8 },
  sectionLabel: { fontSize: 14, fontWeight: '600', opacity: 0.8, marginBottom: 8 },
  roleLabel: { fontSize: 16, marginBottom: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 8 },
  checkRowLabel: { fontSize: 16, lineHeight: 24, flex: 1, marginBottom: 0 },
  checkRowDisabled: { opacity: 0.6 },
  instructionsText: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  playersGrid: { gap: 12 },
  playerCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1 },
  playerCardAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  playerCardInitial: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  playerCardName: { flex: 1, fontSize: 16, fontWeight: '600' },
  playerCardStatus: { fontSize: 13, marginRight: 8 },
  readyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 12 },
  readySubtitle: { fontSize: 15, marginTop: 8, marginBottom: 20 },
  doneTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 16 },
  doneSubtitle: { fontSize: 15, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', maxWidth: 340, borderRadius: 20, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  modalSubtitle: { fontSize: 16, marginBottom: 16 },
  roleRevealBox: { width: '100%', padding: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', marginBottom: 16 },
  roleRevealText: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  roleRevealHint: { fontSize: 13, opacity: 0.7 },
  modalHint: { fontSize: 14, marginBottom: 20, textAlign: 'center' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, backgroundColor: 'transparent' },
  cardHeaderTitle: { fontSize: 18, fontWeight: 'bold' },
  randomButton: { padding: 20, borderRadius: 12, alignItems: 'center' },
  randomButtonLabel: { fontSize: 14, opacity: 0.8, marginBottom: 4 },
  randomButtonName: { fontSize: 22, fontWeight: 'bold' },
  timerChipsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  timerChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  timerChipText: { fontSize: 15, fontWeight: '600' },
  timerCustomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginVertical: 16, paddingVertical: 8 },
  timerNumBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  timerDisplay: { alignItems: 'center', backgroundColor: 'transparent' },
  timerDisplayLarge: { flexDirection: 'row', alignItems: 'center', minWidth: 100, minHeight: 64, justifyContent: 'center', backgroundColor: 'transparent' },
  timerText: { fontSize: 48, fontWeight: 'bold', minWidth: 72, lineHeight: 56 },
  timerSecondsLabel: { fontSize: 28, fontWeight: '600', marginLeft: 2, lineHeight: 34 },
  timerProgressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  timerProgressFill: { height: '100%', borderRadius: 4 },
  timerControls: { flexDirection: 'row', justifyContent: 'center', gap: 12, flexWrap: 'wrap' },
  timerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  timerBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
