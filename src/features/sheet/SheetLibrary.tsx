import { useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Select } from '../../components/ui/Select'
import type { MessageKey } from '../../i18n/messages'
import { useT } from '../../i18n/useT'
import { parseAsciiTab } from '../../theory/asciiTab'
import { readScore } from '../../theory/scoreIO'
import { btn, btnPrimary, card, keyName } from './ui'
import { deleteSheet, loadSheet, newSheetId, saveSheet, sheetsSnapshot, subscribeSheets } from './sheetStore'
import { TEMPLATE_IDS, buildTemplate, type TemplateId } from './templates'

/** `#/sheet` — the user's saved scores and the starter templates. */
export function SheetLibrary() {
  const { t, locale } = useT()
  const navigate = useNavigate()
  const sheets = useSyncExternalStore(subscribeSheets, sheetsSnapshot)
  const [template, setTemplate] = useState<TemplateId>('empty')

  const create = () => {
    const id = newSheetId()
    const title = template === 'empty' ? '' : t(`sheet.template.${template}` as MessageKey)
    saveSheet(buildTemplate(template, id, title))
    navigate(`/sheet/${id}`)
  }

  const duplicate = (id: string) => {
    const s = loadSheet(id)
    if (!s) return
    saveSheet({ ...s, id: newSheetId(), title: t('sheet.copyOf', { title: s.title || t('sheet.untitled') }) })
  }

  const [message, setMessage] = useState<string | null>(null)
  const [pasted, setPasted] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  /** Opens an imported score (a .json from this app, or a text tab). Returns false if nothing could be read. */
  const importText = (text: string, title: string): boolean => {
    const id = newSheetId()
    let json: unknown = null
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
    const fromJson = json ? readScore({ ...(json as object), id }, id) : null
    if (fromJson) {
      saveSheet(fromJson)
      navigate(`/sheet/${id}`)
      return true
    }
    const tab = parseAsciiTab(text, id)
    if (!tab) return false
    saveSheet({ ...tab.score, title })
    navigate(`/sheet/${id}`)
    if (tab.skipped) window.alert(t('sheet.importSkipped', { n: tab.skipped }))
    return true
  }

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const name = file.name.replace(/\.[^.]+$/, '')
    if (!importText(await file.text(), name)) setMessage(t('sheet.importBad'))
  }

  const remove = (id: string, title: string) => {
    if (window.confirm(t('sheet.confirmDelete', { title: title || t('sheet.untitled') }))) deleteSheet(id)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{t('sheet.title')}</h1>
        <p className="text-stone-600 dark:text-stone-400">{t('sheet.intro')}</p>
      </header>

      <section className={`${card} flex flex-wrap items-end gap-3`}>
        <div className="min-w-[16rem] flex-1">
          <Select
            label={t('sheet.template')}
            value={template}
            options={TEMPLATE_IDS.map((id) => ({ value: id, label: t(`sheet.template.${id}` as MessageKey) }))}
            onChange={(v) => setTemplate(v as TemplateId)}
          />
        </div>
        <button type="button" className={btnPrimary} onClick={create}>
          {t('sheet.new')}
        </button>
        <button type="button" className={btn} onClick={() => fileInput.current?.click()}>
          {t('sheet.importFile')}
        </button>
        <input ref={fileInput} type="file" accept=".json,.txt,application/json,text/plain" className="hidden" onChange={importFile} aria-label={t('sheet.importFileAria')} />
        {message && (
          <p role="status" className="w-full text-sm text-red-600 dark:text-red-400">
            {message}
          </p>
        )}
        <details className="w-full">
          <summary className="cursor-pointer text-sm font-medium">{t('sheet.pasteTab')}</summary>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-stone-500">{t('sheet.pasteTabHint')}</p>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={8}
              spellCheck={false}
              aria-label={t('sheet.pasteTab')}
              placeholder={'e|-----------------|\nB|-----------------|\nG|---------2-------|\nD|-----2-------2---|\nA|-3---------------|\nE|-----------------|'}
              className="w-full rounded-lg border border-stone-300 bg-white p-2 font-mono text-xs dark:border-stone-700 dark:bg-stone-950"
            />
            <button type="button" className={btn} disabled={!pasted.trim()} onClick={() => !importText(pasted, t('sheet.importedTitle')) && setMessage(t('sheet.importNoTab'))}>
              {t('sheet.pasteTabButton')}
            </button>
          </div>
        </details>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('sheet.myScores')}</h2>
        {sheets.length === 0 && <p className="text-sm text-stone-500">{t('sheet.empty')}</p>}
        <ul className="grid gap-3 sm:grid-cols-2">
          {sheets.map((s) => (
            <li key={s.id} className={`${card} flex flex-col gap-3`}>
              <div>
                <Link to={`/sheet/${s.id}`} className="font-semibold hover:text-rose-600">
                  {s.title || t('sheet.untitled')}
                </Link>
                <p className="text-sm text-stone-500">{t('sheet.summary', { key: keyName(s.keySig), tempo: s.tempo, bars: s.bars })}</p>
                <p className="text-xs text-stone-400">{new Date(s.updated).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}</p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <Link to={`/sheet/${s.id}`} className={btn}>
                  {t('sheet.open')}
                </Link>
                <button type="button" className={btn} onClick={() => duplicate(s.id)}>
                  {t('sheet.duplicate')}
                </button>
                <button type="button" className={`${btn} text-red-600 dark:text-red-400`} onClick={() => remove(s.id, s.title)}>
                  {t('sheet.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
