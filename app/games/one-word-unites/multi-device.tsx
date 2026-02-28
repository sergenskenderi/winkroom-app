import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/contexts/I18nContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { fetchWordPairs } from '@/services/wordsService';
import { Ionicons } from '@expo/vector-icons';
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

interface Player {
  id: string;
  name: string;
  word: string;
  isImposter: boolean;
  isReady: boolean;
  hasVoted: boolean;
  voteFor?: string;
  score: number;
  position: number;
}

interface GameSettings {
  rounds: number;
  clueTime: number;
  votingTime: number;
  startingPlayer: string;
}

interface GameState {
  currentStep: 'lobby' | 'wordAssignment' | 'cluePhase' | 'votingPhase' | 'results';
  currentRound: number;
  currentPlayerIndex: number;
  timeRemaining: number;
  isHost: boolean;
  gameId: string;
}

const FALLBACK_WORDS = [
  { normal: 'Pizza', imposter: 'Burger' },
  { normal: 'Ocean', imposter: 'Mountain' },
  { normal: 'Coffee', imposter: 'Tea' },
  { normal: 'Summer', imposter: 'Winter' },
  { normal: 'Music', imposter: 'Art' },
  { normal: 'Sun', imposter: 'Moon' },
  { normal: 'Book', imposter: 'Movie' },
  { normal: 'Cat', imposter: 'Dog' },
];

