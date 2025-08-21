import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function GamesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const handleGamePress = (gameId: string) => {
    if (gameId === 'one-word-unites') {
      // Navigate to the one word unites game page
      router.push('/games/one-word-unites' as any);
    }
    // Add other games as they become available
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.welcomeSection}>
          <ThemedText style={styles.welcomeText}>Welcome to WinkRoom Games!</ThemedText>
          <ThemedText style={styles.subtitleText}>Discover and play amazing games</ThemedText>
        </ThemedView>

        <ThemedView style={styles.gamesContainer}>
          {/* One Word Unites - Active Game */}
          <TouchableOpacity 
            style={[
              styles.gameCard,
              { 
                backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
                borderWidth: 1,
                borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB'
              }
            ]}
            onPress={() => handleGamePress('one-word-unites')}
            activeOpacity={0.8}
          >
            <ThemedView style={styles.gameHeader}>
              <ThemedView style={styles.gameIconContainer}>
                <Ionicons name="people" size={32} color="#FFFFFF" />
              </ThemedView>
              <ThemedView style={styles.gameTitleContainer}>
                <ThemedText style={styles.gameTitle}>One Word Unites</ThemedText>
                <ThemedText style={styles.gameSubtitle}>Social Deduction</ThemedText>
              </ThemedView>
              <Ionicons name="chevron-forward" size={24} color={colors.tint} />
            </ThemedView>
            
            <ThemedText style={styles.gameDescription}>
              One word unites the group — but one player is the intruder with a different word.
            </ThemedText>

            <TouchableOpacity style={[styles.playButton, { backgroundColor: colors.tint }]}>
              <Ionicons name="play" size={20} color="#FFFFFF" />
              <ThemedText style={styles.playButtonText}>Play Now</ThemedText>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Guess the Paint - Coming Soon */}
          <ThemedView style={[
            styles.gameCard, 
            styles.comingSoonCard,
            { 
              backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
              borderWidth: 1,
              borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB'
            }
          ]}>
            <ThemedView style={styles.gameHeader}>
              <ThemedView style={[styles.gameIconContainer, styles.comingSoonIcon]}>
                <Ionicons name="color-palette" size={32} color="#FFFFFF" />
              </ThemedView>
              <ThemedView style={styles.gameTitleContainer}>
                <ThemedText style={[styles.gameTitle, styles.comingSoonText]}>Guess the Paint</ThemedText>
                <ThemedText style={[styles.gameSubtitle, styles.comingSoonText]}>Coming Soon</ThemedText>
              </ThemedView>
              <Ionicons name="time" size={24} color="#999999" />
            </ThemedView>
            
            <ThemedText style={[styles.gameDescription, styles.comingSoonText]}>
              A creative guessing game where colors and imagination collide.
            </ThemedText>
          </ThemedView>

          {/* Fool Dance - Coming Soon */}
          <ThemedView style={[
            styles.gameCard, 
            styles.comingSoonCard,
            { 
              backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF',
              borderWidth: 1,
              borderColor: colorScheme === 'dark' ? '#374151' : '#E5E7EB'
            }
          ]}>
            <ThemedView style={styles.gameHeader}>
              <ThemedView style={[styles.gameIconContainer, styles.comingSoonIcon]}>
                <Ionicons name="musical-notes" size={32} color="#FFFFFF" />
              </ThemedView>
              <ThemedView style={styles.gameTitleContainer}>
                <ThemedText style={[styles.gameTitle, styles.comingSoonText]}>Fool Dance</ThemedText>
                <ThemedText style={[styles.gameSubtitle, styles.comingSoonText]}>Coming Soon</ThemedText>
              </ThemedView>
              <Ionicons name="time" size={24} color="#999999" />
            </ThemedView>
            
            <ThemedText style={[styles.gameDescription, styles.comingSoonText]}>
              Dance to the rhythm and fool your friends with unexpected moves.
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60, // Account for status bar
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  welcomeSection: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  gamesContainer: {
    paddingVertical: 16,
  },
  gameCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  gameIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  gameTitleContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  gameSubtitle: {
    fontSize: 14,
    opacity: 0.6,
    fontWeight: '500',
  },
  gameDescription: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.8,
  },

  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  comingSoonCard: {
    opacity: 0.5,
  },
  comingSoonIcon: {
    backgroundColor: '#9CA3AF',
  },
  comingSoonText: {
    opacity: 0.6,
  },
});
