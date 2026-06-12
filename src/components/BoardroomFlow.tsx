import { Fragment } from 'react'
import type { CSSProperties } from 'react'

/**
 * A miniature of the AI-boardroom's actual discussion screen: a short
 * conversation of avatar + role + stance + utterance cards stacked top to
 * bottom, the directors arguing first and the CEO chair summarising last. It's
 * a fixed mock of one real session (a 20% price-rise question) so the split of
 * stances is visible at a glance. Tokens and type follow the rest of the site —
 * mono for the abbreviations, body font (lang="ja") for the Japanese, one teal
 * accent plus neutral greys, no new hue. The cards fade up in sequence so it
 * reads as a meeting building up; under prefers-reduced-motion they rest static.
 */
type Stance = 'for' | 'conditional' | 'against' | 'chair'

type Message = {
  abbr: 'CFO' | 'CMO' | 'COO' | 'CEO'
  role: string
  stance: Stance
  stanceLabel: string
  say: string
}

const MESSAGES: Message[] = [
  {
    abbr: 'CFO',
    role: '最高財務責任者',
    stance: 'against',
    stanceLabel: '反対',
    say: '粗利率35%で競合より安い中、20%の値上げは販売減を招くリスクが高い',
  },
  {
    abbr: 'CMO',
    role: '最高マーケティング責任者',
    stance: 'conditional',
    stanceLabel: '条件付き賛成',
    say: 'ブランド価値を高める好機。付加価値を訴求できれば顧客維持は可能',
  },
  {
    abbr: 'COO',
    role: '最高執行責任者',
    stance: 'against',
    stanceLabel: '反対',
    say: '値上げで15%減なら売上はマイナス。現場の負担増も避けられない',
  },
  {
    abbr: 'CEO',
    role: '議長',
    stance: 'chair',
    stanceLabel: '総括',
    say: '論点とリスクを整理し、判断の材料を提示する',
  },
]

export default function BoardroomFlow() {
  // a single running index drives the staggered fade-up across cards + divider
  let i = 0
  return (
    <div className="boardroom" aria-label="AI経営会議の議論画面: 役員が立場を述べ、議長CEOが総括する">
      <ol className="meeting">
        {MESSAGES.map((m) => (
          <Fragment key={m.abbr}>
            {m.stance === 'chair' && (
              <li className="meeting__divider" aria-hidden="true" style={{ '--i': i++ } as CSSProperties}>
                <span lang="ja">議長総括</span>
              </li>
            )}
            <li
              className={`meeting__msg is-${m.stance}${m.stance === 'chair' ? ' meeting__msg--chair' : ''}`}
              data-abbr={m.abbr}
              style={{ '--i': i++ } as CSSProperties}
            >
              <span className="meeting__avatar mono" aria-hidden="true">
                {m.abbr}
              </span>
              <div className="meeting__body">
                <div className="meeting__head">
                  <span className="meeting__abbr mono">{m.abbr}</span>
                  <span className="meeting__role" lang="ja">
                    {m.role}
                  </span>
                  <span className="meeting__badge" lang="ja">
                    {m.stanceLabel}
                  </span>
                </div>
                <p className="meeting__say" lang="ja">
                  {m.say}
                </p>
              </div>
            </li>
          </Fragment>
        ))}
      </ol>
    </div>
  )
}
