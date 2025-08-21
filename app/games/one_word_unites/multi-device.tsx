import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

interface Player {
  id: string;
  name: string;
  word?: string;
  isIntruder?: boolean;
  hasReadWord?: boolean;
  isReady?: boolean;
  clue?: string;
  vote?: string;
  score: number;
}

interface GameSettings {
  rounds: number;
  clueTime: number;
  votingTime: number;
  players: Player[];
  hostId: string;
}

export default function MultiDeviceGameScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  
  const [gamePhase, setGamePhase] = useState<'setup' | 'lobby' | 'word-assignment' | 'clue-giving' | 'voting' | 'results'>('setup');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    rounds: 3,
    clueTime: 30,
    votingTime: 60,
    players: [],
    hostId: ''
  });
  const [newPlayerName, setNewPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');

  useEffect(() => {
    // Generate player ID and game code
    setPlayerId(Date.now().toString());
    setGameCode(Math.random().toString(36).substring(2, 8).toUpperCase());
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timeRemaining > 0 && (gamePhase === 'clue-giving' || gamePhase === 'voting')) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up
            if (gamePhase === 'clue-giving') {
              handleNextClue();
            } else if (gamePhase === 'voting') {
              finishVoting();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeRemaining, gamePhase]);

  const handleBackPress = () => {
    router.back();
  };

  const createGame = () => {
    if (newPlayerName.trim()) {
      setIsHost(true);
      const hostPlayer: Player = {
        id: playerId,
        name: newPlayerName.trim(),
        score: 0
      };
      setGameSettings(prev => ({
        ...prev,
        players: [hostPlayer],
        hostId: playerId
      }));
      setGamePhase('lobby');
    }
  };

  const joinGame = () => {
    if (newPlayerName.trim() && gameCode.trim()) {
      setIsHost(false);
      const newPlayer: Player = {
        id: playerId,
        name: newPlayerName.trim(),
        score: 0
      };
      setGameSettings(prev => ({
        ...prev,
        players: [newPlayer]
      }));
      setGamePhase('lobby');
      // TODO: Join game via API
    }
  };

  const startGame = () => {
    if (gameSettings.players.length < 3) {
      Alert.alert('Not enough players', 'You need at least 3 players to start the game.');
      return;
    }
    setGamePhase('word-assignment');
    assignWords();
  };

  const assignWords = () => {
    const words = ['APPLE', 'BANANA', 'ORANGE', 'GRAPE', 'STRAWBERRY'];
    const intruderIndex = Math.floor(Math.random() * gameSettings.players.length);
    const normalWord = words[Math.floor(Math.random() * words.length)];
    const intruderWord = words.filter(w => w !== normalWord)[Math.floor(Math.random() * (words.length - 1))];

    const updatedPlayers = gameSettings.players.map((player, index) => ({
      ...player,
      word: index === intruderIndex ? intruderWord : normalWord,
      isIntruder: index === intruderIndex,
      hasReadWord: false,
      isReady: false
    }));

    setGameSettings(prev => ({
      ...prev,
      players: updatedPlayers
    }));
  };

  const handleShowWord = () => {
    const currentPlayer = gameSettings.players.find(p => p.id === playerId);
    if (currentPlayer) {
      setGameSettings(prev => ({
        ...prev,
        players: prev.players.map(p => 
          p.id === playerId ? { ...p, hasReadWord: true } : p
        )
      }));
    }
  };

  const handleReady = () => {
    setGameSettings(prev => ({
      ...prev,
      players: prev.players.map(p => 
        p.id === playerId ? { ...p, isReady: true } : p
      )
    }));

    // Check if all players are ready
    const updatedPlayers = gameSettings.players.map(p => 
      p.id === playerId ? { ...p, isReady: true } : p
    );
    
    if (updatedPlayers.every(p => p.isReady)) {
      setGamePhase('clue-giving');
      setCurrentPlayerIndex(Math.floor(Math.random() * updatedPlayers.length));
      setTimeRemaining(gameSettings.clueTime);
    }
  };

  const handleNextClue = () => {
    const nextPlayerIndex = (currentPlayerIndex + 1) % gameSettings.players.length;
    setCurrentPlayerIndex(nextPlayerIndex);
    setTimeRemaining(gameSettings.clueTime);
  };

  const finishClueGiving = () => {
    if (isHost) {
      setGamePhase('voting');
      setTimeRemaining(gameSettings.votingTime);
    }
  };

  const handleVote = (votedPlayerId: string) => {
    setGameSettings(prev => ({
      ...prev,
      players: prev.players.map(p => 
        p.id === playerId ? { ...p, vote: votedPlayerId } : p
      )
    }));
  };

  const finishVoting = () => {
    if (isHost) {
      calculateResults();
      setGamePhase('results');
    }
  };

  const calculateResults = () => {
    // Calculate scores based on votes
    const updatedPlayers = gameSettings.players.map(player => {
      let score = player.score;
      const votesForPlayer = gameSettings.players.filter(p => p.vote === player.id).length;
      
      if (player.isIntruder) {
        // Intruder gets 3 points if they fool everyone, 0 if caught
        score += votesForPlayer === 0 ? 3 : 0;
      } else {
        // Normal players get 1 point for each correct vote
        const correctVotes = gameSettings.players.filter(p => 
          p.vote === gameSettings.players.find(p2 => p2.isIntruder)?.id
        ).length;
        score += correctVotes;
      }
      
      return { ...player, score };
    });

    setGameSettings(prev => ({
      ...prev,
      players: updatedPlayers
    }));
  };

  const renderSetupPhase = () => (
    <ThemedView style={styles.phaseContainer}>
      <ThemedText style={styles.phaseTitle}>Multi Device Setup</ThemedText>
      
      <ThemedView style={styles.setupSection}>
        <TextInput
          style={[
            styles.nameInput,
            {
              color: colors.text,
              borderColor: colors.icon,
              backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#FFFFFF'
            }
          ]}
          placeholder="Enter your name"
          placeholderTextColor={colors.icon}
          value={newPlayerName}
          onChangeText={setNewPlayerName}
        />
      </ThemedView>

      <ThemedView style={styles.modeButtons}>
        <TouchableOpacity 
          style={[styles.modeButton, { backgroundColor: colors.tint }]}
          onPress={createGame}
        >
          <Ionicons name="add-circle" size={24} color="#FFFFFF" />
          <ThemedText style={styles.modeButtonText}>Create Game</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.modeButton, { backgroundColor: '#4CAF50' }]}
          onPress={joinGame}
        >
          <Ionicons name="people" size={24} color="#FFFFFF" />
          <ThemedText style={styles.modeButtonText}>Join Game</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      {!isHost && (
        <ThemedView style={styles.joinSection}>
          <TextInput
            style={[
              styles.codeInput,
              {
                color: colors.text,
                borderColor: colors.icon,
                backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#FFFFFF'
              }
            ]}
            placeholder="Enter game code"
            placeholderTextColor={colors.icon}
            value={gameCode}
            onChangeText={setGameCode}
          />
        </ThemedView>
      )}
    </ThemedView>
  );

  const renderLobbyPhase = () => (
    <ThemedView style={styles.phaseContainer}>
      <ThemedText style={styles.phaseTitle}>Game Lobby</ThemedText>
      
      {isHost && (
        <ThemedView style={styles.gameCodeSection}>
          <ThemedText style={styles.gameCodeLabel}>Game Code:</ThemedText>
          <ThemedText style={styles.gameCode}>{gameCode}</ThemedText>
          <ThemedText style={styles.gameCodeInstructions}>
            Share this code with other players to join the game
          </ThemedText>
        </ThemedView>
      )}

      <ThemedView style={styles.playersSection}>
        <ThemedText style={styles.sectionTitle}>👥 Players ({gameSettings.players.length})</ThemedText>
        
        {gameSettings.players.map((player) => (
          <ThemedView key={player.id} style={styles.playerItem}>
            <ThemedText style={styles.playerName}>
              {player.name} {player.id === gameSettings.hostId ? '(Host)' : ''}
            </ThemedText>
            {player.isReady && (
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            )}
          </ThemedView>
        ))}
      </ThemedView>

      {isHost && gameSettings.players.length >= 3 && (
        <TouchableOpacity 
          style={[styles.startButton, { backgroundColor: colors.tint }]}
          onPress={startGame}
        >
          <ThemedText style={styles.startButtonText}>Start Game</ThemedText>
        </TouchableOpacity>
      )}

      {!isHost && (
        <ThemedText style={styles.waitingText}>
          Waiting for host to start the game...
        </ThemedText>
      )}
    </ThemedView>
  );

  const renderWordAssignmentPhase = () => {
    const currentPlayer = gameSettings.players.find(p => p.id === playerId);
    
    return (
      <ThemedView style={styles.phaseContainer}>
        <ThemedText style={styles.phaseTitle}>Word Assignment</ThemedText>
        <ThemedText style={styles.roundInfo}>Round {currentRound}</ThemedText>
        
        {!currentPlayer?.hasReadWord ? (
          <ThemedView style={styles.wordCard}>
            <ThemedText style={styles.wordInstructions}>
              Click the button below to reveal your word
            </ThemedText>
            <TouchableOpacity 
              style={[styles.showWordButton, { backgroundColor: colors.tint }]}
              onPress={handleShowWord}
            >
              <ThemedText style={styles.showWordButtonText}>Show My Word</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <ThemedView style={styles.wordCard}>
            <ThemedText style={styles.wordLabel}>Your word is:</ThemedText>
            <ThemedText style={styles.wordText}>{currentPlayer.word}</ThemedText>
            <ThemedText style={styles.wordHint}>
              {currentPlayer.isIntruder ? 'You are the INTRUDER!' : 'You are a normal player'}
            </ThemedText>
          </ThemedView>
        )}

        {currentPlayer?.hasReadWord && !currentPlayer?.isReady && (
          <TouchableOpacity 
            style={[styles.readyButton, { backgroundColor: '#4CAF50' }]}
            onPress={handleReady}
          >
            <ThemedText style={styles.readyButtonText}>I'm Ready</ThemedText>
          </TouchableOpacity>
        )}

        <ThemedView style={styles.progressSection}>
          <ThemedText style={styles.progressText}>
            {gameSettings.players.filter(p => p.isReady).length} / {gameSettings.players.length} players ready
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  };

  const renderClueGivingPhase = () => {
    const currentPlayer = gameSettings.players[currentPlayerIndex];
    const isCurrentPlayer = currentPlayer?.id === playerId;
    
    return (
      <ThemedView style={styles.phaseContainer}>
        <ThemedText style={styles.phaseTitle}>Clue Giving</ThemedText>
        <ThemedText style={styles.roundInfo}>Round {currentRound}</ThemedText>
        
        <ThemedView style={styles.timerCard}>
          <ThemedText style={styles.timerText}>Time: {timeRemaining}s</ThemedText>
        </ThemedView>

        <ThemedView style={styles.playerCard}>
          <ThemedText style={styles.playerTurnText}>Current player:</ThemedText>
          <ThemedText style={styles.currentPlayerName}>{currentPlayer?.name}</ThemedText>
          
          {isCurrentPlayer && (
            <TouchableOpacity 
              style={[styles.nextButton, { backgroundColor: colors.tint }]}
              onPress={handleNextClue}
            >
              <ThemedText style={styles.nextButtonText}>Next Player</ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>

        {isHost && (
          <TouchableOpacity 
            style={[styles.finishRoundButton, { backgroundColor: '#FF9800' }]}
            onPress={finishClueGiving}
          >
            <ThemedText style={styles.finishRoundButtonText}>Finish Round</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>
    );
  };

  const renderVotingPhase = () => (
    <ThemedView style={styles.phaseContainer}>
      <ThemedText style={styles.phaseTitle}>Voting Phase</ThemedText>
      <ThemedText style={styles.roundInfo}>Round {currentRound}</ThemedText>
      
      <ThemedView style={styles.timerCard}>
        <ThemedText style={styles.timerText}>Time: {timeRemaining}s</ThemedText>
      </ThemedView>

      <ThemedText style={styles.votingInstructions}>
        Vote for who you think is the intruder:
      </ThemedText>

      <ThemedView style={styles.votingSection}>
        {gameSettings.players.map((player) => (
          <TouchableOpacity 
            key={player.id}
            style={[
              styles.voteButton,
              { 
                backgroundColor: gameSettings.players.find(p => p.id === playerId)?.vote === player.id 
                  ? colors.tint 
                  : '#F3F4F6'
              }
            ]}
            onPress={() => handleVote(player.id)}
            disabled={player.id === playerId}
          >
            <ThemedText style={[
              styles.voteButtonText,
              { color: gameSettings.players.find(p => p.id === playerId)?.vote === player.id ? '#FFFFFF' : '#000000' }
            ]}>
              {player.name}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ThemedView>

      {isHost && (
        <TouchableOpacity 
          style={[styles.finishVotingButton, { backgroundColor: '#FF9800' }]}
          onPress={finishVoting}
        >
          <ThemedText style={styles.finishVotingButtonText}>Finish Voting</ThemedText>
        </TouchableOpacity>
      )}
    </ThemedView>
  );

  const renderResultsPhase = () => (
    <ThemedView style={styles.phaseContainer}>
      <ThemedText style={styles.phaseTitle}>Round Results</ThemedText>
      <ThemedText style={styles.roundInfo}>Round {currentRound}</ThemedText>
      
      <ThemedView style={styles.resultsSection}>
        <ThemedText style={styles.sectionTitle}>🏆 Scores</ThemedText>
        {gameSettings.players.map((player) => (
          <ThemedView key={player.id} style={styles.scoreItem}>
            <ThemedText style={styles.playerName}>{player.name}</ThemedText>
            <ThemedText style={styles.scoreText}>{player.score} points</ThemedText>
          </ThemedView>
        ))}
      </ThemedView>

      {isHost && (
        <TouchableOpacity 
          style={[styles.nextRoundButton, { backgroundColor: colors.tint }]}
          onPress={() => {
            if (currentRound < gameSettings.rounds) {
              setCurrentRound(prev => prev + 1);
              setGamePhase('word-assignment');
              setCurrentPlayerIndex(0);
              assignWords();
            } else {
              // Game complete
              Alert.alert('Game Complete!', 'The game has finished. Calculate final scores!');
            }
          }}
        >
          <ThemedText style={styles.nextRoundButtonText}>
            {currentRound < gameSettings.rounds ? 'Next Round' : 'Finish Game'}
          </ThemedText>
        </TouchableOpacity>
      )}
    </ThemedView>
  );

  const renderCurrentPhase = () => {
    switch (gamePhase) {
      case 'setup':
        return renderSetupPhase();
      case 'lobby':
        return renderLobbyPhase();
      case 'word-assignment':
        return renderWordAssignmentPhase();
      case 'clue-giving':
        return renderClueGivingPhase();
      case 'voting':
        return renderVotingPhase();
      case 'results':
        return renderResultsPhase();
      default:
        return renderSetupPhase();
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Multi Device Mode</ThemedText>
          <ThemedView style={styles.placeholder} />
        </ThemedView>

        {renderCurrentPhase()}
      </ScrollView>
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
  phaseContainer: {
    flex: 1,
  },
  phaseTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  roundInfo: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
  },
  setupSection: {
    marginBottom: 24,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  modeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  modeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  joinSection: {
    marginBottom: 24,
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  gameCodeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  gameCodeLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  gameCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0a7ea4',
    marginBottom: 8,
  },
  gameCodeInstructions: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  playersSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
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
  waitingText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 20,
  },
  wordCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  wordInstructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  showWordButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  showWordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  wordLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  wordText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#0a7ea4',
  },
  wordHint: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  readyButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  readyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressSection: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    opacity: 0.7,
  },
  timerCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  playerCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  playerTurnText: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 8,
  },
  currentPlayerName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  finishRoundButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishRoundButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  votingInstructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  votingSection: {
    marginBottom: 24,
  },
  voteButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  voteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  finishVotingButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishVotingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsSection: {
    marginBottom: 24,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  nextRoundButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextRoundButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 