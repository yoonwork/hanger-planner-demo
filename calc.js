/* MODULO 행거 플래너 — 수량·견적·전원 계산 (화면과 분리된 순수 함수)
   규칙은 rules.js 표에서만 읽어요. 브라우저와 node 테스트가 같은 코드를 써요. */
(function (root) {
  'use strict';

  var ROD_ELS = ['rod', 'rodW', 'light'];

  function slotsOf(rules, bay) {
    var t = rules.types[bay.type];
    return t ? t.slots : [];
  }
  function elementOf(bay, slot) {
    if (slot.kind === 'shelf') return 'shelf';
    var v = bay.slots && bay.slots[slot.key];
    return ROD_ELS.indexOf(v) >= 0 ? v : 'rod';
  }
  function elementCode(rules, el, len) {
    return rules.elements[el].code.replace('{L}', String(len));
  }
  function isWiredEl(rules, el) { return !!rules.elements[el].wired; }
  function bayWired(rules, bay) {
    return slotsOf(rules, bay).some(function (s) { return isWiredEl(rules, elementOf(bay, s)); });
  }
  function hasLights(rules, bays) {
    return bays.some(function (b) {
      return slotsOf(rules, b).some(function (s) { return elementOf(b, s) === 'light'; });
    });
  }
  function add(map, code, n) { if (!n) return; map[code] = (map[code] || 0) + n; if (!map[code]) delete map[code]; }
  function sumMaps(list) { var m = {}; list.forEach(function (x) { for (var k in x) add(m, k, x[k]); }); return m; }

  /* 기둥 목록: 이어 붙이면 칸 사이 기둥 하나를 두 칸이 같이 써요.
     ends = 이 기둥에 붙는 칸 끝 [{bay, side:'L'|'R'}] */
  function layoutPosts(rules, n, sharePosts) {
    var posts = [];
    if (sharePosts) {
      for (var p = 0; p <= n; p++) {
        var ends = [];
        if (p > 0) ends.push({ bay: p - 1, side: 'R' });
        if (p < n) ends.push({ bay: p, side: 'L' });
        posts.push({ ends: ends });
      }
    } else {
      for (var i = 0; i < n; i++) {
        posts.push({ ends: [{ bay: i, side: 'L' }] });
        posts.push({ ends: [{ bay: i, side: 'R' }] });
      }
    }
    return posts;
  }
  function bayPostIndex(n, sharePosts, bay, side) {
    if (sharePosts) return side === 'L' ? bay : bay + 1;
    return bay * 2 + (side === 'L' ? 0 : 1);
  }

  /* 한 줄(이어 붙인 칸들)의 부품 수량 */
  function countRow(rules, bays, opts) {
    opts = opts || {};
    var share = opts.share || rules.share || { posts: true, connectors: true };
    var n = bays.length;
    var posts = layoutPosts(rules, n, !!share.posts);
    var lights = hasLights(rules, bays);
    var start = (opts.powerStart == null || !lights) ? -1 : opts.powerStart;

    var bayItems = bays.map(function (b) {
      var m = {};
      slotsOf(rules, b).forEach(function (s) { add(m, elementCode(rules, elementOf(b, s), b.len), 1); });
      return m;
    });

    var postItems = posts.map(function (post, p) {
      var m = {};
      var groups = {}; var anyWired = false;
      post.ends.forEach(function (e) {
        var b = bays[e.bay];
        slotsOf(rules, b).forEach(function (s) {
          var el = elementOf(b, s);
          var w = isWiredEl(rules, el);
          if (w) anyWired = true;
          var key = s.kind + '@' + s.h;
          (groups[key] = groups[key] || { kind: s.kind, h: s.h, n: 0, wired: false });
          groups[key].n++; if (w) groups[key].wired = true;
        });
      });
      var conns = [];
      Object.keys(groups).forEach(function (k) {
        var g = groups[k]; var c = rules.connectors[g.kind];
        var wSuffix = g.wired && c.singleW ? 'W' : '';
        if (g.n >= 2 && share.connectors) {
          add(m, c['double' + wSuffix], 1);
          conns.push({ kind: g.kind, h: g.h, code: c['double' + wSuffix], sides: 2, wired: !!wSuffix });
        } else {
          add(m, c['single' + wSuffix], g.n);
          for (var i = 0; i < g.n; i++) conns.push({ kind: g.kind, h: g.h, code: c['single' + wSuffix], sides: 1, wired: !!wSuffix });
        }
      });
      var wiredPost = anyWired || p === start;
      add(m, wiredPost ? rules.post.wiredCode : rules.post.code, 1);
      rules.perPost.forEach(function (pp) {
        if (pp.role === 'foot' && p === start) { add(m, rules.power.startFoot, 1); add(m, pp.code, pp.qty - 1); }
        else add(m, pp.code, pp.qty);
      });
      post.wired = wiredPost; post.conns = conns; post.isStart = p === start;
      return m;
    });

    return { posts: posts, bayItems: bayItems, postItems: postItems, items: sumMaps(bayItems.concat(postItems)) };
  }

  /* 전원: 시작 기둥에서 전선 있는 부품(전선 봉·등기구)을 따라 닿는 기둥을 찾아요 */
  function checkPower(rules, cfg) {
    var bays = cfg.bays; var n = bays.length;
    var share = cfg.share || rules.share;
    var sp = !!share.posts;
    var nPosts = sp ? n + 1 : n * 2;
    var start = Math.min(Math.max(cfg.power | 0, 0), Math.max(nPosts - 1, 0));
    var adj = []; for (var i = 0; i < nPosts; i++) adj.push([]);
    bays.forEach(function (b, bi) {
      if (bayWired(rules, b)) {
        var a = bayPostIndex(n, sp, bi, 'L'), c = bayPostIndex(n, sp, bi, 'R');
        adj[a].push(c); adj[c].push(a);
      }
    });
    var reached = []; for (i = 0; i < nPosts; i++) reached.push(false);
    if (nPosts) { var q = [start]; reached[start] = true;
      while (q.length) { var x = q.shift(); adj[x].forEach(function (y) { if (!reached[y]) { reached[y] = true; q.push(y); } }); } }

    var lights = []; var totalW = 0;
    bays.forEach(function (b, bi) {
      slotsOf(rules, b).forEach(function (s) {
        if (elementOf(b, s) !== 'light') return;
        var code = elementCode(rules, 'light', b.len);
        var w = (rules.parts[code] && rules.parts[code].watt) || 0;
        totalW += w;
        lights.push({ bay: bi, key: s.key, h: s.h, code: code, watt: w, powered: reached[bayPostIndex(n, sp, bi, 'L')] });
      });
    });
    var maxW = rules.power.maxW;
    var unpowered = lights.filter(function (l) { return !l.powered; });
    var res = { start: start, nPosts: nPosts, reached: reached, lights: lights, totalW: totalW, maxW: maxW,
      overLimit: totalW > maxW, hasLights: lights.length > 0, unpowered: unpowered,
      ok: totalW <= maxW && unpowered.length === 0, fixes: [] };

    if (unpowered.length) {
      /* 고치는 방법 1: 모든 등기구에 닿는 시작 기둥 찾기 (가까운 곳부터) */
      var order = []; for (i = 0; i < nPosts; i++) order.push(i);
      order.sort(function (a, b) { return Math.abs(a - start) - Math.abs(b - start); });
      for (var k = 0; k < order.length; k++) {
        if (order[k] === start) continue;
        var t = checkPowerSimple(rules, cfg, order[k]);
        if (t) { res.fixes.push({ type: 'moveStart', post: order[k] }); break; }
      }
      /* 고치는 방법 2: 사이 칸의 봉을 전선 봉으로 (공유 기둥일 때) */
      if (sp) {
        var l = unpowered[0];
        var best = null;
        for (var r = 0; r < nPosts; r++) {
          if (!reached[r]) continue;
          var from, to;
          if (r <= l.bay) { from = r; to = l.bay - 1; } else { from = l.bay + 1; to = r - 1; }
          var need = []; var feasible = true;
          for (var bi2 = from; bi2 <= to; bi2++) {
            if (bayWired(rules, bays[bi2])) continue;
            var rodSlot = slotsOf(rules, bays[bi2]).filter(function (s) { return s.kind === 'rod'; })[0];
            if (!rodSlot) { feasible = false; break; }
            need.push({ bay: bi2, key: rodSlot.key, label: rodSlot.label });
          }
          if (feasible && (!best || need.length < best.length)) best = need;
        }
        if (best && best.length) res.fixes.push({ type: 'wireRods', rods: best });
      }
    }
    return res;
  }
  function checkPowerSimple(rules, cfg, start) {
    var c = { bays: cfg.bays, power: start, share: cfg.share };
    var r = checkPowerNoFix(rules, c);
    return r;
  }
  function checkPowerNoFix(rules, cfg) {
    var bays = cfg.bays; var n = bays.length; var share = cfg.share || rules.share; var sp = !!share.posts;
    var nPosts = sp ? n + 1 : n * 2; var start = cfg.power;
    var adj = []; for (var i = 0; i < nPosts; i++) adj.push([]);
    bays.forEach(function (b, bi) { if (bayWired(rules, b)) { var a = bayPostIndex(n, sp, bi, 'L'), c = bayPostIndex(n, sp, bi, 'R'); adj[a].push(c); adj[c].push(a); } });
    var reached = adj.map(function () { return false; }); reached[start] = true; var q = [start];
    while (q.length) { var x = q.shift(); adj[x].forEach(function (y) { if (!reached[y]) { reached[y] = true; q.push(y); } }); }
    return bays.every(function (b, bi) {
      return !slotsOf(rules, b).some(function (s) { return elementOf(b, s) === 'light'; }) || reached[bayPostIndex(n, sp, bi, 'L')];
    });
  }

  /* 전체 계산: 단독 합계 → 기둥별 바뀐 것 → 최종 */
  function compute(rules, cfg) {
    var share = cfg.share || rules.share;
    var bays = cfg.bays; var n = bays.length;
    var power = checkPower(rules, cfg);
    var fin = countRow(rules, bays, { share: share, powerStart: power.start });
    var solo = bays.map(function (b) { return countRow(rules, [b], { share: { posts: true, connectors: share.connectors } }); });
    var standalone = sumMaps(solo.map(function (s) { return s.items; }));

    var diffs = fin.posts.map(function (post, p) {
      var before = sumMaps(post.ends.map(function (e) { return solo[e.bay].postItems[e.side === 'L' ? 0 : 1]; }));
      var after = fin.postItems[p];
      var delta = {}; var k;
      for (k in after) add(delta, k, after[k]);
      for (k in before) add(delta, k, -before[k]);
      return { post: p, ends: post.ends, merged: post.ends.length > 1, isStart: post.isStart, before: before, after: after, delta: delta };
    });

    var price = function (code) { return (rules.parts[code] && rules.parts[code].price) || 0; };
    var codes = Object.keys(rules.parts);
    var allCodes = Object.keys(sumMaps([fin.items, standalone]));
    allCodes.sort(function (a, b) { return codes.indexOf(a) - codes.indexOf(b); });
    var lines = allCodes.map(function (code) {
      var part = rules.parts[code] || { name: code + ' (부품표에 없음)', group: '-', price: 0 };
      var q = fin.items[code] || 0;
      return { code: code, name: part.name, group: part.group, solo: standalone[code] || 0, qty: q, unit: price(code), amount: q * price(code) };
    });
    var total = 0, soloTotal = 0, qtyTotal = 0, soloQty = 0;
    lines.forEach(function (l) { total += l.amount; soloTotal += l.solo * l.unit; qtyTotal += l.qty; soloQty += l.solo; });
    var widthMm = bays.reduce(function (s, b) { return s + b.len; }, 0);
    return { rows: fin, standalone: standalone, items: fin.items, diffs: diffs, lines: lines.filter(function (l) { return l.qty || l.solo; }),
      total: total, soloTotal: soloTotal, qtyTotal: qtyTotal, soloQty: soloQty, power: power, widthMm: widthMm };
  }

  /* 링크에 담기: A8-B10wl-C6 · p0 */
  var LEN_CODE = { 600: '6', 800: '8', 1000: '10' };
  var EL_CODE = { rod: '', rodW: 'w', light: 'l' };
  function encode(rules, cfg) {
    var parts = cfg.bays.map(function (b) {
      var s = b.type + (LEN_CODE[b.len] || String(b.len / 100));
      var flags = slotsOf(rules, b).filter(function (x) { return x.kind === 'rod'; }).map(function (x) { return EL_CODE[elementOf(b, x)] || 'r'; });
      var str = flags.map(function (f) { return f || 'r'; }).join('').replace(/r+$/, '');
      return s + str;
    });
    return 'c=' + parts.join('-') + '&p=' + (cfg.power | 0);
  }
  function decode(rules, str) {
    var m = /c=([^&]*)/.exec(str || ''); if (!m) return null;
    var bays = [];
    var toks = decodeURIComponent(m[1]).split('-').filter(Boolean);
    for (var i = 0; i < toks.length && bays.length < rules.maxBays; i++) {
      var t = /^([A-Z])(\d+)([rwl]*)$/.exec(toks[i]); if (!t || !rules.types[t[1]]) continue;
      var len = Number(t[2]) * 100; if (rules.lengths.indexOf(len) < 0) continue;
      var bay = { type: t[1], len: len, slots: {} };
      var rods = rules.types[t[1]].slots.filter(function (x) { return x.kind === 'rod'; });
      rods.forEach(function (r, j) { var f = t[3][j]; bay.slots[r.key] = f === 'w' ? 'rodW' : f === 'l' ? 'light' : 'rod'; });
      bays.push(bay);
    }
    if (!bays.length) return null;
    var p = /p=(\d+)/.exec(str); var power = p ? Number(p[1]) : 0;
    return { bays: bays, power: Math.min(power, bays.length) };
  }

  function toCSV(result) {
    var rows = [['코드', '부품', '수량', '단가(원)', '금액(원)']];
    result.lines.filter(function (l) { return l.qty; }).forEach(function (l) { rows.push([l.code, l.name, l.qty, l.unit, l.amount]); });
    rows.push(['', '합계', result.qtyTotal, '', result.total]);
    return rows.map(function (r) { return r.map(function (c) { c = String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n');
  }

  /* 부품표가 쓸 수 있는지 검사 (화면에서 표를 고칠 때) */
  function validateRules(r) {
    var errs = [];
    if (!r || typeof r !== 'object') return ['표가 비었어요'];
    ['types', 'elements', 'post', 'perPost', 'connectors', 'power', 'parts', 'lengths'].forEach(function (k) { if (!r[k]) errs.push('"' + k + '" 칸이 없어요'); });
    if (errs.length) return errs;
    var need = [r.post.code, r.post.wiredCode, r.power.startFoot];
    r.perPost.forEach(function (p) { need.push(p.code); });
    Object.keys(r.connectors).forEach(function (k) { var c = r.connectors[k]; ['single', 'double', 'singleW', 'doubleW'].forEach(function (x) { if (c[x]) need.push(c[x]); }); });
    Object.keys(r.elements).forEach(function (e) { r.lengths.forEach(function (L) { need.push(r.elements[e].code.replace('{L}', L)); }); });
    need.forEach(function (c) { if (!r.parts[c]) errs.push('부품표에 "' + c + '"가 없어요'); });
    Object.keys(r.types).forEach(function (t) { (r.types[t].slots || []).forEach(function (s) { if (!r.connectors[s.kind]) errs.push(t + ' 형태의 "' + s.kind + '" 연결 규칙이 없어요'); }); });
    return errs;
  }

  var api = { slotsOf: slotsOf, elementOf: elementOf, elementCode: elementCode, countRow: countRow, checkPower: checkPower,
    compute: compute, encode: encode, decode: decode, toCSV: toCSV, validateRules: validateRules, bayPostIndex: bayPostIndex, sumMaps: sumMaps };
  root.HangerCalc = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
