import { useState } from 'react'
import { useT } from '../../i18n/useT'
import { scoreToAsciiTab } from '../../theory/asciiTab'
import { scoreToMusicXml } from '../../theory/musicXml'
import type { Score } from '../../theory/score'
import { downloadText, encodeScore, fileBase, shareUrl } from './share'

const item = 'block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-800'

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Download as JSON / text tab / MusicXML, print, or make a share link. */
export function ExportMenu({ score }: { score: Score }) {
  const { t } = useT()
  const [copied, setCopied] = useState<'txt' | 'link' | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const base = fileBase(score.title)

  const flash = (what: 'txt' | 'link') => {
    setCopied(what)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <details className="relative print:hidden">
      <summary className="cursor-pointer list-none rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800">{t('sheet.export')}</summary>
      <div className="absolute right-0 z-20 mt-1 w-80 max-w-[calc(100vw-2rem)] space-y-0.5 rounded-xl border border-stone-200 bg-white p-2 shadow-lg dark:border-stone-700 dark:bg-stone-900">
        <button type="button" className={item} onClick={() => downloadText(`${base}.json`, JSON.stringify(score, null, 2), 'application/json')}>
          {t('sheet.exportJson')}
        </button>
        <button type="button" className={item} onClick={() => downloadText(`${base}.txt`, scoreToAsciiTab(score), 'text/plain')}>
          {t('sheet.exportTxt')}
        </button>
        <button type="button" className={item} onClick={async () => (await copy(scoreToAsciiTab(score))) && flash('txt')}>
          {copied === 'txt' ? t('sheet.copied') : t('sheet.copyTxt')}
        </button>
        <button type="button" className={item} onClick={() => downloadText(`${base}.musicxml`, scoreToMusicXml(score), 'application/vnd.recordare.musicxml+xml')}>
          {t('sheet.exportXml')}
        </button>
        <button type="button" className={item} onClick={() => window.print()}>
          {t('sheet.print')}
        </button>
        <button type="button" className={item} onClick={async () => setLink(shareUrl(await encodeScore(score)))}>
          {t('sheet.shareLink')}
        </button>
        {link && (
          <div className="space-y-1.5 px-3 pb-1 pt-1">
            <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label={t('sheet.shareLink')} className="w-full rounded-md border border-stone-300 bg-stone-50 px-2 py-1 text-xs dark:border-stone-700 dark:bg-stone-950" />
            <button type="button" className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700" onClick={async () => (await copy(link)) && flash('link')}>
              {copied === 'link' ? t('sheet.copied') : t('sheet.copyLink')}
            </button>
            <p className="text-xs text-stone-500">{t('sheet.shareHint')}</p>
          </div>
        )}
      </div>
    </details>
  )
}
