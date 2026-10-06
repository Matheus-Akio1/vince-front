import { useState } from 'react';

import type { Editor } from '@tiptap/react';

import { articleStatuses, type ArticleStatus } from '../model/articleStorage';
import { EditorIcon } from './EditorIcons';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from './Menu';

export type TopBarActions = {
  newDocument: () => void;
  saveVersion: () => void;
  print: () => void;
  exportWord: () => void;
  exportHtml: () => void;
  exportText: () => void;
  pickImage: () => void;
  imageByUrl: () => void;
  openTable: () => void;
  openLink: () => void;
  showWordCount: () => void;
  showHistory: () => void;
  share: () => void;
  toggleSpellcheck: () => void;
  toggleStructure: () => void;
  setZoom: (zoom: number) => void;
};

type MenuName = 'File' | 'Edit' | 'Insert' | 'Review' | 'View';
const menuNames: MenuName[] = ['File', 'Edit', 'Insert', 'Review', 'View'];
const zoomLevels = [50, 75, 100, 125, 150];

export function EditorTopBar({
  editor,
  title,
  onTitleChange,
  status,
  onStatusChange,
  saveLabel,
  zoom,
  spellcheck,
  showStructure,
  actions,
  settingsMenu,
}: {
  editor: Editor;
  title: string;
  onTitleChange: (title: string) => void;
  status: ArticleStatus;
  onStatusChange: (status: ArticleStatus) => void;
  saveLabel: string;
  zoom: number;
  spellcheck: boolean;
  showStructure: boolean;
  actions: TopBarActions;
  settingsMenu: React.ReactNode;
}) {
  const [active, setActive] = useState<MenuName>('Review');
  const chain = () => editor.chain().focus();

  const items: Record<MenuName, React.ReactNode> = {
    File: (
      <>
        <MenuItem onSelect={actions.newDocument}>Novo documento</MenuItem>
        <MenuItem onSelect={actions.saveVersion} shortcut="Ctrl+S">
          Salvar versão
        </MenuItem>
        <MenuSeparator />
        <MenuLabel>Exportar</MenuLabel>
        <MenuItem onSelect={actions.print}>PDF / Imprimir…</MenuItem>
        <MenuItem onSelect={actions.exportWord}>Documento Word (.doc)</MenuItem>
        <MenuItem onSelect={actions.exportHtml}>Página web (.html)</MenuItem>
        <MenuItem onSelect={actions.exportText}>Texto simples (.txt)</MenuItem>
      </>
    ),
    Edit: (
      <>
        <MenuItem
          onSelect={() => chain().undo().run()}
          shortcut="Ctrl+Z"
          disabled={!editor.can().undo()}
        >
          Desfazer
        </MenuItem>
        <MenuItem
          onSelect={() => chain().redo().run()}
          shortcut="Ctrl+Shift+Z"
          disabled={!editor.can().redo()}
        >
          Refazer
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => chain().selectAll().run()} shortcut="Ctrl+A">
          Selecionar tudo
        </MenuItem>
        <MenuItem onSelect={() => chain().unsetAllMarks().clearNodes().run()}>
          Limpar formatação
        </MenuItem>
      </>
    ),
    Insert: (
      <>
        <MenuItem onSelect={actions.pickImage}>Imagem do computador…</MenuItem>
        <MenuItem onSelect={actions.imageByUrl}>Imagem por endereço…</MenuItem>
        <MenuItem onSelect={actions.openTable}>Tabela…</MenuItem>
        <MenuItem onSelect={actions.openLink} shortcut="Ctrl+K">
          Link…
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => chain().toggleBlockquote().run()}>Citação</MenuItem>
        <MenuItem onSelect={() => chain().toggleCodeBlock().run()}>Bloco de código</MenuItem>
        <MenuItem onSelect={() => chain().setHorizontalRule().run()}>Linha horizontal</MenuItem>
        <MenuItem onSelect={() => chain().toggleSuperscript().run()}>Sobrescrito</MenuItem>
        <MenuItem onSelect={() => chain().toggleSubscript().run()}>Subscrito</MenuItem>
      </>
    ),
    Review: (
      <>
        <MenuItem onSelect={actions.showWordCount}>Contagem de palavras</MenuItem>
        <MenuItem checked={spellcheck} onSelect={actions.toggleSpellcheck}>
          Verificação ortográfica
        </MenuItem>
        <MenuItem onSelect={actions.showHistory}>Histórico de versões</MenuItem>
      </>
    ),
    View: (
      <>
        <MenuLabel>Zoom</MenuLabel>
        {zoomLevels.map((z) => (
          <MenuItem checked={zoom === z} key={z} onSelect={() => actions.setZoom(z)}>
            {z}%
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem checked={showStructure} onSelect={actions.toggleStructure}>
          Painel de estrutura
        </MenuItem>
      </>
    ),
  };

  return (
    <header className="flex h-[50px] items-center gap-4 border-b border-vince-border bg-white px-5 print:hidden">
      <a
        aria-label="Voltar"
        className="inline-flex h-8 w-8 items-center justify-center rounded text-vince-muted hover:bg-vince-tertiary"
        href="/admin/instituicoes"
      >
        <EditorIcon className="h-4 w-4" name="arrowLeft" />
      </a>

      <div className="min-w-0 leading-tight">
        <div className="flex items-center gap-2">
          <input
            aria-label="Título do artigo"
            className="w-[280px] max-w-full rounded bg-transparent px-1 text-base font-bold text-vince-primary outline-none hover:bg-vince-tertiary focus:bg-vince-tertiary"
            onChange={(e) => onTitleChange(e.target.value)}
            value={title}
          />
          <Menu>
            <MenuTrigger asChild>
              <button
                className="shrink-0 rounded-full bg-vince-primary px-2 py-0.5 text-[10px] font-medium text-white"
                type="button"
              >
                {status}
              </button>
            </MenuTrigger>
            <MenuContent>
              {articleStatuses.map((st) => (
                <MenuItem checked={st === status} key={st} onSelect={() => onStatusChange(st)}>
                  {st}
                </MenuItem>
              ))}
            </MenuContent>
          </Menu>
        </div>
        <p className="flex items-center gap-1.5 px-1 text-[10px] text-vince-muted">
          Equipe Alpha <span>•</span>
          <EditorIcon className="h-3 w-3" name="cloud" /> {saveLabel}
        </p>
      </div>

      <nav aria-label="Menu do editor" className="ml-2 flex items-center gap-1 text-xs">
        {menuNames.map((name) => (
          <Menu key={name} onOpenChange={(open) => open && setActive(name)}>
            <MenuTrigger asChild>
              <button
                className={
                  active === name
                    ? 'border-b-2 border-vince-primary px-3 py-[15px] font-bold text-vince-primary'
                    : 'px-3 py-[15px] text-vince-muted hover:text-vince-primary'
                }
                type="button"
              >
                {name}
              </button>
            </MenuTrigger>
            <MenuContent>{items[name]}</MenuContent>
          </Menu>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-5">
        <button
          aria-label="Histórico de versões"
          className="text-vince-muted hover:text-vince-primary"
          onClick={actions.showHistory}
          type="button"
        >
          <EditorIcon className="h-4 w-4" name="history" />
        </button>
        <button
          className="text-xs text-vince-muted hover:text-vince-primary"
          onClick={actions.share}
          type="button"
        >
          Share
        </button>
        <Menu>
          <MenuTrigger asChild>
            <button
              className="rounded bg-vince-primary px-4 py-2 text-xs font-semibold text-white hover:bg-[#571424]"
              type="button"
            >
              Exportar
            </button>
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem onSelect={actions.print}>PDF / Imprimir…</MenuItem>
            <MenuItem onSelect={actions.exportWord}>Documento Word (.doc)</MenuItem>
            <MenuItem onSelect={actions.exportHtml}>Página web (.html)</MenuItem>
            <MenuItem onSelect={actions.exportText}>Texto simples (.txt)</MenuItem>
          </MenuContent>
        </Menu>
        <img
          alt="Usuária"
          className="h-6 w-6 rounded-full object-cover"
          src="/assets/admin-avatar.png"
        />
        <Menu>
          <MenuTrigger asChild>
            <button
              aria-label="Configurações"
              className="text-vince-muted hover:text-vince-primary"
              type="button"
            >
              <EditorIcon className="h-4 w-4" name="settings" />
            </button>
          </MenuTrigger>
          <MenuContent align="end">{settingsMenu}</MenuContent>
        </Menu>
      </div>
    </header>
  );
}
