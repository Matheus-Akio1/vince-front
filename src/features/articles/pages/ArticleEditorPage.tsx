import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { toast } from 'sonner';

import { InfoDialog, ImageUrlDialog, LinkDialog, TableDialog } from '../components/Dialogs';
import { EditorIcon } from '../components/EditorIcons';
import { EditorToolbar } from '../components/EditorToolbar';
import { EditorTopBar, type TopBarActions } from '../components/EditorTopBar';
import { MenuItem } from '../components/Menu';
import { StructureSidebar } from '../components/StructureSidebar';
import { addVersion, loadArticle, saveArticle, type ArticleStatus } from '../model/articleStorage';
import { editorExtensions } from '../model/extensions';
import { exportHtml, exportText, exportWord } from '../model/exporters';
import { getTemplate, loadTemplateId } from '../model/templates';

import '../article-editor.css';

type DialogName = 'link' | 'imageUrl' | 'table' | 'help' | 'count' | 'history' | null;
type SaveState = 'saved' | 'dirty' | 'error';

const PAGE_HEIGHT = 1123;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const AUTOSAVE_MS = 800;

const shortcuts: [string, string][] = [
  ['Negrito / Itálico / Sublinhado', 'Ctrl+B / I / U'],
  ['Desfazer / Refazer', 'Ctrl+Z / Ctrl+Shift+Z'],
  ['Inserir link', 'Ctrl+K'],
  ['Salvar versão', 'Ctrl+S'],
  ['Imprimir / PDF', 'Ctrl+P'],
  ['Aumentar / diminuir recuo', 'Tab / Shift+Tab'],
  ['Título 1, 2 ou 3', 'Ctrl+Alt+1, 2 ou 3'],
  ['Lista com marcadores', 'Ctrl+Shift+8'],
  ['Lista numerada', 'Ctrl+Shift+7'],
];

