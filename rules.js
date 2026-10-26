/* MODULO 행거 플래너 — 부품표·계산 규칙 (제안용 데모 · 모든 값은 예시)
   이 파일(표)만 바꾸면 화면·수량·견적·전원 검사가 같이 바뀌어요.
   실제 납품 때는 확정된 부품 리스트와 규칙으로 이 표를 채워요. */
(function (root) {
  var HANGER_RULES = {
    "version": "예시-2026.10",
    "room": { "ceilingH": 2400, "postLen": 2000, "wallGap": 300 },
    "lengths": [600, 800, 1000],
    "maxBays": 8,
    "share": { "posts": true, "connectors": true },

    "types": {
      "A": { "name": "롱 행거", "desc": "긴 옷 한 줄", "slots": [
        { "key": "r1", "kind": "rod", "h": 1700, "label": "행거봉" } ] },
      "B": { "name": "2단 행거", "desc": "셔츠·바지 두 줄", "slots": [
        { "key": "r1", "kind": "rod", "h": 2000, "label": "위 봉" },
        { "key": "r2", "kind": "rod", "h": 1000, "label": "아래 봉" } ] },
      "C": { "name": "선반 + 행거", "desc": "위 선반, 아래 봉", "slots": [
        { "key": "s1", "kind": "shelf", "h": 2100, "label": "위 선반" },
        { "key": "r1", "kind": "rod", "h": 1700, "label": "행거봉" } ] },
      "D": { "name": "선반장", "desc": "선반 네 칸", "slots": [
        { "key": "s1", "kind": "shelf", "h": 2100, "label": "선반 1" },
        { "key": "s2", "kind": "shelf", "h": 1600, "label": "선반 2" },
        { "key": "s3", "kind": "shelf", "h": 1100, "label": "선반 3" },
        { "key": "s4", "kind": "shelf", "h": 600, "label": "선반 4" } ] }
    },

    "elements": {
      "rod":   { "code": "ROD-{L}", "wired": false },
      "rodW":  { "code": "RDW-{L}", "wired": true },
      "light": { "code": "LT-{L}",  "wired": true },
      "shelf": { "code": "SH-{L}",  "wired": false }
    },

    "post":  { "code": "PST-2000", "wiredCode": "PST-2000W" },
    "perPost": [
      { "code": "CF-01", "qty": 1, "role": "foot" },
      { "code": "WA-300", "qty": 2 },
      { "code": "EC-01", "qty": 1 }
    ],
    "connectors": {
      "rod":   { "single": "CN-1", "double": "CN-2", "singleW": "CN-1W", "doubleW": "CN-2W" },
      "shelf": { "single": "SB-1", "double": "SB-2" }
    },
    "power": { "maxW": 100, "startFoot": "CF-01P" },

    "parts": {
      "PST-2000":  { "name": "기둥 2000", "group": "기둥", "price": 38000 },
      "PST-2000W": { "name": "전선 기둥 2000", "group": "기둥", "price": 52000 },
      "CF-01":     { "name": "천장 발", "group": "고정", "price": 9000 },
      "CF-01P":    { "name": "전원 천장 발", "group": "고정", "price": 24000 },
      "WA-300":    { "name": "벽 고정 암 300", "group": "고정", "price": 7000 },
      "EC-01":     { "name": "마그네틱 마감캡", "group": "고정", "price": 2000 },
      "CN-1":      { "name": "한쪽 커넥터", "group": "커넥터", "price": 4500 },
      "CN-2":      { "name": "양쪽 커넥터", "group": "커넥터", "price": 6000 },
      "CN-1W":     { "name": "한쪽 전선 커넥터", "group": "커넥터", "price": 8500 },
      "CN-2W":     { "name": "양쪽 전선 커넥터", "group": "커넥터", "price": 11000 },
      "SB-1":      { "name": "한쪽 선반 받침", "group": "커넥터", "price": 3000 },
      "SB-2":      { "name": "양쪽 선반 받침", "group": "커넥터", "price": 4000 },
      "ROD-600":   { "name": "행거봉 600", "group": "봉·선반", "price": 15000 },
      "ROD-800":   { "name": "행거봉 800", "group": "봉·선반", "price": 18000 },
      "ROD-1000":  { "name": "행거봉 1000", "group": "봉·선반", "price": 21000 },
      "RDW-600":   { "name": "전선 행거봉 600", "group": "봉·선반", "price": 23000 },
      "RDW-800":   { "name": "전선 행거봉 800", "group": "봉·선반", "price": 26000 },
      "RDW-1000":  { "name": "전선 행거봉 1000", "group": "봉·선반", "price": 29000 },
      "SH-600":    { "name": "선반 600", "group": "봉·선반", "price": 25000 },
      "SH-800":    { "name": "선반 800", "group": "봉·선반", "price": 30000 },
      "SH-1000":   { "name": "선반 1000", "group": "봉·선반", "price": 35000 },
      "LT-600":    { "name": "LED 등기구 600", "group": "조명", "price": 49000, "watt": 12 },
      "LT-800":    { "name": "LED 등기구 800", "group": "조명", "price": 59000, "watt": 16 },
      "LT-1000":   { "name": "LED 등기구 1000", "group": "조명", "price": 69000, "watt": 20 }
    }
  };
  root.HANGER_RULES = HANGER_RULES;
  if (typeof module !== 'undefined' && module.exports) module.exports = HANGER_RULES;
})(typeof window !== 'undefined' ? window : globalThis);
