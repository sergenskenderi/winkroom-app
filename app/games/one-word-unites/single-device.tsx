import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
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
  TouchableOpacity
} from 'react-native';

interface Player {
  id: string;
  name: string;
  word: string;
  isImposter: boolean;
  hasReadWord: boolean;
  points: number;
  roundPoints: number;
}

interface GameSettings {
  rounds: number;
  clueTime: number;
  startingPlayer: string;
}

const SAMPLE_WORDS = [
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
  const [currentStep, setCurrentStep] = useState<'settings' | 'wordAssignment' | 'gameplay' | 'voting' | 'scoring' | 'finalResults'>('settings');
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    rounds: 3,
    clueTime: 10,
    startingPlayer: '',
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentWordPair, setCurrentWordPair] = useState(SAMPLE_WORDS[0]);
  const [showWordModal, setShowWordModal] = useState(false);
  const [currentPlayerName, setCurrentPlayerName] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isWordRevealed, setIsWordRevealed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(gameSettings.clueTime);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasAlarmed, setHasAlarmed] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleBackPress = () => {
    if (currentStep === 'settings') {
      router.back();
    } else {
      // Show confirmation dialog when game is in progress
      Alert.alert(
        'Exit Game?',
        'Are you sure you want to exit? All game progress will be lost.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Exit Game',
            style: 'destructive',
            onPress: () => {
              setCurrentStep('settings');
              // Reset game state
              setCurrentPlayerIndex(0);
              setCurrentRound(1);
              setCurrentWordPair(SAMPLE_WORDS[0]);
                                        setPlayers(players.map(p => ({
                            ...p,
                            word: '',
                            isImposter: false,
                            hasReadWord: false,
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
        Alert.alert('Player Exists', 'A player with this name already exists.');
        return;
      }
      
                        const newPlayer: Player = {
                    id: Date.now().toString(),
                    name: trimmedName,
                    word: '',
                    isImposter: false,
                    hasReadWord: false,
                    points: 0,
                    roundPoints: 0,
                  };
      setPlayers([...players, newPlayer]);
      setNewPlayerName('');
    }
  };

  const removePlayer = (playerId: string) => {
    setPlayers(players.filter(p => p.id !== playerId));
  };

  const startGame = () => {
    if (players.length < 3) {
      Alert.alert('Not Enough Players', 'You need at least 3 players to start the game.');
      return;
    }
    gameSettings.startingPlayer = players[0].name;
    
    // Assign words to players
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const imposterIndex = Math.floor(Math.random() * shuffledPlayers.length);
    
    const updatedPlayers = shuffledPlayers.map((player, index) => ({
      ...player,
      word: index === imposterIndex ? currentWordPair.imposter : currentWordPair.normal,
      isImposter: index === imposterIndex,
    }));
    
    setPlayers(updatedPlayers);
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
            Alert.alert('Time\'s Up!', 'The clue time has ended. Please proceed to the next player.');
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

  const startTimer = () => {
    setTimeRemaining(gameSettings.clueTime);
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
    setTimeRemaining(gameSettings.clueTime);
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
    const updatedPlayers = players.map(p => 
      p.name === currentPlayerName ? { ...p, hasReadWord: true } : p
    );
    setPlayers(updatedPlayers);
    setShowWordModal(false);
    
    // Don't automatically transition - let the proceed button handle it
  };

  const nextPlayer = () => {
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      // Reset timer for next player and start automatically
      setTimeRemaining(gameSettings.clueTime);
      setIsTimerRunning(true);
      setHasAlarmed(false);
    } else {
      // All players have given clues, move to voting
      // Stop the timer when entering voting phase
      setIsTimerRunning(false);
      setHasAlarmed(false);
      setCurrentStep('voting');
    }
  };

  const updatePlayerPoints = (playerId: string, points: number) => {
    setPlayers(players.map(player => 
      player.id === playerId 
        ? { ...player, roundPoints: points }
        : player
    ));
  };

  const saveRoundPoints = () => {
    // Add round points to total points
    const updatedPlayers = players.map(player => ({
      ...player,
      points: player.points + player.roundPoints,
      roundPoints: 0,
    }));
    
    console.log('Saving round points:', updatedPlayers.map(p => ({ name: p.name, points: p.points, roundPoints: p.roundPoints })));
    
    // Use the updated players directly in finishRound to avoid state timing issues
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
      const newWordPair = SAMPLE_WORDS[currentRound % SAMPLE_WORDS.length];
      setCurrentWordPair(newWordPair);
      
      const shuffledPlayers = [...currentPlayers].sort(() => Math.random() - 0.5);
      const imposterIndex = Math.floor(Math.random() * shuffledPlayers.length);
      
      const updatedPlayers = shuffledPlayers.map((player, index) => ({
        ...player,
        word: index === imposterIndex ? newWordPair.imposter : newWordPair.normal,
        isImposter: index === imposterIndex,
        hasReadWord: false,
        roundPoints: 0,
        // Preserve the accumulated points from previous rounds
        points: player.points, // This ensures total points are kept
      }));
      
      console.log('Starting new round. Players with accumulated points:', updatedPlayers.map(p => ({ name: p.name, points: p.points })));
      
      setPlayers(updatedPlayers);
      
      // Reset timer for new round
      setTimeRemaining(gameSettings.clueTime);
      setIsTimerRunning(false);
      setHasAlarmed(false);
      setShowResults(false);
    } else {
      // Game finished - show final results
      setCurrentStep('finalResults');
    }
  };



  const renderSettings = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Game Settings</ThemedText>
        <ThemedView style={styles.placeholder} />
      </ThemedView>

      <ThemedView style={styles.section}>        
        <ThemedView style={styles.settingItem}>
          <ThemedText style={styles.settingLabel}>Number of Rounds</ThemedText>
          <ThemedView style={styles.numberInput}>
            <TouchableOpacity 
              style={styles.numberButton}
              onPress={() => gameSettings.rounds > 3 &&setGameSettings({...gameSettings, rounds: Math.max(1, gameSettings.rounds - 1)})}
            >
              <Ionicons name="remove" size={20} color={colors.tint} />
            </TouchableOpacity>
            <ThemedText style={styles.numberValue}>{gameSettings.rounds}</ThemedText>
            <TouchableOpacity 
              style={styles.numberButton}
              onPress={() => setGameSettings({...gameSettings, rounds: gameSettings.rounds + 1})}
            >
              <Ionicons name="add" size={20} color={colors.tint} />
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.settingItem}>
          <ThemedText style={styles.settingLabel}>Clue Time (seconds)</ThemedText>
          <ThemedView style={styles.numberInput}>
            <TouchableOpacity 
              style={styles.numberButton}
              onPress={() => setGameSettings({...gameSettings, clueTime: Math.max(10, gameSettings.clueTime - 5)})}
            >
              <Ionicons name="remove" size={20} color={colors.tint} />
            </TouchableOpacity>
            <ThemedText style={styles.numberValue}>{gameSettings.clueTime}</ThemedText>
            <TouchableOpacity 
              style={styles.numberButton}
              onPress={() => setGameSettings({...gameSettings, clueTime: gameSettings.clueTime + 5})}
            >
              <Ionicons name="add" size={20} color={colors.tint} />
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>

      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Players</ThemedText>
        
        <ThemedView style={styles.addPlayerContainer}>
          <TextInput
            style={[styles.textInput, { 
              color: colors.text, 
              backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6',
              borderColor: colorScheme === 'dark' ? '#4B5563' : '#D1D5DB',
              flex: 1,
              marginRight: 8
            }]}
            value={newPlayerName}
            onChangeText={setNewPlayerName}
            placeholder="Enter player name"
            placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
            onSubmitEditing={addPlayer}
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: colors.tint }]}
            onPress={addPlayer}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </ThemedView>

        {players.map((player) => (
          <ThemedView key={player.id} style={styles.playerItem}>
            <ThemedText style={[styles.playerName, {color: colorScheme === 'dark' ? '#000' : '#fff'}]}>{player.name}</ThemedText>
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => removePlayer(player.id)}
            >
              <Ionicons name="close" size={20} color="#EF4444" />
            </TouchableOpacity>
          </ThemedView>
        ))}
      </ThemedView>

      <TouchableOpacity 
        style={[styles.startButton, { backgroundColor: colors.tint }]}
        onPress={startGame}
        disabled={players.length < 3 || gameSettings.rounds < 3}
      >
        <ThemedText style={styles.startButtonText}>Start Game</ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderWordAssignment = () => (
    <ThemedView style={styles.content}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Round {currentRound}</ThemedText>
        <ThemedView style={styles.placeholder} />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Word Assignment</ThemedText>
        <ThemedText style={styles.sectionText}>
          Pass the phone to each player. They should read their word and confirm they've seen it.
        </ThemedText>
      </ThemedView>

      {players.map((player) => (
        <TouchableOpacity 
          key={player.id}
          style={[
            styles.playerCard,
            { 
              backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
              borderColor: player.hasReadWord ? '#10B981' : '#E5E7EB'
            }
          ]}
          onPress={() => assignWordToPlayer(player.id)}
          disabled={player.hasReadWord}
        >
          <ThemedView style={styles.playerCardHeader}>
            <ThemedText style={styles.playerCardName}>{player.name}</ThemedText>
            {player.hasReadWord && (
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            )}
          </ThemedView>
          <ThemedText style={styles.playerCardStatus}>
            {player.hasReadWord ? 'Word read ✓' : 'Tap to read word'}
          </ThemedText>
        </TouchableOpacity>
      ))}

      {players.every(p => p.hasReadWord) && (
        <ThemedView style={styles.proceedSection}>
          <ThemedText style={styles.proceedTitle}>All Players Have Read Their Words!</ThemedText>
          <ThemedText style={styles.proceedSubtitle}>
            Everyone is ready to start giving clues. The first player will be randomly selected.
          </ThemedText>
                  <TouchableOpacity 
          style={[styles.proceedButton, { backgroundColor: colors.tint }]}
          onPress={() => {
            setCurrentStep('gameplay');
            // Start timer automatically when entering gameplay
            setTimeRemaining(gameSettings.clueTime);
            setIsTimerRunning(true);
            setHasAlarmed(false);
          }}
        >
          <Ionicons name="play" size={24} color="#FFFFFF" />
          <ThemedText style={styles.proceedButtonText}>Start Clue Guessing</ThemedText>
        </TouchableOpacity>
        </ThemedView>
      )}
    </ThemedView>
  );

  const renderGameplay = () => (
    <ThemedView style={styles.content}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Round {currentRound}</ThemedText>
        <ThemedView style={styles.placeholder} />
      </ThemedView>

      <ThemedView style={styles.gameplaySection}>
        <ThemedText style={styles.currentPlayerTitle}>
          {players[currentPlayerIndex]?.name}'s Turn
        </ThemedText>
        
        <ThemedView style={styles.timerContainer}>
          <ThemedText style={[
            styles.timerText, 
            { color: timeRemaining <= 10 ? '#EF4444' : colors.text }
          ]}>
            Time: {timeRemaining}s
          </ThemedText>
          {isTimerRunning && (
            <TouchableOpacity 
              style={[styles.pauseTimerButton, { backgroundColor: '#F59E0B' }]}
              onPress={pauseTimer}
            >
              <Ionicons name="pause" size={20} color="#FFFFFF" />
              <ThemedText style={styles.pauseTimerButtonText}>Pause Timer</ThemedText>
            </TouchableOpacity>
          )}
          {!isTimerRunning && timeRemaining < gameSettings.clueTime && timeRemaining > 0 && (
            <TouchableOpacity 
              style={[styles.resumeTimerButton, { backgroundColor: colors.tint }]}
              onPress={resumeTimer}
            >
              <Ionicons name="play" size={20} color="#FFFFFF" />
              <ThemedText style={styles.resumeTimerButtonText}>Resume Timer</ThemedText>
            </TouchableOpacity>
          )}
          {timeRemaining === 0 && (
            <TouchableOpacity 
              style={[styles.resetTimerButton, { backgroundColor: '#10B981' }]}
              onPress={resetTimer}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <ThemedText style={styles.resetTimerButtonText}>Reset Timer</ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
        
        <ThemedView style={styles.clueInstructions}>
          <ThemedText style={styles.clueInstructionsText}>
            Give a single-word clue to hint at your word without saying it directly!
          </ThemedText>
        </ThemedView>

        <TouchableOpacity 
          style={[styles.nextButton, { backgroundColor: colors.tint }]}
          onPress={nextPlayer}
        >
          <ThemedText style={styles.nextButtonText}>
            {currentPlayerIndex < players.length - 1 ? 'Next Player' : 'Finish Round'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );

  const renderVoting = () => (
    <ThemedView style={styles.content}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Voting Time!</ThemedText>
        <ThemedView style={styles.placeholder} />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Round {currentRound} Complete</ThemedText>
        <ThemedText style={styles.sectionText}>
          All players have given their clues. Now it's time to discuss and vote on who you think is the imposter!
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Players</ThemedText>
        {players.map((player) => (
          <ThemedView key={player.id} style={styles.playerItem}>
            <ThemedText style={styles.playerName}>{player.name}</ThemedText>
            <ThemedText style={styles.playerWord}>
              Word: {player.word}
            </ThemedText>
          </ThemedView>
        ))}
      </ThemedView>

      <TouchableOpacity 
        style={[styles.nextButton, { backgroundColor: colors.tint }]}
        onPress={() => setShowResults(true)}
      >
        <ThemedText style={styles.nextButtonText}>Show Results</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  const renderScoring = () => (
    <ThemedView style={styles.content}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Round {currentRound} Results</ThemedText>
        <ThemedView style={styles.placeholder} />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Round Summary</ThemedText>
        <ThemedText style={styles.sectionText}>
          The imposter was: {players.find(p => p.isImposter)?.name}
        </ThemedText>
        <ThemedText style={styles.sectionText}>
          Words: {currentWordPair.normal} vs {currentWordPair.imposter}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Manual Scoring</ThemedText>
        <ThemedText style={styles.sectionText}>
          Enter the points each player earned this round:
        </ThemedText>
      </ThemedView>

      <ScrollView style={styles.scoringContainer} showsVerticalScrollIndicator={false}>
        {players.map((player) => (
          <ThemedView key={player.id} style={[styles.scoringItem, { 
            backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6' 
          }]}>
            <ThemedText style={styles.scoringPlayerName}>{player.name}</ThemedText>
            <ThemedView style={styles.pointsInputContainer}>
              <ThemedView style={styles.pointsButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.pointButton,
                    { 
                      backgroundColor: player.roundPoints === 0 ? colors.tint : (colorScheme === 'dark' ? '#374151' : '#F3F4F6'),
                      borderColor: colorScheme === 'dark' ? '#4B5563' : '#D1D5DB',
                    }
                  ]}
                  onPress={() => updatePlayerPoints(player.id, 0)}
                >
                  <ThemedText style={[
                    styles.pointButtonText,
                    { color: player.roundPoints === 0 ? '#FFFFFF' : colors.text }
                  ]}>0</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.pointButton,
                    { 
                      backgroundColor: player.roundPoints === 1 ? colors.tint : (colorScheme === 'dark' ? '#374151' : '#F3F4F6'),
                      borderColor: colorScheme === 'dark' ? '#4B5563' : '#D1D5DB',
                    }
                  ]}
                  onPress={() => updatePlayerPoints(player.id, 1)}
                >
                  <ThemedText style={[
                    styles.pointButtonText,
                    { color: player.roundPoints === 1 ? '#FFFFFF' : colors.text }
                  ]}>1</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.pointButton,
                    { 
                      backgroundColor: player.roundPoints === 2 ? colors.tint : (colorScheme === 'dark' ? '#374151' : '#F3F4F6'),
                      borderColor: colorScheme === 'dark' ? '#4B5563' : '#D1D5DB',
                    }
                  ]}
                  onPress={() => updatePlayerPoints(player.id, 2)}
                >
                  <ThemedText style={[
                    styles.pointButtonText,
                    { color: player.roundPoints === 2 ? '#FFFFFF' : colors.text }
                  ]}>2</ThemedText>
                </TouchableOpacity>
              </ThemedView>
              <ThemedText style={styles.pointsLabel}>points</ThemedText>
            </ThemedView>
          </ThemedView>
        ))}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.nextButton, { backgroundColor: colors.tint }]}
        onPress={saveRoundPoints}
      >
        <ThemedText style={styles.nextButtonText}>Save Points & Continue</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  const renderFinalResults = () => {
    console.log('Final results - Players with total points:', players.map(p => ({ name: p.name, points: p.points })));
    
    return (
    <ThemedView style={styles.content}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Game Complete!</ThemedText>
        <ThemedView style={{ width: 24 }} />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Final Results</ThemedText>
        <ThemedText style={styles.sectionText}>
          Congratulations! You've completed all {gameSettings.rounds} rounds.
        </ThemedText>
      </ThemedView>

      <ScrollView style={styles.scoringContainer} showsVerticalScrollIndicator={false}>
        {players
          .sort((a, b) => b.points - a.points) // Sort by points descending
          .map((player, index) => (
            <ThemedView key={player.id} style={[styles.scoringItem, { 
              backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6' 
            }]}>
              <ThemedView style={styles.finalResultItem}>
                <ThemedText style={[styles.rankText, { color: colorScheme === 'dark' ? '#6366F1' : '#6366F1' }]}>#{index + 1}</ThemedText>
                <ThemedText style={styles.scoringPlayerName}>{player.name}</ThemedText>
                <ThemedText style={[styles.finalPointsText, { color: colorScheme === 'dark' ? '#10B981' : '#10B981' }]}>{player.points} points</ThemedText>
              </ThemedView>
            </ThemedView>
          ))}
      </ScrollView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Winner</ThemedText>
        <ThemedText style={styles.sectionText}>
          🏆 {players.sort((a, b) => b.points - a.points)[0]?.name} wins with {players.sort((a, b) => b.points - a.points)[0]?.points} points!
        </ThemedText>
      </ThemedView>

      <TouchableOpacity 
        style={[styles.startButton, { backgroundColor: colors.tint }]}
        onPress={() => router.back()}
      >
        <ThemedText style={styles.startButtonText}>Back to Games</ThemedText>
      </TouchableOpacity>
    </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {currentStep === 'settings' && renderSettings()}
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
            <ThemedText style={styles.modalSubtitle}>Your word is:</ThemedText>
            
            <TouchableOpacity 
              style={styles.wordContainer}
              onPress={() => setIsWordRevealed(!isWordRevealed)}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.wordText}>
                {isWordRevealed 
                  ? players.find(p => p.name === currentPlayerName)?.word
                  : '*'.repeat(players.find(p => p.name === currentPlayerName)?.word.length || 0)
                }
              </ThemedText>
              <ThemedText style={styles.wordHint}>
                {isWordRevealed ? 'Tap to hide' : 'Tap to reveal'}
              </ThemedText>
            </TouchableOpacity>
            
            <ThemedText style={styles.modalInstructions}>
              Read your word carefully, then tap "I got the word" when ready.
            </ThemedText>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.tint }]}
              onPress={confirmWordRead}
            >
              <ThemedText style={styles.modalButtonText}>I got the word</ThemedText>
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
  settingItem: {
    marginBottom: 16,
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
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
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
    marginTop: 20,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 20,
  },
  gameplaySection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  currentPlayerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 18,
    opacity: 0.7,
    marginBottom: 32,
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
  },
  wordContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    minWidth: 200,
  },
  wordHint: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: 'italic',
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
}); 