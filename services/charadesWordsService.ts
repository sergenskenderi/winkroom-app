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
