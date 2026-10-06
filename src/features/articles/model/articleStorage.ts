import { initialContent } from './initialContent';

export type ArticleStatus = 'Rascunho' | 'Em andamento' | 'Em revisão' | 'Concluído';

export const articleStatuses: ArticleStatus[] = [
  'Rascunho',
  'Em andamento',
  'Em revisão',
  'Concluído',
];

export type ArticleVersion = { id: string; savedAt: number; html: string };

export type StoredArticle = {
  title: string;
  status: ArticleStatus;
  html: string;
  savedAt: number | null;
  versions: ArticleVersion[];
};

const KEY = 'vince:article:draft';
const MAX_VERSIONS = 10;

export const defaultArticle: StoredArticle = {
  title: 'Análise de Redes Neurais em Saúde',
  status: 'Em andamento',
  html: initialContent,
  savedAt: null,
  versions: [],
};

export function loadArticle(): StoredArticle {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultArticle;
    return { ...defaultArticle, ...(JSON.parse(raw) as Partial<StoredArticle>) };
  } catch {
    return defaultArticle;
  }
}

/** Retorna `false` quando o navegador recusa gravar (cota cheia, modo privado). */
export function saveArticle(article: StoredArticle): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(article));
    return true;
  } catch {
    return false;
  }
}

export function addVersion(versions: ArticleVersion[], html: string): ArticleVersion[] {
  const version = { id: crypto.randomUUID(), savedAt: Date.now(), html };
  return [version, ...versions].slice(0, MAX_VERSIONS);
}
