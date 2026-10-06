import { useState } from 'react';

import { ArrowLeftIcon } from '@shared/ui';
import { cn } from '@shared/lib/cn';
import { loadTemplateId, saveTemplateId, templates, type TemplateId } from '../model/templates';

function Lines({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn('space-y-[3px]', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div
          className="h-[2px] rounded bg-[#c9c3c4]"
          key={i}
          style={{ width: i % 4 === 3 ? '70%' : '100%' }}
        />
      ))}
    </div>
  );
}

function Preview({ kind }: { kind: TemplateId }) {
  const bg =
    kind === 'official' ? 'bg-[#dcd8d8]' : kind === 'abnt' ? 'bg-[#eceaea]' : 'bg-[#dedcdb]';

  return (
    <div className={cn('flex h-[146px] items-start justify-center overflow-hidden', bg)}>
      {kind === 'official' && (
        <div className="mt-2 flex h-[170px] w-[120px] flex-col items-center gap-3 bg-white p-3 shadow">
          <div className="h-[3px] w-16 rounded bg-[#999]" />
          <div className="mt-4 w-full space-y-[3px]">
            <div className="mx-auto h-[4px] w-20 rounded bg-[#333]" />
            <div className="mx-auto h-[4px] w-16 rounded bg-[#333]" />
          </div>
          <div className="h-[2px] w-12 rounded bg-[#aaa]" />
          <div className="mt-6 h-[2px] w-16 rounded bg-[#aaa]" />
        </div>
      )}
      {kind === 'abnt' && (
        <div className="mt-2 w-[130px] bg-white p-2 shadow">
          <div className="mx-auto mb-2 h-[3px] w-12 rounded bg-[#999]" />
          <div className="grid grid-cols-2 gap-2">
            <Lines count={14} />
            <Lines count={14} />
          </div>
        </div>
      )}
      {kind === 'academic' && (
        <div className="mt-4 w-[170px] rounded-sm bg-white p-2 shadow">
          <div className="mx-auto mb-2 h-[3px] w-24 rounded bg-vince-secondary" />
          <div className="grid grid-cols-2 gap-2">
            <Lines count={12} />
            <Lines count={12} />
          </div>
        </div>
      )}
    </div>
  );
}

export function ChooseTemplatePage() {
  const [currentId] = useState(loadTemplateId);

  return (
    <div className="min-h-screen bg-vince-surface px-4 text-vince-text">
      <header className="relative mx-auto flex h-[88px] max-w-[1000px] items-center justify-center">
        <a
          className="absolute left-0 flex items-center gap-2 text-xs text-vince-muted hover:text-vince-primary"
          href="/artigos/editor"
        >
          <ArrowLeftIcon className="h-4 w-4" /> Voltar
        </a>
        <p className="text-sm font-semibold text-vince-primary">VinceArt</p>
      </header>

      <main className="mx-auto max-w-[1000px] pb-16 pt-8">
        <h1 className="text-center text-2xl font-bold text-vince-primary">
          Escolha o modelo do seu artigo
        </h1>
        <p className="mt-3 text-center text-xs text-vince-muted">
          Escolha o padrão de formatação que será utilizado no seu trabalho.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {templates.map((t) => {
            const isSelected = currentId === t.id;

            return (
              <article
                className={cn(
                  'relative flex flex-col overflow-hidden rounded-lg border bg-white',
                  isSelected ? 'border-2 border-vince-primary' : 'border-vince-border',
                )}
                key={t.id}
              >
                <div className="relative">
                  {(isSelected || t.recommended) && (
                    <div className="absolute left-2 top-2 z-10 flex gap-1">
                      {isSelected && (
                        <span className="rounded-full bg-vince-primary px-2 py-0.5 text-[10px] font-medium text-white">
                          Modelo atual
                        </span>
                      )}
                      {t.recommended && (
                        <span className="rounded-full bg-[#ff8fa6] px-2 py-0.5 text-[10px] font-medium text-vince-primary">
                          Recomendado
                        </span>
                      )}
                    </div>
                  )}
                  <Preview kind={t.id} />
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h2 className="min-h-[44px] text-sm font-bold leading-snug">{t.title}</h2>
                  <p className="mt-1 min-h-[34px] text-[11px] leading-snug text-vince-muted">
                    {t.description}
                  </p>
                  <button
                    className={cn(
                      'mt-4 h-[26px] rounded border text-[11px] font-medium transition-colors',
                      isSelected
                        ? 'border-vince-primary bg-vince-primary text-white hover:bg-[#571424]'
                        : 'border-vince-primary bg-white text-vince-primary hover:bg-vince-tertiary',
                    )}
                    onClick={() => {
                      saveTemplateId(t.id);
                      window.location.assign('/artigos/editor');
                    }}
                    type="button"
                  >
                    Usar este modelo
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
