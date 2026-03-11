import { apiService } from './apiService';

export interface TruthOrDareItem {
  id: string;
  type: 'truth' | 'dare';
  text: string;
  category: string;
}

export async function fetchTruthOrDare(
  type: 'truth' | 'dare',
  limit = 40,
  locale = 'en',
  category?: string | null
): Promise<TruthOrDareItem[]> {
  try {
    let url = `/games/truth-or-dare?type=${type}&limit=${limit}&locale=${encodeURIComponent(locale)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    const res = await apiService.get<{ data?: TruthOrDareItem[] }>(url);
    const list = Array.isArray(res) ? res : (res?.data ?? []);
    if (!Array.isArray(list)) return [];
    return list.filter(
      (item): item is TruthOrDareItem =>
        !!item && typeof item.id === 'string' && typeof item.text === 'string' && !!item.text.trim()
    );
  } catch {
    return [];
  }
}
