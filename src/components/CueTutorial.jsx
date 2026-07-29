// 사냥과 보스전이 같은 시트를 쓴다. 두 벌로 두면 신호를 고칠 때 한쪽만 고치게 된다.
// cues 는 index.css 의 .cue-demo-{demo} 애니메이션 이름과 1:1로 묶여 있다.
// 제스처가 아닌 걸 가르칠 때(섀도우 버스트)는 cues 대신 visual 을 넘긴다.
export default function CueTutorial({ kicker, title, subtitle, accent, cues, visual, notes, noteText, onClose, ctaLabel = '알겠어요' }) {
  return <div className="modal-overlay cue-tutorial-overlay">
    <section className="briefing-sheet cue-tutorial" style={accent ? { '--boss-color': accent } : undefined}>
      <header className="cue-tutorial-head">
        <span className="overline">{kicker}</span>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </header>

      {visual}

      {cues?.length > 0 && <ul className="cue-demos">
        {cues.map((cue) => <li key={cue.demo} className={`cue-demo cue-demo-${cue.demo}`}>
          <span className="cue-demo-stage" aria-hidden="true"><i className="cue-demo-hand" /></span>
          <b>{cue.label}</b>
          <span>{cue.copy}</span>
        </li>)}
      </ul>}

      {notes?.length > 0 && <ul className="cue-tutorial-notes">
        {notes.map((note) => <li key={note.key}><b>{note.key}</b><span>{note.copy}</span></li>)}
      </ul>}

      <p className="sheet-note">{noteText}</p>

      <button className="btn btn-primary sheet-cta" onClick={onClose}><span>{ctaLabel}</span></button>
    </section>
  </div>
}
