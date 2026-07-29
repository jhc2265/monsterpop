// 설정에 진동 스위치는 있었지만 navigator.vibrate 를 부르는 곳이 없어 실제로는 죽은 설정이었다.
//
// 웹에서는 진동 세기(진폭)를 지정할 수 없다. navigator.vibrate 는 지속시간 패턴만 받는다.
// 그래서 "약하게/강하게" 대신 상황별 길이와 리듬으로 구분한다.
// iOS 사파리는 vibrate 자체를 지원하지 않아 조용히 넘어간다.
let enabled = false

export function setVibrationEnabled(value) {
  enabled = Boolean(value)
}

function buzz(pattern) {
  if (!enabled) return
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try { navigator.vibrate(pattern) } catch { /* 미지원 브라우저는 무시 */ }
}

export const haptics = {
  hit() { buzz(12) },                     // 성공은 짧게 — 연타에도 거슬리지 않아야 한다
  miss() { buzz(38) },                    // 실패는 한 번 묵직하게
  mechanic() { buzz([0, 26, 70, 26]) },   // 보스 기믹은 두 번 두드려 "뭔가 일어났다"를 알린다
  burst() { buzz([0, 45, 55, 70]) },
  clear() { buzz([0, 40, 90, 40, 90, 110]) },
}
