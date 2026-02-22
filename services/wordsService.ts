import { apiService } from './apiService';

export interface WordPair {
  id?: string;
  normal: string;
  imposter: string;
}

interface WordPairsResponse {
  message: string;
  data: WordPair[];
}

export async function fetchWordPairs(limit = 20, locale = 'en'): Promise<WordPair[]> {
  try {
    const res = await apiService.get<WordPairsResponse>(`/games/words/pairs?limit=${limit}&locale=${encodeURIComponent(locale)}`);
    return res?.data ?? [];
  } catch {
    return [];
  }
}

export interface WordPairUsage {
  pairId: string;
  rating?: number;
}

export async function reportWordPairUsage(usages: WordPairUsage[]): Promise<void> {
  if (usages.length === 0) return;
  try {
    await apiService.post('/games/words/pairs/usage', { usages });
  } catch (_) {}
}