const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error('A imagem excede 5 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

export function ArticleEditorPage() {
  const [initial] = useState(loadArticle);
  const [template] = useState(() => getTemplate(loadTemplateId()));
  const [title, setTitle] = useState(initial.title);
  const [status, setStatus] = useState<ArticleStatus>(initial.status);
  const [versions, setVersions] = useState(initial.versions);
  const [savedAt, setSavedAt] = useState(initial.savedAt);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [revision, setRevision] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [spellcheck, setSpellcheck] = useState(true);
  const [showStructure, setShowStructure] = useState(true);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [pages, setPages] = useState(1);

  const fileInput = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  // Valores mais recentes para o salvamento, sem recriar o debounce a cada tecla.
  const latest = useRef({ title, status, versions });
  latest.current = { title, status, versions };

  const insertImageFile = useCallback(
    async (file: File, view?: import('@tiptap/pm/view').EditorView) => {
      try {
        const src = await readFileAsDataUrl(file);
        if (view) {
          const node = view.state.schema.nodes.image!.create({ src, alt: file.name });
          view.dispatch(view.state.tr.replaceSelectionWith(node));
        } else {
          editorRef.current?.chain().focus().setImage({ src, alt: file.name }).run();
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Falha ao inserir a imagem.');
      }
    },
    [],
  );
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const editor = useEditor({
    extensions: editorExtensions,
    content: initial.html,
    editorProps: {
      attributes: { class: 'article-body', spellcheck: 'true', 'aria-label': 'Corpo do artigo' },
      handlePaste: (view, event) => {
        const file = [...(event.clipboardData?.files ?? [])].find((f) =>
          f.type.startsWith('image/'),
        );
        if (!file) return false;
        void insertImageFile(file, view);
        return true;
      },
      handleDrop: (view, event) => {
        const file = [...(event.dataTransfer?.files ?? [])].find((f) =>
          f.type.startsWith('image/'),
        );
        if (!file) return false;
        event.preventDefault();
        void insertImageFile(file, view);
        return true;
      },
    },
    onUpdate: () => setRevision((r) => r + 1),
  });
  editorRef.current = editor;

  const stats = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return { words: 0, chars: 0, sections: 0 };
      let sections = 0;
      e.state.doc.descendants((n) => {
        if (n.type.name === 'heading' && n.attrs.level === 2) sections += 1;
      });
      return {
        words: e.storage.characterCount.words(),
        chars: e.storage.characterCount.characters(),
        sections,
      };
    },
  });

  const persist = useCallback(
    (extraVersion = false) => {
      if (!editor) return;
      const now = Date.now();
      const html = editor.getHTML();
      const next = extraVersion
        ? addVersion(latest.current.versions, html)
        : latest.current.versions;
      const ok = saveArticle({
        title: latest.current.title,
        status: latest.current.status,
        html,
        savedAt: now,
        versions: next,
      });
      if (extraVersion) setVersions(next);
      setSaveState(ok ? 'saved' : 'error');
      if (ok) setSavedAt(now);
      return ok;
    },
    [editor],
  );

  // Salvamento automático com debounce a cada alteração (texto, título ou status).
  useEffect(() => {
    if (revision === 0) return;
    setSaveState('dirty');
    const id = window.setTimeout(() => persist(), AUTOSAVE_MS);
    return () => window.clearTimeout(id);
  }, [revision, persist]);

  useEffect(() => {
    const flush = () => persist();
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [persist]);

  useEffect(() => {
    editor?.view.dom.setAttribute('spellcheck', String(spellcheck));
  }, [editor, spellcheck]);

  // Número de páginas A4 estimado pela altura do conteúdo.
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setPages(Math.max(1, Math.ceil(el.offsetHeight / PAGE_HEIGHT))),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [editor]);

  const saveVersion = useCallback(() => {
    if (persist(true)) toast.success('Versão salva.');
    else toast.error('Não foi possível salvar: armazenamento do navegador indisponível.');
  }, [persist]);

  const openLink = useCallback(() => setDialog('link'), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      if (e.key === 's') {
        e.preventDefault();
        saveVersion();
      } else if (e.key === 'k') {
        e.preventDefault();
        openLink();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saveVersion, openLink]);

  const actions: TopBarActions = useMemo(
    () => ({
      newDocument: () => {
        if (
          !editor ||
          !window.confirm(
            'Criar um novo documento? O conteúdo atual será substituído (a versão salva continua no histórico).',
          )
        )
          return;
        persist(true);
        editor.commands.setContent('<h1></h1><p></p>', { emitUpdate: true });
        setTitle('Documento sem título');
        editor.commands.focus('start');
      },
      saveVersion,
      print: () => window.print(),
      exportWord: () => editor && exportWord(latest.current.title, editor.getHTML(), template),
      exportHtml: () => editor && exportHtml(latest.current.title, editor.getHTML(), template),
      exportText: () =>
        editor && exportText(latest.current.title, editor.getText({ blockSeparator: '\n\n' })),
      pickImage: () => fileInput.current?.click(),
      imageByUrl: () => setDialog('imageUrl'),
      openTable: () => setDialog('table'),
      openLink,
      showWordCount: () => setDialog('count'),
      showHistory: () => setDialog('history'),
      share: () => {
        navigator.clipboard
          .writeText(window.location.href)
          .then(() => toast.success('Link copiado para a área de transferência.'))
          .catch(() => toast.error('Não foi possível copiar o link.'));
      },
      toggleSpellcheck: () => setSpellcheck((v) => !v),
      toggleStructure: () => setShowStructure((v) => !v),
      setZoom,
    }),
    [editor, openLink, persist, saveVersion, template],
  );

  const settingsMenu = (
    <>
      <MenuItem checked={spellcheck} onSelect={() => setSpellcheck((v) => !v)}>
        Verificação ortográfica
      </MenuItem>
      <MenuItem checked={showStructure} onSelect={() => setShowStructure((v) => !v)}>
        Painel de estrutura
      </MenuItem>
    </>
  );

  if (!editor) return null;

  const saveLabel =
    saveState === 'error'
      ? 'Não foi possível salvar'
      : saveState === 'dirty'
        ? 'Salvando…'
        : savedAt
          ? `Salvo às ${formatTime(savedAt)}`
          : 'Documento novo';

  const pageStyle = {
    '--article-font': template.fontFamily,
    '--article-size': `${template.fontSize}pt`,
    '--article-line': template.lineHeight,
    '--article-align': template.textAlign,
    zoom: zoom / 100,
  } as React.CSSProperties;

  return (
    <div className="flex h-screen min-w-[960px] flex-col bg-white text-vince-text print:block print:h-auto print:min-w-0">
      <EditorTopBar
        actions={actions}
        editor={editor}
        onStatusChange={(s) => {
          setStatus(s);
          setRevision((r) => r + 1);
        }}
        onTitleChange={(t) => {
          setTitle(t);
          setRevision((r) => r + 1);
        }}
        saveLabel={saveLabel}
        settingsMenu={settingsMenu}
        showStructure={showStructure}
        spellcheck={spellcheck}
        status={status}
        title={title}
        zoom={zoom}
      />

      <div className="flex h-9 items-center justify-between border-b border-vince-border bg-white px-5 print:hidden">
        <p className="flex items-center gap-2 text-[11px] text-vince-muted">
          <EditorIcon className="h-3.5 w-3.5" name="page" />
          {template.label}
        </p>
        <a
          className="rounded border border-vince-primary px-3 py-1 text-[11px] font-medium text-vince-primary hover:bg-vince-tertiary"
          href="/artigos/modelo"
        >
          Alterar modelo
        </a>
      </div>

      <EditorToolbar
        editor={editor}
        insert={{
          pickImage: actions.pickImage,
          imageByUrl: actions.imageByUrl,
          openTable: actions.openTable,
          openLink,
        }}
        template={template}
      />

      <div className="flex min-h-0 flex-1 print:block">
        {showStructure && (
          <StructureSidebar
            editor={editor}
            onOpenHelp={() => setDialog('help')}
            settingsMenu={settingsMenu}
          />
        )}

        <main
          className="flex-1 overflow-auto bg-[#f0eeee] px-6 py-8 print:overflow-visible print:bg-white print:p-0"
          onMouseDown={(e) => {
            // Clicar na "mesa" fora da folha leva o cursor ao fim do documento.
            if (e.target === e.currentTarget) {
              e.preventDefault();
              editor.commands.focus('end');
            }
          }}
        >
          <div className="mx-auto w-fit" style={pageStyle}>
            <div className="article-page" ref={pageRef}>
              <EditorContent editor={editor} />
            </div>
          </div>
        </main>
      </div>

      <footer className="flex h-7 items-center justify-between border-t border-vince-border bg-white px-5 text-[10px] text-vince-muted print:hidden">
        <p className="flex gap-4">
          <span>Words: {stats.words.toLocaleString('pt-BR')}</span>
          <span>Pages: {pages}</span>
          <span>Sections: {stats.sections}</span>
        </p>
        <span>Last update: {savedAt ? formatTime(savedAt) : 'now'}</span>
      </footer>

      <input
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void insertImageFile(file);
          e.target.value = '';
        }}
        ref={fileInput}
        type="file"
      />

      <LinkDialog
        initialUrl={(editor.getAttributes('link').href as string | undefined) ?? ''}
        onClose={() => setDialog(null)}
        onSubmit={(url) => {
          const c = editor.chain().focus().extendMarkRange('link');
          if (url)
            c.setLink({ href: /^(https?:|mailto:|#)/i.test(url) ? url : `https://${url}` }).run();
          else c.unsetLink().run();
          setDialog(null);
        }}
        open={dialog === 'link'}
      />
      <ImageUrlDialog
        onClose={() => setDialog(null)}
        onSubmit={(src) => {
          editor.chain().focus().setImage({ src }).run();
          setDialog(null);
        }}
        open={dialog === 'imageUrl'}
      />
      <TableDialog
        onClose={() => setDialog(null)}
        onSubmit={(rows, cols) => {
          editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
          setDialog(null);
        }}
        open={dialog === 'table'}
      />

      <InfoDialog
        onClose={() => setDialog(null)}
        open={dialog === 'count'}
        title="Contagem de palavras"
      >
        <dl className="grid grid-cols-2 gap-y-2">
          <dt className="text-vince-muted">Palavras</dt>
          <dd className="text-right font-semibold">{stats.words.toLocaleString('pt-BR')}</dd>
          <dt className="text-vince-muted">Caracteres</dt>
          <dd className="text-right font-semibold">{stats.chars.toLocaleString('pt-BR')}</dd>
          <dt className="text-vince-muted">Páginas (A4)</dt>
          <dd className="text-right font-semibold">{pages}</dd>
          <dt className="text-vince-muted">Seções</dt>
          <dd className="text-right font-semibold">{stats.sections}</dd>
        </dl>
      </InfoDialog>

      <InfoDialog
        onClose={() => setDialog(null)}
        open={dialog === 'help'}
        title="Atalhos de teclado"
      >
        <dl className="space-y-2">
          {shortcuts.map(([name, keys]) => (
            <div className="flex justify-between gap-4" key={name}>
              <dt className="text-vince-muted">{name}</dt>
              <dd className="font-medium">{keys}</dd>
            </div>
          ))}
        </dl>
      </InfoDialog>

      <InfoDialog
        onClose={() => setDialog(null)}
        open={dialog === 'history'}
        title="Histórico de versões"
      >
        {versions.length === 0 ? (
          <p className="text-vince-muted">
            Nenhuma versão salva ainda. Use Ctrl+S para salvar uma versão.
          </p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {versions.map((v) => (
              <li
                className="flex items-center justify-between gap-3 rounded border border-vince-border px-3 py-2"
                key={v.id}
              >
                <span>{new Date(v.savedAt).toLocaleString('pt-BR')}</span>
                <button
                  className="text-xs font-semibold text-vince-primary hover:underline"
                  onClick={() => {
                    if (
                      !window.confirm('Restaurar esta versão? O conteúdo atual será substituído.')
                    )
                      return;
                    persist(true);
                    editor.commands.setContent(v.html, { emitUpdate: true });
                    setDialog(null);
                  }}
                  type="button"
                >
                  Restaurar
                </button>
              </li>
            ))}
          </ul>
        )}
      </InfoDialog>
    </div>
  );
}
