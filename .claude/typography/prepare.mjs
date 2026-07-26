/**
 * 동적 검사 준비 — 하네스와 현재 CSS 를 dist/ 로 복사한다.
 *
 *   npm run build && node .claude/typography/prepare.mjs
 *   npx vite preview --port 4173
 *   → http://localhost:4173/__audit.html 를 열고 콘솔에 audit.js 붙여넣기
 *
 * dist/ 를 쓰는 이유: vite dev 서버는 .claude 같은 점(.) 디렉터리를 서빙하지 않는다.
 * dist/ 는 .gitignore 에 있어 저장소를 더럽히지 않고, vite build 가 매번 비운다.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')
const DIST = path.join(ROOT, 'dist')

if (!fs.existsSync(DIST)) {
  console.error('dist/ 가 없습니다. 먼저 `npm run build` 를 실행하세요.')
  process.exit(1)
}

// 하네스는 소스 CSS(/src/index.css)를 참조하지만, preview 서버에서는
// dist 로 복사한 사본(/__css.css)을 봐야 하므로 링크를 바꿔 쓴다.
const harness = fs.readFileSync(path.join(HERE, 'audit-harness.html'), 'utf8')
  .replace('/src/index.css', '/__css.css')

fs.writeFileSync(path.join(DIST, '__audit.html'), harness)
fs.copyFileSync(path.join(ROOT, 'src/index.css'), path.join(DIST, '__css.css'))

console.log('준비 완료:')
console.log('  dist/__audit.html   (하네스)')
console.log('  dist/__css.css      (src/index.css 사본)')
console.log('\n다음: npx vite preview --port 4173')
console.log('      http://localhost:4173/__audit.html 에서 audit.js 실행')
