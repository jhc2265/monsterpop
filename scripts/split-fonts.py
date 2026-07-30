"""Pretendard 가변 폰트를 unicode-range 조각으로 나눈다.

통짜 PretendardVariable.woff2 는 2MB 로, 본문 기본 폰트라 첫 화면부터 바로 받는다.
글자를 빼는 서브셋이 아니라 '범위를 나누는' 것이므로 어떤 글자도 사라지지 않는다 —
브라우저가 화면에 실제로 나온 글자의 조각만 받아간다.

핵심은 조각을 나누는 기준이다.
한글 음절은 코드포인트 순서와 사용 빈도가 무관해서, U+AC00-D7A3 을 12등분하면
히어로 한 화면("몬스터를 잡고, 콤보를 쌓아")만으로 12덩이 중 11개를 건드린다 —
1,878KB 로 통짜와 다를 게 없다.

그래서 앱 소스에 실제로 등장하는 한글(700자 남짓)을 'app' 조각 하나로 모은다.
UI 문구는 이 조각 하나로 끝나고, 닉네임·게시글처럼 예측할 수 없는 글자는
kr01~kr12 폴백 조각이 받는다. app 을 CSS 에서 맨 마지막에 선언해
겹치는 코드포인트에서 app 이 이기게 한다(뒤에 선언된 @font-face 가 우선).

    pip install fonttools brotli
    python scripts/split-fonts.py            # 없는 조각만 만든다
    python scripts/split-fonts.py --force    # 전부 다시 만든다 (14조각, 몇 분 걸림)

조각을 public/fonts/pretendard/ 에 만들고, src/index.css 에 넣을 @font-face 를 출력한다.
원본(PretendardVariable.woff2)은 조각을 다시 만들 때 필요하므로 지우지 말 것.
"""

import glob
import os
import subprocess
import sys

SRC = 'public/fonts/PretendardVariable.woff2'
OUT_DIR = 'public/fonts/pretendard'

# base 에는 UI 가 쓰는 기호를 몰아넣는다. 화살표(→ ›) · 별(★ ☆) · 하트(♥) · 번개(⚡) ·
# 연필(✎) · 시계(◷) 가 다른 조각에 흩어지면 첫 화면에서 왕복이 몇 번 더 생긴다.
BASE = (
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,'
    'U+2000-206F,U+20A9,U+20AC,U+2122,U+2190-21FF,U+2212,U+2215,'
    'U+2500-257F,U+25A0-25FF,U+2600-26FF,U+2700-27BF,'
    'U+3000-303F,U+FF00-FFEF,U+FEFF,U+FFFD'
)
# 한글 자모 — 조합 중간 상태나 'ㄴㄴ' 처럼 자모만 쓴 닉네임에 필요하다.
JAMO = 'U+1100-11FF,U+3130-318F,U+A960-A97F,U+D7B0-D7FF'

HANGUL_START, HANGUL_END, HANGUL_CHUNKS = 0xAC00, 0xD7A3, 12

SCAN_GLOBS = ['src/**/*.js', 'src/**/*.jsx']
SCAN_FILES = ['index.html', 'src/index.css']


def app_unicodes():
    """앱 소스에 실제로 등장하는 한글 음절을 unicode-range 문자열로 돌려준다."""
    text = ''
    paths = [p for pattern in SCAN_GLOBS for p in glob.glob(pattern, recursive=True)]
    for path in paths + SCAN_FILES:
        if os.path.exists(path):
            text += open(path, encoding='utf-8').read()
    points = sorted({ord(c) for c in text if HANGUL_START <= ord(c) <= HANGUL_END})
    if not points:
        return None, 0
    # 연속한 코드포인트는 범위로 접어 CSS 를 짧게 만든다.
    spans, start, prev = [], points[0], points[0]
    for cp in points[1:]:
        if cp == prev + 1:
            prev = cp
            continue
        spans.append((start, prev))
        start = prev = cp
    spans.append((start, prev))
    return ','.join(f'U+{a:04X}' if a == b else f'U+{a:04X}-{b:04X}' for a, b in spans), len(points)


def chunk_list():
    chunks = [('base', BASE), ('jamo', JAMO)]
    total = HANGUL_END - HANGUL_START + 1
    step = -(-total // HANGUL_CHUNKS)
    for i in range(HANGUL_CHUNKS):
        a = HANGUL_START + i * step
        b = min(a + step - 1, HANGUL_END)
        chunks.append((f'kr{i + 1:02d}', f'U+{a:04X}-{b:04X}'))
    # app 은 반드시 마지막이다 — 겹치는 코드포인트에서 이겨야 한다.
    app_range, count = app_unicodes()
    if app_range:
        print(f'앱 소스의 한글 {count}자를 app 조각으로 모읍니다.', file=sys.stderr)
        chunks.append(('app', app_range))
    return chunks


def face(name, unicodes):
    ranges = ', '.join(part.strip() for part in unicodes.split(','))
    return ('@font-face {\n'
            "  font-family: 'Pretendard';\n"
            f"  src: url('/fonts/pretendard/pretendard-{name}.woff2') format('woff2-variations');\n"
            '  font-weight: 100 900;\n'
            '  font-style: normal;\n'
            '  font-display: swap;\n'
            f'  unicode-range: {ranges};\n'
            '}')


def main():
    force = '--force' in sys.argv
    if not os.path.exists(SRC):
        sys.exit(f'원본을 찾을 수 없습니다: {SRC}')
    os.makedirs(OUT_DIR, exist_ok=True)

    chunks = chunk_list()
    faces = []
    for index, (name, unicodes) in enumerate(chunks, 1):
        dst = f'{OUT_DIR}/pretendard-{name}.woff2'
        if force or not os.path.exists(dst):
            print(f'[{index}/{len(chunks)}] {name} 생성 …', file=sys.stderr, flush=True)
            subprocess.run(
                [sys.executable, '-m', 'fontTools.subset', SRC,
                 f'--unicodes={unicodes}', '--flavor=woff2', '--layout-features=*',
                 f'--output-file={dst}'],
                check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
            )
        else:
            print(f'[{index}/{len(chunks)}] {name} 건너뜀 (이미 있음)', file=sys.stderr)
        faces.append(face(name, unicodes))
        print(f'      {os.path.getsize(dst) / 1024:.1f}KB', file=sys.stderr)

    print('\n'.join(faces))


if __name__ == '__main__':
    main()
