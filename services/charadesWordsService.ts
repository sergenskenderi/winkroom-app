import { apiService } from './apiService';

type LocaleCode = string;

export interface CharadesWordItem {
  id: string;
  word: string;
  category: string;
  difficulty: string;
}

interface CharadesWordsResponse {
  data?: (string | CharadesWordItem)[];
  words?: string[];
}

export async function fetchCharadesWordItems(
  limit = 50,
  locale: LocaleCode = 'en',
  category?: string | null,
  difficulty?: string | null
): Promise<CharadesWordItem[]> {
  try {
    let url = `/games/charades/words?limit=${limit}&locale=${encodeURIComponent(locale)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (difficulty) url += `&difficulty=${encodeURIComponent(difficulty)}`;
    const res = await apiService.get<CharadesWordsResponse>(url);
    const list = res?.data ?? res?.words ?? [];
    if (!Array.isArray(list)) return [];
    return list
      .map((x) =>
        typeof x === 'string'
          ? null
          : {
              id: (x as CharadesWordItem).id,
              word: (x as CharadesWordItem).word,
              category: (x as CharadesWordItem).category,
              difficulty: (x as CharadesWordItem).difficulty,
            }
      )
      .filter((x): x is CharadesWordItem => !!x && !!x.id && !!x.word);
  } catch {
    return [];
  }
}

export async function fetchCharadesWords(
  limit = 50,
  locale: LocaleCode = 'en',
  category?: string | null,
  difficulty?: string | null
): Promise<string[]> {
  try {
    let url = `/games/charades/words?limit=${limit}&locale=${encodeURIComponent(locale)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (difficulty) url += `&difficulty=${encodeURIComponent(difficulty)}`;
    const res = await apiService.get<CharadesWordsResponse>(url);
    const list = res?.data ?? res?.words ?? [];
    if (!Array.isArray(list)) return [];
    return list.map((x) => (typeof x === 'string' ? x : (x as CharadesWordItem)?.word)).filter(Boolean);
  } catch {
    return [];
  }
}

export async function reportCharadesWordUsage(wordIds: string[]): Promise<void> {
  if (!Array.isArray(wordIds) || wordIds.length === 0) return;
  try {
    await apiService.post('/games/charades/words/usage', {
      usages: wordIds.map((wordId) => ({ wordId })),
    });
  } catch {
  }
}
