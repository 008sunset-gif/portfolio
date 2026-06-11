import type { ReactNode } from 'react'

export type Work = {
  index: string
  title: string
  oneLiner: string
  description: string
  tech: string[]
  live?: string
  code: string
}

type Props = {
  work: Work
  media: ReactNode
  mediaCaption: string
  reverse?: boolean
}

/**
 * One work as a large editorial block: a framed instrument "viewport" on one
 * side, the write-up on the other. Alternates sides via `reverse`. The links
 * are explicit buttons so it's obvious where each one goes.
 */
export default function WorkRow({ work, media, mediaCaption, reverse = false }: Props) {
  return (
    <article className={`work ${reverse ? 'work--reverse' : ''}`} data-reveal-group>
      <div className="work__media" data-reveal>
        <div className="viewport">
          <div className="viewport__inner">{media}</div>
          <span className="viewport__corner viewport__corner--tl" />
          <span className="viewport__corner viewport__corner--tr" />
          <span className="viewport__corner viewport__corner--bl" />
          <span className="viewport__corner viewport__corner--br" />
          <span className="viewport__caption mono">{mediaCaption}</span>
        </div>
      </div>

      <div className="work__text">
        <div className="work__head" data-reveal>
          <span className="work__index mono">{work.index}</span>
          <h3 className="work__title mono">{work.title}</h3>
        </div>
        <p className="work__oneliner" data-reveal lang="ja">
          {work.oneLiner}
        </p>
        <p className="work__desc" data-reveal lang="ja">
          {work.description}
        </p>
        <ul className="work__tech" data-reveal aria-label="使用技術">
          {work.tech.map((t) => (
            <li className="work__tag mono" key={t}>
              {t}
            </li>
          ))}
        </ul>
        <div className="work__links" data-reveal>
          {work.live && (
            <a
              href={work.live}
              target="_blank"
              rel="noopener noreferrer"
              className="work__cta work__cta--live"
            >
              <span aria-hidden="true">▶</span> デモを見る
              <span className="work__cta-sub mono">Live</span>
            </a>
          )}
          <a href={work.code} target="_blank" rel="noopener noreferrer" className="work__cta">
            <span aria-hidden="true">{'</>'}</span> コードを見る
            <span className="work__cta-sub mono">GitHub</span>
          </a>
        </div>
      </div>
    </article>
  )
}
