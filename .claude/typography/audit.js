/**
 * 타이포그래피 동적 검사 — audit-harness.html 에서 실행한다.
 *
 *   npm run build
 *   node .claude/typography/prepare.mjs
 *   npx vite preview --port 4173
 *   → http://localhost:4173/__audit.html 을 열고 DevTools 콘솔에 이 파일을 붙여넣는다.
 *
 * 정적 검사(audit-static.mjs)와 달리 실제 렌더 결과를 본다.
 * 핵심 목적: "선언이 아예 없어서 상속으로 떨어진" 요소를 잡는 것.
 * 지금까지 낸 회귀는 전부 이 유형이었다 (.community-intro 16px, .avatar 16px,
 * 레벨업 모달 전체, .xp-progress-values small …).
 *
 * CSSOM 을 쓰지 않고 CSS 텍스트를 직접 fetch 해 파싱하는 이유:
 * rule.style.getPropertyValue('font-size') 는 값에 var() 가 들어가면
 * 빈 문자열을 반환한다. CSSOM 으로 짜면 모든 규칙이 "선언 없음"으로 보인다.
 */
(async () => {
  const SCALE = [11, 12, 13, 15, 17, 20, 24, 48]   // --fs-* 토큰의 px 값

  const href = document.querySelector('link[rel=stylesheet]').href
  const css = await (await fetch(href, { cache: 'no-store' })).text()

  // --- CSS 파싱: font-size 를 선언하는 규칙만 수집 ---
  const flat = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@media[^{]*\{/g, '')                                       // 미디어쿼리는 평탄화
    .replace(/@(font-face|keyframes|-webkit-keyframes)[^{]*\{[\s\S]*?\}\s*\}/g, '')
  const rules = []
  for (const m of flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim()
    if (!sel || sel.startsWith('@')) continue
    const fs = m[2].match(/(?:^|;)\s*font-size:\s*([^;]+)/)
    if (!fs) continue
    for (const s of sel.split(',')) rules.push({ sel: s.trim(), val: fs[1].trim(), order: rules.length })
  }

  const spec = (s) => {
    const ids = (s.match(/#[\w-]+/g) || []).length
    const cls = (s.match(/\.[^\s.>+~:[]+/g) || []).length
      + (s.match(/\[[^\]]+\]/g) || []).length
      + (s.match(/:(?!:)[a-z-]+/g) || []).length
    const els = (s.match(/(?:^|[\s>+~])[a-zA-Z][\w-]*/g) || []).length
    return ids * 10000 + cls * 100 + els
  }
  const winner = (el) => {
    let best = null
    for (const r of rules) {
      let ok; try { ok = el.matches(r.sel) } catch { continue }
      if (!ok) continue
      const sp = spec(r.sel)
      if (!best || sp > best.sp || (sp === best.sp && r.order > best.order)) best = { ...r, sp }
    }
    return best
  }

  // --- 대비: 반투명 배경을 아래에서 위로 합성해야 정확하다 ---
  const P = (c) => { const a = c.match(/[\d.]+/g).map(Number); return { r: a[0], g: a[1], b: a[2], a: a.length > 3 ? a[3] : 1 } }
  const OV = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 })
  const BG = (el) => {
    const st = []
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = P(getComputedStyle(n).backgroundColor)
      if (c.a > 0) st.push(c)
    }
    st.push({ r: 5, g: 3, b: 19, a: 1 })                                  // body #050313
    let acc = st[st.length - 1]
    for (let i = st.length - 2; i >= 0; i--) acc = OV(st[i], acc)
    return acc
  }
  const LUM = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b) }
  const RATIO = (f, b) => { const x = LUM(f), y = LUM(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) }

  // 텍스트 노드를 직접 가진 요소만 검사한다 (래퍼 제외)
  const els = [...document.querySelectorAll('#root *')]
    .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))

  let tok = 0, rem = 0, inh = 0
  const px = [], small = [], heavy = [], contrast = [], offscale = []

  for (const e of els) {
    const w = winner(e), c = getComputedStyle(e)
    const size = parseFloat(c.fontSize), weight = +c.fontWeight
    const screen = (e.closest('[data-s]') || { dataset: { s: '?' } }).dataset.s
    const id = `${screen} · ${e.tagName.toLowerCase()}.${(e.className || '').toString().split(' ')[0]} "${e.textContent.trim().slice(0, 12)}"`

    if (!w) {
      inh++
      // 부모와 크기가 같으면 정상적인 상속(예: <span> in <h1>, <option> in <select>)
      const sameAsParent = e.parentElement
        && Math.round(parseFloat(getComputedStyle(e.parentElement).fontSize)) === Math.round(size)
      if (!SCALE.includes(Math.round(size)) && !sameAsParent) offscale.push(`${id} ${size}px`)
    } else if (/var\(--fs-/.test(w.val)) tok++
    else if (/rem|clamp/.test(w.val)) rem++
    else px.push(`${id} → ${w.val}  [규칙 ${w.sel}]`)

    if (size < 11) small.push(`${id} ${size}px`)
    if (weight >= 900) heavy.push(`${id} w${weight}`)   // <strong> 의 bolder 상속이 여기서 잡힌다

    const col = P(c.color)
    if (col.a > 0) {                                    // color:transparent + background-clip:text 는 제외
      const r = RATIO(col, BG(e))
      const need = size >= 18 || (size >= 14 && weight >= 700) ? 3 : 4.5
      if (r < need) contrast.push(`${id} ${size}px ${r.toFixed(2)}:1 < ${need}`)
    }
  }

  // 배경 이미지를 일부러 넘치게 깔고 overflow:hidden 으로 자르는 컨테이너들.
  // 텍스트 잘림이 아니므로 제외한다.
  //   .battle-arena  — .battle-background 가 transform: scale(1.015)
  //   .hero-landing  — .hero-world-art 가 뷰포트보다 넓게 배치
  //   .app-container — 하네스가 공통 요소를 화면 밖(left:-9999px)에 두기 때문
  const BLEED = ['battle-arena', 'hero-landing', 'app-container']
  const clip = [...document.querySelectorAll('#root *')].filter((x) => {
    const c = getComputedStyle(x)
    if (c.overflow === 'visible' && c.overflowX === 'visible') return false
    if (c.textOverflow === 'ellipsis' && c.whiteSpace === 'nowrap') return false   // 의도된 말줄임
    if (BLEED.some((k) => x.classList.contains(k))) return false
    return x.scrollWidth > x.clientWidth + 1 && x.textContent.trim().length
  }).map((x) => x.className)

  const line = (n, a) => `${n.padEnd(26)}${a.length ? `❌ ${a.length}건\n    ${a.join('\n    ')}` : '✅'}`
  const report = [
    '━━━ 타이포그래피 검사 ━━━',
    `텍스트 요소 ${els.length} · CSS 규칙 ${rules.length}`,
    `출처: 토큰 ${tok} / rem예외 ${rem} / 상속 ${inh}`,
    '',
    line('1. px 하드코딩', px),
    line('2. 11px 미만', small),
    line('3. font-weight ≥900', heavy),
    line('4. 대비 AA', contrast),
    line('5. 상속 스케일 이탈', offscale),
    line('6. 텍스트 잘림', clip),
    `${'7. 가로 오버플로'.padEnd(26)}${document.documentElement.scrollWidth > document.documentElement.clientWidth ? '❌' : '✅'}`,
  ].join('\n')

  console.log(report)
  return report
})()
