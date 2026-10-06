export type TemplateId = 'official' | 'abnt' | 'academic';

export type ArticleTemplate = {
  id: TemplateId;
  title: string;
  /** Nome curto exibido na faixa do editor. */
  label: string;
  description: string;
  recommended?: boolean;
  /** Formatação aplicada ao corpo do documento. */
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  textAlign: 'left' | 'justify';
};

export const templates: ArticleTemplate[] = [
  {
    id: 'official',
    title: 'Modelo Oficial — Faculdade Regional de Tecnologia',
    label: 'Modelo oficial — Faculdade Regional de Tecnologia',
    description: 'Modelo disponibilizado pela instituição para trabalhos acadêmicos.',
    recommended: true,
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: 12,
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  {
    id: 'abnt',
    title: 'ABNT',
    label: 'ABNT',
    description: 'Modelo acadêmico baseado nas normas ABNT.',
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: 12,
    lineHeight: 1.5,
    textAlign: 'justify',
  },
  {
    id: 'academic',
    title: 'VinceArt Academic',
    label: 'VinceArt Academic',
    description: 'Modelo acadêmico padrão disponibilizado pela plataforma.',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontSize: 12,
    lineHeight: 1.6,
    textAlign: 'left',
  },
];

const TEMPLATE_KEY = 'vince:article:template';
const DEFAULT_TEMPLATE: TemplateId = 'official';

export function getTemplate(id: string | null | undefined): ArticleTemplate {
  return templates.find((t) => t.id === id) ?? templates[0]!;
}

export function loadTemplateId(): TemplateId {
  try {
    return getTemplate(window.localStorage.getItem(TEMPLATE_KEY)).id;
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

export function saveTemplateId(id: TemplateId) {
  try {
    window.localStorage.setItem(TEMPLATE_KEY, id);
  } catch {
    /* armazenamento indisponível: a escolha vale só para esta sessão */
  }
}
