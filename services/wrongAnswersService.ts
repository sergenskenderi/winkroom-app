import { apiService } from './apiService';

type LocaleCode = string;

export interface WrongAnswerQuestionItem {
  id: string;
  question: string;
  category: string;
  difficulty: string;
}

interface WrongAnswersResponse {
  data?: WrongAnswerQuestionItem[];
}

const SUPPORTED_LOCALES = ['en', 'de', 'es', 'fr', 'it', 'tr', 'sq'];

function normalizeLocale(locale: string | undefined): string {
  const code = (locale || 'en').toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LOCALES.includes(code) ? code : 'en';
}

export async function fetchWrongAnswerQuestions(
  limit = 50,
  locale: LocaleCode = 'en',
  category?: string | null,
  difficulty?: string | null
): Promise<WrongAnswerQuestionItem[]> {
  try {
    const localeParam = normalizeLocale(locale);
    let url = `/games/wrong-answers/questions?limit=${limit}&locale=${encodeURIComponent(localeParam)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (difficulty) url += `&difficulty=${encodeURIComponent(difficulty)}`;
    const res = await apiService.get<WrongAnswersResponse>(url);
    const list = Array.isArray(res) ? res : (res?.data ?? []);
    if (!Array.isArray(list)) return [];
    return list.filter(
      (q): q is WrongAnswerQuestionItem =>
        !!q &&
        typeof q.id === 'string' &&
        typeof q.question === 'string' &&
        !!q.question.trim()
    );
  } catch {
    return [];
  }
}

export async function reportWrongAnswerQuestionUsage(questionIds: string[]): Promise<void> {
  if (!Array.isArray(questionIds) || questionIds.length === 0) return;
  try {
    await apiService.post('/games/wrong-answers/questions/usage', {
      usages: questionIds.map((questionId) => ({ questionId })),
    });
  } catch {
  }
}

