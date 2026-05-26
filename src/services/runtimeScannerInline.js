/**
 * runtimeScannerInline (sandbox-side bundle)
 *
 * This file is the audit-rules implementation that runs *inside* the
 * RuntimeAuditPanel's preview iframe. We import it as a raw string and
 * inject it as a <script> into the iframe's srcDoc so the iframe can be
 * locked down to sandbox="allow-scripts" — no allow-same-origin handle
 * back to the parent.
 *
 * The parent talks to this script via postMessage:
 *
 *   parent → iframe : { type: 'accessspec:scan' }
 *   iframe → parent : { type: 'accessspec:scan-result', report }
 *
 * Keep this file in lock-step with DomRuntimeScanner.ts — the rules,
 * thresholds, finding ids, and report shape MUST match so the two
 * implementations are interchangeable. The inline copy intentionally
 * inlines its color/contrast helpers (no imports) so it can run as a
 * single self-contained <script>.
 *
 * Plain JavaScript (no TypeScript) because Vite's `?raw` import returns
 * the file unmodified; the iframe needs runnable JS.
 */

(function () {
  'use strict';

  /* ============== Color / contrast helpers (inlined) ============== */

  function clamp01(n) { return Math.max(0, Math.min(1, n)); }

  function parseColor(input) {
    if (!input) return null;
    var s = String(input).trim().toLowerCase();
    if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    var hex = /^#([0-9a-f]{3,8})$/.exec(s);
    if (hex) {
      var h = hex[1];
      if (h.length === 3 || h.length === 4) {
        h = h.split('').map(function (c) { return c + c; }).join('');
      }
      var r = parseInt(h.substring(0, 2), 16);
      var g = parseInt(h.substring(2, 4), 16);
      var b = parseInt(h.substring(4, 6), 16);
      var a = h.length >= 8 ? parseInt(h.substring(6, 8), 16) / 255 : 1;
      return { r: r, g: g, b: b, a: a };
    }
    var rgb = /^rgba?\(([^)]+)\)$/.exec(s);
    if (rgb) {
      var parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
      if (parts.length < 3) return null;
      var R = parseFloat(parts[0]);
      var G = parseFloat(parts[1]);
      var B = parseFloat(parts[2]);
      var A = parts.length >= 4 ? parseFloat(parts[3]) : 1;
      return { r: R, g: G, b: B, a: clamp01(A) };
    }
    return null;
  }

  function composite(fg, bg) {
    var a = clamp01(fg.a);
    return {
      r: Math.round(fg.r * a + bg.r * (1 - a)),
      g: Math.round(fg.g * a + bg.g * (1 - a)),
      b: Math.round(fg.b * a + bg.b * (1 - a)),
    };
  }

  function relLuminance(c) {
    var srgb = [c.r, c.g, c.b].map(function (v) {
      var x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }

  function calculateContrast(fg, bg, opacity, underBg) {
    var fgRgb = fg;
    var bgRgb = bg;
    if (fg.a < 1) fgRgb = composite(fg, bg);
    if (typeof opacity === 'number' && opacity < 1 && underBg) {
      fgRgb = composite({ r: fgRgb.r, g: fgRgb.g, b: fgRgb.b, a: opacity }, underBg);
    }
    var L1 = relLuminance(fgRgb);
    var L2 = relLuminance(bgRgb);
    var lighter = Math.max(L1, L2);
    var darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /* ============== DOM walking helpers ============== */

  var CAPTURED_STYLE_PROPS = [
    'color', 'background-color', 'font-size', 'font-weight', 'line-height',
    'width', 'height', 'min-width', 'min-height', 'padding', 'margin',
    'display', 'position', 'visibility', 'opacity', 'overflow', 'pointer-events',
  ];
  var ARIA_PROPS_OF_INTEREST = [
    'role', 'aria-label', 'aria-labelledby', 'aria-describedby',
    'aria-hidden', 'aria-disabled', 'aria-expanded', 'aria-pressed',
    'aria-checked', 'aria-selected', 'aria-current', 'aria-modal',
    'aria-live', 'aria-controls', 'tabindex',
  ];
  var INTERACTIVE_SELECTOR = [
    'button', 'a[href]', 'input:not([type="hidden"])', 'select', 'textarea',
    '[role="button"]', '[role="link"]', '[role="checkbox"]', '[role="radio"]',
    '[role="switch"]', '[role="tab"]', '[role="menuitem"]', '[role="textbox"]',
    '[role="combobox"]', '[role="slider"]',
  ].join(', ');

  function captureComputed(win, el) {
    var cs = win.getComputedStyle(el);
    var out = {};
    for (var i = 0; i < CAPTURED_STYLE_PROPS.length; i++) {
      out[CAPTURED_STYLE_PROPS[i]] = cs.getPropertyValue(CAPTURED_STYLE_PROPS[i]);
    }
    return out;
  }

  function captureAria(el) {
    var out = {};
    for (var i = 0; i < ARIA_PROPS_OF_INTEREST.length; i++) {
      var v = el.getAttribute(ARIA_PROPS_OF_INTEREST[i]);
      if (v !== null) out[ARIA_PROPS_OF_INTEREST[i]] = v;
    }
    return out;
  }

  function shortSelector(el) {
    if (el.id) return '#' + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id);
    var tag = el.tagName.toLowerCase();
    var cls = [];
    if (typeof el.className === 'string') {
      cls = el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    }
    var path = tag + (cls.length ? '.' + cls.map(function (c) {
      return window.CSS && CSS.escape ? CSS.escape(c) : c;
    }).join('.') : '');
    if (el.parentElement) {
      var siblings = [];
      for (var i = 0; i < el.parentElement.children.length; i++) {
        if (el.parentElement.children[i].tagName === el.tagName) {
          siblings.push(el.parentElement.children[i]);
        }
      }
      if (siblings.length > 1) {
        return path + ':nth-of-type(' + (siblings.indexOf(el) + 1) + ')';
      }
    }
    return path;
  }

  function visibleText(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  function accessibleName(el) {
    var aria = el.getAttribute('aria-label');
    if (aria && aria.trim()) return aria.trim();
    var labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      var target = el.ownerDocument.getElementById(labelledby);
      if (target && target.textContent) return target.textContent.trim();
    }
    var text = visibleText(el);
    if (text) return text;
    var title = el.getAttribute('title');
    if (title && title.trim()) return title.trim();
    var placeholder = el.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) return placeholder.trim();
    if (el.value) return String(el.value).trim();
    return '';
  }

  function isElementVisible(rect, computed) {
    if (computed.display === 'none') return false;
    if (computed.visibility === 'hidden') return false;
    if (parseFloat(computed.opacity) === 0) return false;
    if (rect.width === 0 && rect.height === 0) return false;
    return true;
  }

  function parsePx(v) {
    if (!v) return null;
    var m = /^(-?\d+(?:\.\d+)?)px$/.exec(v.trim());
    return m ? parseFloat(m[1]) : null;
  }

  function effectiveBackground(win, el) {
    var cur = el;
    while (cur) {
      var raw = win.getComputedStyle(cur).backgroundColor;
      var c = parseColor(raw);
      if (c && c.a > 0) {
        if (c.a >= 1) return { r: c.r, g: c.g, b: c.b };
        var under = cur.parentElement
          ? effectiveBackground(win, cur.parentElement)
          : { r: 255, g: 255, b: 255 };
        return composite(c, under);
      }
      cur = cur.parentElement;
    }
    return { r: 255, g: 255, b: 255 };
  }

  /* ============== Rule constants (sync with DomRuntimeScanner.ts) ============== */

  var TARGET_MIN_PX = 24;
  var TARGET_COMFORT_PX = 44;
  var FONT_CRITICAL_PX = 11;
  var FONT_MIN_PX = 14;

  function pushFinding(list, id, args) {
    var el = args.el;
    var win = args.win;
    var rect = args.rect;
    list.push({
      id: id,
      ruleId: args.ruleId,
      severity: args.severity,
      category: args.category,
      message: args.message,
      selector: shortSelector(el),
      tagName: el.tagName.toLowerCase(),
      text: visibleText(el),
      snapshot: {
        boundingRect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        computed: captureComputed(win, el),
        aria: captureAria(el),
      },
    });
  }

  function emptySeverityCounts() { return { critical: 0, warning: 0, info: 0 }; }
  function emptyCategoryCounts() { return { touch: 0, a11y: 0, contrast: 0, visibility: 0, text: 0 }; }

  function scanRuntime(doc) {
    var win = doc.defaultView || window;
    var all = Array.prototype.slice.call(doc.querySelectorAll('*'));
    var interactive = Array.prototype.slice.call(doc.querySelectorAll(INTERACTIVE_SELECTOR));
    var findings = [];
    var counter = 0;

    /* ---- interactive-only audits ---- */
    for (var i = 0; i < interactive.length; i++) {
      var el = interactive[i];
      var rect = el.getBoundingClientRect();
      var computed = captureComputed(win, el);
      if (!isElementVisible(rect, computed)) continue;
      counter++;

      if (!accessibleName(el)) {
        pushFinding(findings, 'f' + counter + '-name', {
          el: el, win: win, rect: rect,
          ruleId: 'RT-NAME', severity: 'critical', category: 'a11y',
          message: 'Interactive ' + el.tagName.toLowerCase() + ' has no accessible name',
        });
      }

      var minSide = Math.min(rect.width, rect.height);
      if (minSide > 0 && minSide < TARGET_MIN_PX) {
        pushFinding(findings, 'f' + counter + '-touch-min', {
          el: el, win: win, rect: rect,
          ruleId: 'RT-TOUCH-MIN', severity: 'critical', category: 'touch',
          message: 'Touch target ' + Math.round(rect.width) + '×' + Math.round(rect.height) + 'px below 24×24 WCAG minimum',
        });
      } else if (minSide < TARGET_COMFORT_PX) {
        pushFinding(findings, 'f' + counter + '-touch-comfort', {
          el: el, win: win, rect: rect,
          ruleId: 'RT-TOUCH-COMFORT', severity: 'warning', category: 'touch',
          message: 'Touch target ' + Math.round(rect.width) + '×' + Math.round(rect.height) + 'px below 44×44 comfort threshold',
        });
      }

      var tabindex = el.getAttribute('tabindex');
      if (tabindex !== null && parseInt(tabindex, 10) >= 0) {
        if (rect.width === 0 || rect.height === 0) {
          pushFinding(findings, 'f' + counter + '-focus-zero', {
            el: el, win: win, rect: rect,
            ruleId: 'RT-FOCUS-ZERO', severity: 'warning', category: 'visibility',
            message: 'Focusable element has zero size — keyboard users land on nothing visible',
          });
        }
      }
    }

    /* ---- text + contrast audits across every element ---- */
    for (var j = 0; j < all.length; j++) {
      var tEl = all[j];
      var text = visibleText(tEl);
      if (!text) continue;
      var ownsText = false;
      for (var k = 0; k < tEl.childNodes.length; k++) {
        var n = tEl.childNodes[k];
        if (n.nodeType === 3 && (n.textContent || '').trim().length > 0) {
          ownsText = true;
          break;
        }
      }
      if (!ownsText) continue;

      var tRect = tEl.getBoundingClientRect();
      var tComputed = captureComputed(win, tEl);
      if (!isElementVisible(tRect, tComputed)) continue;

      var fs = parsePx(tComputed['font-size']);
      if (fs !== null && fs < FONT_CRITICAL_PX) {
        pushFinding(findings, 'f-text-' + (counter++) + '-crit', {
          el: tEl, win: win, rect: tRect,
          ruleId: 'RT-FONT-CRIT', severity: 'critical', category: 'text',
          message: 'font-size ' + fs + 'px is unreadably small',
        });
      } else if (fs !== null && fs < FONT_MIN_PX) {
        pushFinding(findings, 'f-text-' + (counter++) + '-min', {
          el: tEl, win: win, rect: tRect,
          ruleId: 'RT-FONT-MIN', severity: 'warning', category: 'text',
          message: 'font-size ' + fs + 'px is below 14px mobile minimum',
        });
      }

      var fg = parseColor(tComputed.color);
      if (!fg) continue;
      var bg = effectiveBackground(win, tEl);
      var opacity = parseFloat(tComputed.opacity || '1');
      var ratio = calculateContrast(fg, { r: bg.r, g: bg.g, b: bg.b, a: 1 }, opacity, bg);
      var fw = parseInt(tComputed['font-weight'], 10) || 400;
      var large = (fs || 0) >= 24 || ((fs || 0) >= 18.66 && fw >= 700);
      var aaThreshold = large ? 3 : 4.5;
      var aaaThreshold = large ? 4.5 : 7;
      if (ratio + 1e-6 < aaThreshold) {
        pushFinding(findings, 'f-contrast-' + (counter++), {
          el: tEl, win: win, rect: tRect,
          ruleId: 'RT-CONTRAST-AA', severity: 'warning', category: 'contrast',
          message: 'Contrast ' + ratio.toFixed(2) + ':1 fails AA (needs ' + aaThreshold + ':1)',
        });
      } else if (ratio + 1e-6 < aaaThreshold) {
        pushFinding(findings, 'f-contrast-aaa-' + (counter++), {
          el: tEl, win: win, rect: tRect,
          ruleId: 'RT-CONTRAST-AAA', severity: 'info', category: 'contrast',
          message: 'Contrast ' + ratio.toFixed(2) + ':1 fails AAA (needs ' + aaaThreshold + ':1)',
        });
      }
    }

    /* ---- aria-hidden ancestors over focusables ---- */
    for (var m = 0; m < interactive.length; m++) {
      var iEl = interactive[m];
      var iRect = iEl.getBoundingClientRect();
      var iComputed = captureComputed(win, iEl);
      if (!isElementVisible(iRect, iComputed)) continue;
      var parent = iEl.parentElement;
      while (parent) {
        if (parent.getAttribute('aria-hidden') === 'true') {
          pushFinding(findings, 'f-aria-hidden-' + (counter++), {
            el: iEl, win: win, rect: iRect,
            ruleId: 'RT-ARIA-HIDDEN-FOCUSABLE', severity: 'critical', category: 'a11y',
            message: 'Interactive element is inside an aria-hidden subtree',
          });
          break;
        }
        parent = parent.parentElement;
      }
    }

    /* ---- tallies ---- */
    var countsBySeverity = emptySeverityCounts();
    var countsByCategory = emptyCategoryCounts();
    for (var f = 0; f < findings.length; f++) {
      countsBySeverity[findings[f].severity]++;
      countsByCategory[findings[f].category]++;
    }

    return {
      scannedAt: Date.now(),
      elementCount: all.length,
      interactiveCount: interactive.length,
      findings: findings,
      countsBySeverity: countsBySeverity,
      countsByCategory: countsByCategory,
    };
  }

  /* ============== Postmessage wiring ============== */

  function runAndPost() {
    try {
      var report = scanRuntime(document);
      window.parent.postMessage(
        { type: 'accessspec:scan-result', report: report },
        '*',
      );
    } catch (err) {
      window.parent.postMessage(
        {
          type: 'accessspec:scan-error',
          message: err && err.message ? err.message : String(err),
        },
        '*',
      );
    }
  }

  window.addEventListener('message', function (ev) {
    if (ev && ev.data && ev.data.type === 'accessspec:scan') {
      runAndPost();
    }
  });

  // Kick off automatically once the iframe DOM settles, so the parent
  // doesn't need to explicitly request the first scan.
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(runAndPost, 0);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(runAndPost, 0);
    });
  }
})();
