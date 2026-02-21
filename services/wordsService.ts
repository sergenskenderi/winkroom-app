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
  const res = await apiService.get<WordPairsResponse>(`/games/words/pairs?limit=${limit}&locale=${encodeURIComponent(locale)}`);
  return res?.data ?? [];
}

export interface WordPairUsage {
  pairId: string;
  rating?: number;
}

export async function reportWordPairUsage(usages: WordPairUsage[]): Promise<void> {
  if (usages.length === 0) return;
  await apiService.post('/games/words/pairs/usage', { usages });
}
