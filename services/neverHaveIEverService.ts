import { apiService } from './apiService';

export interface NeverHaveIEverQuestionItem {
  id: string;
  question: string;
  category: string;
}

export async function fetchNeverHaveIEverQuestions(
  limit = 80,
  locale: string = 'en',
  category?: string | null
): Promise<NeverHaveIEverQuestionItem[]> {
  try {
    let url = `/games/never-have-i-ever/questions?limit=${limit}&locale=${encodeURIComponent(locale)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    const res = await apiService.get<{ data?: NeverHaveIEverQuestionItem[] }>(url);
    const list = Array.isArray(res) ? res : (res?.data ?? []);
    if (!Array.isArray(list)) return [];
    return list.filter(
      (q): q is NeverHaveIEverQuestionItem =>
        !!q && typeof q.id === 'string' && typeof q.question === 'string' && !!q.question.trim()
    );
  } catch {
    return [];
  }
}
