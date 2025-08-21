import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function SuspectGameScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const handleBackPress = () => {
    router.back();
  };

  const handlePlayNow = () => {
    // TODO: Implement actual game logic
    console.log('Starting Suspect the Word game...');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Suspect the Word</ThemedText>
          <ThemedView style={styles.placeholder} />
        </ThemedView>

        {/* Game Icon */}
        <ThemedView style={styles.gameIconContainer}>
          <Ionicons name="people" size={48} color="#FFFFFF" />
        </ThemedView>

        {/* Game Title */}
        <ThemedView style={styles.titleSection}>
          <ThemedText style={styles.gameTitle}>Suspect the Word</ThemedText>
          <ThemedText style={styles.gameSubtitle}>Social Deduction</ThemedText>
        </ThemedView>

        {/* Game Description */}
        <ThemedView style={styles.descriptionSection}>
          <ThemedText style={styles.description}>
            One word unites the group — but one player is the intruder with a different word. 
            Can you speak in hints without revealing too much? Can you spot the odd one out before it's too late?
          </ThemedText>
        </ThemedView>

        {/* How to Play */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>🔹 How to Play</ThemedText>
          <ThemedText style={styles.sectionText}>
            • Each player receives a secret word{'\n'}
            • All but one will see the same word — the intruder gets a different one{'\n'}
            • In turn, each player gives a single-word clue to hint at their word — careful not to say it outright!{'\n'}
            • After all clues are revealed, everyone votes on who they think the intruder is
          </ThemedText>
        </ThemedView>

        {/* Scoring */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>🎯 Scoring</ThemedText>
          <ThemedText style={styles.sectionText}>
            ✅ Guess the intruder correctly? You earn 1 point{'\n'}
            😈 Fool everyone as the intruder? You earn 3 points{'\n'}
            🤷‍♂️ Got some votes but weren't the intruder? No points — try to blend in better next round
          </ThemedText>
        </ThemedView>

        {/* Strategy */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>💡 Strategy</ThemedText>
          <ThemedText style={styles.sectionText}>
            Choose your word carefully — too obvious and you reveal your secret, too vague and you'll look suspicious.{'\n\n'}
            Think fast. Speak smart. Blend in... or stand out just enough.
          </ThemedText>
        </ThemedView>

        {/* Game Features */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>🎮 Game Features</ThemedText>
          <ThemedText style={styles.sectionText}>
            • Multiple word categories{'\n'}
            • Adjustable difficulty levels{'\n'}
            • Timer-based rounds{'\n'}
            • Player statistics tracking{'\n'}
            • Custom word sets
          </ThemedText>
        </ThemedView>

        {/* Play Button */}
        <TouchableOpacity 
          style={[styles.playButton, { backgroundColor: colors.tint }]}
          onPress={handlePlayNow}
        >
          <Ionicons name="play" size={24} color="#FFFFFF" />
          <ThemedText style={styles.playButtonText}>Start Game</ThemedText>
        </TouchableOpacity>
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
  gameIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0a7ea4',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  gameSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  descriptionSection: {
    marginBottom: 32,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    opacity: 0.8,
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
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 