export default function MultiDeviceGameScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { locale } = useTranslation();
  const [wordPairs, setWordPairs] = useState<{ normal: string; imposter: string }[]>(FALLBACK_WORDS);
  const [gameState, setGameState] = useState<GameState>({
    currentStep: 'lobby',
    currentRound: 1,
    currentPlayerIndex: 0,
    timeRemaining: 30,
    isHost: true, // For demo purposes, assume current user is host
    gameId: '',
  });
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    rounds: 3,
    clueTime: 30,
    votingTime: 60,
    startingPlayer: '',
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentWordPair, setCurrentWordPair] = useState(FALLBACK_WORDS[0]);
  const [showWordModal, setShowWordModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [gameCode, setGameCode] = useState('ABC123'); // Demo game code
  const [isWordRevealed, setIsWordRevealed] = useState(false);

  useEffect(() => {
    // Simulate real-time updates
    if (gameState.currentStep === 'cluePhase' && gameState.timeRemaining > 0) {
      const timer = setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1
        }));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentStep, gameState.timeRemaining]);

  const handleBackPress = () => {
    if (gameState.currentStep === 'lobby') {
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
              setGameState(prev => ({ 
                ...prev, 
                currentStep: 'lobby',
                currentRound: 1,
                currentPlayerIndex: 0,
                timeRemaining: 30
              }));
              // Reset players
              setPlayers(players.map(p => ({
                ...p,
                word: '',
                isImposter: false,
                isReady: false,
                hasVoted: false,
                voteFor: undefined,
              })));
            },
          },
        ]
      );
    }
  };

  const generateGameCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createGame = () => {
    if (!gameSettings.startingPlayer) {
      Alert.alert('Missing Starting Player', 'Please select who will start giving clues.');
      return;
    }
    
    const newGameCode = generateGameCode();
    setGameCode(newGameCode);
    setGameState(prev => ({ 
      ...prev, 
      gameId: newGameCode,
      currentStep: 'lobby' 
    }));
    
    Alert.alert('Game Created!', `Share this code with players: ${newGameCode}`);
  };

  const joinGame = () => {
    if (!playerName.trim()) {
      Alert.alert('Missing Name', 'Please enter your name to join the game.');
      return;
    }
    
    // Simulate joining a game
    const newPlayer: Player = {
      id: Date.now().toString(),
      name: playerName.trim(),
      word: '',
      isImposter: false,
      isReady: false,
      hasVoted: false,
      score: 0,
      position: players.length,
    };
    
    setPlayers([...players, newPlayer]);
    setIsJoined(true);
    setGameState(prev => ({ ...prev, isHost: false }));
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
        isReady: false,
        hasVoted: false,
        score: 0,
        position: players.length,
      };
      setPlayers([...players, newPlayer]);
      setNewPlayerName('');
    }
  };

  const removePlayer = (playerId: string) => {
    setPlayers(players.filter(p => p.id !== playerId));
  };

  const togglePlayerReady = (playerId: string) => {
    setPlayers(players.map(p => 
      p.id === playerId ? { ...p, isReady: !p.isReady } : p
    ));
  };

  const startGame = async () => {
    if (players.length < 3) {
      Alert.alert('Not Enough Players', 'You need at least 3 players to start the game.');
      return;
    }
    if (!players.every(p => p.isReady)) {
      Alert.alert('Not All Players Ready', 'All players must be ready to start the game.');
      return;
    }
    let pairs = FALLBACK_WORDS;
    try {
      const fetched = await fetchWordPairs(gameSettings.rounds, locale);
      if (fetched.length > 0) {
        pairs = fetched;
        setWordPairs(fetched);
      }
    } catch {
      setWordPairs(FALLBACK_WORDS);
    }
    const firstPair = pairs[0];
    setCurrentWordPair(firstPair);
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const imposterIndex = Math.floor(Math.random() * shuffledPlayers.length);
    const updatedPlayers = shuffledPlayers.map((player, index) => ({
      ...player,
      word: index === imposterIndex ? firstPair.imposter : firstPair.normal,
      isImposter: index === imposterIndex,
      position: index,
    }));
    setPlayers(updatedPlayers);
    setGameState(prev => ({
      ...prev,
      currentStep: 'wordAssignment',
      timeRemaining: gameSettings.clueTime,
    }));
  };

  const showMyWord = () => {
    setIsWordRevealed(false); // Reset word visibility
    setShowWordModal(true);
  };

  const confirmWordRead = () => {
    setShowWordModal(false);
    // Mark player as ready for clue phase
    setGameState(prev => ({ ...prev, currentStep: 'cluePhase' }));
  };

  const nextPlayer = () => {
    if (gameState.currentPlayerIndex < players.length - 1) {
      setGameState(prev => ({
        ...prev,
        currentPlayerIndex: prev.currentPlayerIndex + 1,
        timeRemaining: gameSettings.clueTime
      }));
    } else {
      // All players have given clues, move to voting
      setGameState(prev => ({ 
        ...prev, 
        currentStep: 'votingPhase',
        timeRemaining: gameSettings.votingTime 
      }));
    }
  };

  const showVoting = () => {
    setShowVoteModal(true);
  };

  const submitVote = (votedFor: string) => {
    setPlayers(players.map(p => 
      p.id === players.find(p => p.name === playerName)?.id 
        ? { ...p, hasVoted: true, voteFor: votedFor }
        : p
    ));
    setShowVoteModal(false);
  };

  const finishVoting = () => {
    // Calculate scores
    const imposter = players.find(p => p.isImposter);
    const updatedPlayers = players.map(player => {
      let scoreChange = 0;
      
      if (player.isImposter) {
        // Imposter gets 3 points if they fooled everyone
        const votesForImposter = players.filter(p => p.voteFor === player.name).length;
        if (votesForImposter === 0) {
          scoreChange = 3; // Fooled everyone
        }
      } else {
        // Regular players get 1 point if they guessed correctly
        if (player.voteFor === imposter?.name) {
          scoreChange = 1;
        }
      }
      
      return { ...player, score: player.score + scoreChange };
    });
    
    setPlayers(updatedPlayers);
    setGameState(prev => ({ ...prev, currentStep: 'results' }));
  };

  const nextRound = () => {
    if (gameState.currentRound < gameSettings.rounds) {
      setGameState(prev => ({
        ...prev,
        currentRound: prev.currentRound + 1,
        currentPlayerIndex: 0,
        currentStep: 'wordAssignment',
        timeRemaining: gameSettings.clueTime
      }));
      
      const newWordPair = wordPairs[gameState.currentRound % wordPairs.length];
      setCurrentWordPair(newWordPair);
      
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      const imposterIndex = Math.floor(Math.random() * shuffledPlayers.length);
      
      const updatedPlayers = shuffledPlayers.map((player, index) => ({
        ...player,
        word: index === imposterIndex ? newWordPair.imposter : newWordPair.normal,
        isImposter: index === imposterIndex,
        isReady: false,
        hasVoted: false,
        voteFor: undefined,
        position: index,
      }));
      
      setPlayers(updatedPlayers);
    } else {
      // Game finished
      Alert.alert('Game Complete!', 'All rounds have been completed. Great game!');
      router.back();
    }
  };

  const renderLobby = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Multi-Device Game</ThemedText>
        <ThemedView style={styles.placeholder} />
      </ThemedView>

      {gameState.isHost ? (
        // Host View
        <>
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Game Settings</ThemedText>
            
            <ThemedView style={styles.settingItem}>
              <ThemedText style={styles.settingLabel}>Number of Rounds</ThemedText>
              <ThemedView style={styles.numberInput}>
                <TouchableOpacity 
                  style={styles.numberButton}
                  onPress={() => setGameSettings({...gameSettings, rounds: Math.max(1, gameSettings.rounds - 1)})}
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

            <ThemedView style={styles.settingItem}>
              <ThemedText style={styles.settingLabel}>Voting Time (seconds)</ThemedText>
              <ThemedView style={styles.numberInput}>
                <TouchableOpacity 
                  style={styles.numberButton}
                  onPress={() => setGameSettings({...gameSettings, votingTime: Math.max(30, gameSettings.votingTime - 10)})}
                >
                  <Ionicons name="remove" size={20} color={colors.tint} />
                </TouchableOpacity>
                <ThemedText style={styles.numberValue}>{gameSettings.votingTime}</ThemedText>
                <TouchableOpacity 
                  style={styles.numberButton}
                  onPress={() => setGameSettings({...gameSettings, votingTime: gameSettings.votingTime + 10})}
                >
                  <Ionicons name="add" size={20} color={colors.tint} />
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.settingItem}>
              <ThemedText style={styles.settingLabel}>Starting Player</ThemedText>
              <TextInput
                style={[styles.textInput, { 
                  color: colors.text, 
                  backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6',
                  borderColor: colorScheme === 'dark' ? '#4B5563' : '#D1D5DB'
                }]}
                value={gameSettings.startingPlayer}
                onChangeText={(text) => setGameSettings({...gameSettings, startingPlayer: text})}
                placeholder="Enter player name"
                placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
              />
            </ThemedView>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Game Code</ThemedText>
            <ThemedView style={styles.gameCodeContainer}>
              <ThemedText style={styles.gameCode}>{gameCode}</ThemedText>
              <TouchableOpacity 
                style={[styles.copyButton, { backgroundColor: colors.tint }]}
                onPress={() => Alert.alert('Copied!', 'Game code copied to clipboard')}
              >
                <Ionicons name="copy" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </ThemedView>
            <ThemedText style={styles.gameCodeInstructions}>
              Share this code with other players to join the game
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Players</ThemedText>
            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6', color: colors.text }]}
                placeholder="Enter player name"
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
            {players.map((player) => (
              <View key={player.id} style={[styles.playerRow, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6' }]}>
                <ThemedView style={styles.playerInfo}>
                  <ThemedText style={[styles.playerName, { color: colors.text }]}>{player.name}</ThemedText>
                  <ThemedText style={[styles.playerStatus, { color: colors.text }]}>
                    {player.isReady ? 'Ready ✓' : 'Not Ready'}
                  </ThemedText>
                </ThemedView>
                <TouchableOpacity onPress={() => removePlayer(player.id)} hitSlop={12}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ThemedView>

          <TouchableOpacity 
            style={[styles.startButton, { backgroundColor: colors.tint }]}
            onPress={startGame}
          >
            <ThemedText style={styles.startButtonText}>Start Game</ThemedText>
          </TouchableOpacity>
        </>
      ) : (
        // Player View
        <>
          <ThemedView style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Join Game</ThemedText>
            <ThemedText style={styles.sectionText}>
              Enter your name to join the game
            </ThemedText>
            
            <TextInput
              style={[styles.textInput, { 
                color: colors.text, 
                backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6',
                borderColor: colorScheme === 'dark' ? '#4B5563' : '#D1D5DB',
                marginBottom: 16
              }]}
              value={playerName}
              onChangeText={setPlayerName}
              placeholder="Your name"
              placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
            />
            
            <TouchableOpacity 
              style={[styles.joinButton, { backgroundColor: colors.tint }]}
              onPress={joinGame}
            >
              <ThemedText style={styles.joinButtonText}>Join Game</ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {isJoined && (
            <ThemedView style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Waiting for Host</ThemedText>
              <ThemedText style={styles.sectionText}>
                The host will start the game when all players are ready.
              </ThemedText>
            </ThemedView>
          )}
        </>
      )}
    </ScrollView>
  );

  const renderWordAssignment = () => (
    <ThemedView style={styles.content}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Round {gameState.currentRound}</ThemedText>
        <ThemedView style={styles.placeholder} />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Get Your Word</ThemedText>
        <ThemedText style={styles.sectionText}>
          Tap the button below to reveal your secret word. Keep it to yourself!
        </ThemedText>
      </ThemedView>

      <TouchableOpacity 
        style={[styles.wordButton, { backgroundColor: colors.tint }]}
        onPress={showMyWord}
      >
        <Ionicons name="eye" size={32} color="#FFFFFF" />
        <ThemedText style={styles.wordButtonText}>Show My Word</ThemedText>
      </TouchableOpacity>

              <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Players</ThemedText>
          {players.map((player) => (
            <ThemedView key={player.id} style={styles.playerItem}>
              <ThemedView style={styles.playerInfo}>
                <ThemedText style={styles.playerName}>{player.name}</ThemedText>
                <ThemedText style={styles.playerStatus}>
                  {player.isReady ? 'Ready ✓' : 'Getting word...'}
                </ThemedText>
              </ThemedView>
            </ThemedView>
          ))}
        </ThemedView>

        {players.every(p => p.isReady) && (
          <ThemedView style={styles.proceedSection}>
            <ThemedText style={styles.proceedTitle}>All Players Are Ready!</ThemedText>
            <ThemedText style={styles.proceedSubtitle}>
              Everyone has read their words. The host will start the clue phase.
            </ThemedText>
          </ThemedView>
        )}
    </ThemedView>
  );

  const renderCluePhase = () => (
    <ThemedView style={styles.content}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Round {gameState.currentRound}</ThemedText>
        <ThemedView style={styles.placeholder} />
      </ThemedView>

      <ThemedView style={styles.gameplaySection}>
        <ThemedText style={styles.currentPlayerTitle}>
          {players[gameState.currentPlayerIndex]?.name}'s Turn
        </ThemedText>
        <ThemedText style={styles.timerText}>
          Time: {gameState.timeRemaining}s
        </ThemedText>
        
        <ThemedView style={styles.clueInstructions}>
          <ThemedText style={styles.clueInstructionsText}>
            Give a single-word clue to hint at your word without saying it directly!
          </ThemedText>
        </ThemedView>

        {gameState.isHost && (
          <TouchableOpacity 
            style={[styles.nextButton, { backgroundColor: colors.tint }]}
            onPress={nextPlayer}
          >
            <ThemedText style={styles.nextButtonText}>
              {gameState.currentPlayerIndex < players.length - 1 ? 'Next Player' : 'Start Voting'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>
    </ThemedView>
  );

  const renderVotingPhase = () => (
    <ThemedView style={styles.content}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Voting Time</ThemedText>
        <ThemedView style={styles.placeholder} />
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Vote for the Imposter</ThemedText>
        <ThemedText style={styles.sectionText}>
          Who do you think is the imposter? Tap on a player to vote.
        </ThemedText>
        <ThemedText style={styles.timerText}>
          Time remaining: {gameState.timeRemaining}s
        </ThemedText>
      </ThemedView>

      <TouchableOpacity 
        style={[styles.voteButton, { backgroundColor: colors.tint }]}
        onPress={showVoting}
      >
        <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
        <ThemedText style={styles.voteButtonText}>Vote Now</ThemedText>
      </TouchableOpacity>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Voting Status</ThemedText>
        {players.map((player) => (
          <ThemedView key={player.id} style={styles.playerItem}>
            <ThemedView style={styles.playerInfo}>
              <ThemedText style={styles.playerName}>{player.name}</ThemedText>
              <ThemedText style={styles.playerStatus}>
                {player.hasVoted ? 'Voted ✓' : 'Waiting...'}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        ))}
      </ThemedView>

      {gameState.isHost && players.every(p => p.hasVoted) && (
        <TouchableOpacity 
          style={[styles.nextButton, { backgroundColor: colors.tint }]}
          onPress={finishVoting}
        >
          <ThemedText style={styles.nextButtonText}>Show Results</ThemedText>
        </TouchableOpacity>
      )}
    </ThemedView>
  );

  const renderResults = () => (
    <ThemedView style={styles.content}>
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Round {gameState.currentRound} Results</ThemedText>
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
        <ThemedText style={styles.sectionTitle}>Voting Results</ThemedText>
        {players.map((player) => (
          <ThemedView key={player.id} style={styles.playerItem}>
            <ThemedView style={styles.playerInfo}>
              <ThemedText style={styles.playerName}>{player.name}</ThemedText>
              <ThemedText style={styles.playerStatus}>
                Voted for: {player.voteFor || 'No vote'}
              </ThemedText>
            </ThemedView>
            <ThemedText style={styles.playerScore}>
              +{player.score - (players.find(p => p.id === player.id)?.score || 0)} pts
            </ThemedText>
          </ThemedView>
        ))}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Total Scores</ThemedText>
        {players.map((player) => (
          <ThemedView key={player.id} style={styles.playerItem}>
            <ThemedText style={styles.playerName}>{player.name}</ThemedText>
            <ThemedText style={styles.playerScore}>{player.score} pts</ThemedText>
          </ThemedView>
        ))}
      </ThemedView>

      {gameState.isHost && (
        <TouchableOpacity 
          style={[styles.nextButton, { backgroundColor: colors.tint }]}
          onPress={nextRound}
        >
          <ThemedText style={styles.nextButtonText}>
            {gameState.currentRound < gameSettings.rounds ? 'Next Round' : 'Finish Game'}
          </ThemedText>
        </TouchableOpacity>
      )}
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      {gameState.currentStep === 'lobby' && renderLobby()}
      {gameState.currentStep === 'wordAssignment' && renderWordAssignment()}
      {gameState.currentStep === 'cluePhase' && renderCluePhase()}
      {gameState.currentStep === 'votingPhase' && renderVotingPhase()}
      {gameState.currentStep === 'results' && renderResults()}

      {/* Word Modal */}
      <Modal
        visible={showWordModal}
        transparent={true}
        animationType="fade"
      >
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF' }]}>
            <ThemedText style={styles.modalTitle}>Your Word</ThemedText>
            
            <TouchableOpacity 
              style={styles.wordContainer}
              onPress={() => setIsWordRevealed(!isWordRevealed)}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.wordText}>
                {isWordRevealed 
                  ? players.find(p => p.name === playerName)?.word || 'Unknown'
                  : '*'.repeat(players.find(p => p.name === playerName)?.word?.length || 5)
                }
              </ThemedText>
              <ThemedText style={styles.wordHint}>
                {isWordRevealed ? 'Tap to hide' : 'Tap to reveal'}
              </ThemedText>
            </TouchableOpacity>
            
            <ThemedText style={styles.modalInstructions}>
              Remember your word! Don't share it with others.
            </ThemedText>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.tint }]}
              onPress={confirmWordRead}
            >
              <ThemedText style={styles.modalButtonText}>Got it!</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </Modal>

      {/* Voting Modal */}
      <Modal
        visible={showVoteModal}
        transparent={true}
        animationType="fade"
      >
        <ThemedView style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF' }]}>
            <ThemedText style={styles.modalTitle}>Vote for the Imposter</ThemedText>
            <ThemedText style={styles.modalInstructions}>
              Who do you think is the imposter?
            </ThemedText>
            {players.map((player) => (
              <TouchableOpacity 
                key={player.id}
                style={[styles.voteOption, { borderColor: colorScheme === 'dark' ? '#4B5563' : '#D1D5DB' }]}
                onPress={() => submitVote(player.name)}
              >
                <ThemedText style={styles.voteOptionText}>{player.name}</ThemedText>
              </TouchableOpacity>
            ))}
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
  gameCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  gameCode: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  copyButton: {
    padding: 8,
    borderRadius: 8,
  },
  gameCodeInstructions: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  playerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 8 },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  playerStatus: {
    fontSize: 14,
    opacity: 0.7,
  },
  playerScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
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
  joinButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  wordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    marginVertical: 20,
    gap: 12,
  },
  wordButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    marginVertical: 20,
    gap: 12,
  },
  voteButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
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
    marginBottom: 16,
  },
  wordText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
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
  voteOption: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
  },
  voteOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
}); 