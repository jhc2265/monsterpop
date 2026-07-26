/**
 * 타이포그래피 정적 검사 — CSS 텍스트만 본다. 브라우저 불필요.
 *
 *   node .claude/typography/audit-static.mjs
 *
 * 검사 항목
 *   1. font-size 가 토큰(var(--fs-*)) 또는 문서화된 rem/clamp 예외인가
 *   2. font-weight 가 토큰(var(--fw-*))인가
 *   3. letter-spacing 이 토큰(var(--ls-*)) 또는 0 인가
 *   4. line-height 가 토큰(var(--lh-*)) 또는 의도된 숫자값인가
 *
 * 이 검사가 잡지 못하는 것: "선언이 아예 없어서 상속으로 떨어진" 요소.
 * 그건 audit-harness.html + audit.js 로 브라우저에서 확인한다.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const CSS_PATH = path.join(ROOT, 'src/index.css')

// line-height 는 숫자 리터럴이 정당한 경우가 있다(꽉 조인 숫자·디스플레이 타입).
const LH_ALLOWED = new Set(['1', '1.1', '1.8', '.9', '.95'])

const raw = fs.readFileSync(CSS_PATH, 'utf8')
// 주석은 같은 길이의 공백으로 치환해 줄 번호를 보존한다.
const masked = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
// @font-face 의 font-weight: 100 900 은 가변폰트 범위 선언이므로 제외
const body = masked.replace(/@font-face\s*\{[^}]*\}/g, (m) => m.replace(/[^\n]/g, ' '))
const lines = body.split(/\r?\n/)
const rawLines = raw.split(/\r?\n/)

const checks = [
  { name: 'font-size', re: /font-size:\s*([^;}]+)/, ok: (v) => /var\(--fs-/.test(v) || /rem|clamp\(/.test(v) },
  { name: 'font-weight', re: /font-weight:\s*([^;}]+)/, ok: (v) => /var\(--fw-/.test(v) },
  { name: 'letter-spacing', re: /letter-spacing:\s*([^;}]+)/, ok: (v) => /var\(--ls-/.test(v) || v.trim() === '0' || /em$/.test(v.trim()) },
  { name: 'line-height', re: /line-height:\s*([^;}]+)/, ok: (v) => /var\(--lh-/.test(v) || LH_ALLOWED.has(v.trim()) },
]

let failed = 0
console.log(`정적 검사 — ${path.relative(ROOT, CSS_PATH)} (${rawLines.length}줄)\n`)

for (const c of checks) {
  const hits = []
  const bad = []
  lines.forEach((line, i) => {
    const g = new RegExp(c.re.source, 'g')
    let m
    while ((m = g.exec(line))) {
      hits.push(m[1])
      if (!c.ok(m[1])) bad.push(`  ${String(i + 1).padStart(4)}: ${rawLines[i].trim().slice(0, 110)}`)
    }
  })
  const label = `${c.name} (${hits.length}건)`.padEnd(28)
  if (bad.length) { failed += bad.length; console.log(`${label}❌ ${bad.length}건\n${bad.join('\n')}`) }
  else console.log(`${label}✅`)
}

// 스케일 밖 rem 값을 참고로 나열 (글리프·디스플레이는 정상)
const rems = [...body.matchAll(/font-size:\s*([^;}]*(?:rem|clamp)[^;}]*)/g)].map((m) => m[1].trim())
if (rems.length) console.log(`\nrem/clamp 예외 ${rems.length}건: ${[...new Set(rems)].join(', ')}`)

console.log(failed ? `\n실패 ${failed}건` : '\n전부 통과')
process.exit(failed ? 1 : 0)
