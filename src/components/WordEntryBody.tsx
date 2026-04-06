import type { GlossaryWord } from '../types'
import { mediaUrl } from '../mediaUrl'

type Props = {
  w: GlossaryWord
}

export function WordEntryBody({ w }: Props) {
  const audioSrc = mediaUrl(w.audioUrl)
  return (
    <div className="word-entry-body">
      {w.definition ? (
        <p className="word-block">
          <span className="word-label">Definition</span>
          <span className="word-block__text">{w.definition}</span>
        </p>
      ) : null}
      {audioSrc ? (
        <div className="word-block word-block--audio">
          <span className="word-label">Audio</span>
          <audio className="word-audio" controls preload="metadata" src={audioSrc} />
        </div>
      ) : null}
      {w.paraanNgPagbigkas ? (
        <p className="word-block">
          <span className="word-label">Paraan ng pagbigkas</span>
          <span className="word-block__text">{w.paraanNgPagbigkas}</span>
        </p>
      ) : null}
      {w.bahagiNgPananalita ? (
        <p className="word-block">
          <span className="word-label">Bahagi ng pananalita</span>
          <span className="word-block__text">{w.bahagiNgPananalita}</span>
        </p>
      ) : null}
      {w.kahulugangPangGramatika ? (
        <p className="word-block">
          <span className="word-label">Kahulugang pang-gramatika</span>
          <span className="word-block__text">{w.kahulugangPangGramatika}</span>
        </p>
      ) : null}
      {w.salinSaIloko ? (
        <p className="word-block">
          <span className="word-label">Salin sa Iloko</span>
          <span className="word-block__text">{w.salinSaIloko}</span>
        </p>
      ) : null}
      {w.salinSaKapampangan ? (
        <p className="word-block">
          <span className="word-label">Salin sa Kapampangan</span>
          <span className="word-block__text">{w.salinSaKapampangan}</span>
        </p>
      ) : null}
      {w.halimbawaPangungusap ? (
        <p className="word-block">
          <span className="word-label">Halimbawa sa pangungusap (Filipino, Iloko, Kapampangan)</span>
          <span className="word-block__text word-block__text--pre">{w.halimbawaPangungusap}</span>
        </p>
      ) : null}
    </div>
  )
}
