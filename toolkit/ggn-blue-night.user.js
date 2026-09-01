// ==UserScript==
// @name         Blue Night Toolkit
// @namespace    https://github.com/nowtl/ggn-blue-night
// @version      0.5.0
// @description  Companion panel for the Blue Night theme on GazelleGames: palettes, logos and layout options the site does not offer.
// @author       nowtl
// @homepageURL  https://github.com/nowtl/ggn-blue-night
// @match        https://gazellegames.net/*
// @run-at       document-start
// @grant        none
// @noframes
// @downloadURL  https://raw.githubusercontent.com/nowtl/ggn-blue-night/main/toolkit/ggn-blue-night.user.js
// @updateURL    https://raw.githubusercontent.com/nowtl/ggn-blue-night/main/toolkit/ggn-blue-night.user.js
// ==/UserScript==

(function () {
  'use strict';

  var VERSION = '0.5.0';
  var SCHEMA = 2;
  var STORE_KEY = 'ggn-blue-night';
  var CACHE_KEY = 'ggn-blue-night:manifest';
  var MANIFEST_URL = 'https://nowtl.github.io/ggn-blue-night/toolkit/features.json';

  var root = document.documentElement;

  /* ---- state ---------------------------------------------------------- */

  function blank() {
    return { v: SCHEMA, features: {} };
  }

  function migrate(state) {
    if (state.v === SCHEMA) return state;
    var features = state.features;
    if (features.palette) {
      if (features.palette === 'daylight') features.mode = 'light';
      else features.theme = features.palette;
      delete features.palette;
      state.dirty = true;
    }
    state.v = SCHEMA;
    return state;
  }

  function load() {
    var raw = null;
    try {
      raw = localStorage.getItem(STORE_KEY);
    } catch (e) {
      return blank();
    }
    if (!raw) return blank();

    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return blank();
    }
    if (!parsed || typeof parsed !== 'object') return blank();
    if (!parsed.features || typeof parsed.features !== 'object') parsed.features = {};
    var migrated = migrate(parsed);
    if (migrated.dirty) { delete migrated.dirty; save(migrated); }
    return migrated;
  }

  function save(state) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  /* ---- apply ---------------------------------------------------------- */

  function attrFor(id) {
    return 'data-ggn-' + id;
  }

  function prefersLight() {
    try {
      return window.matchMedia('(prefers-color-scheme: light)').matches;
    } catch (e) {
      return false;
    }
  }

  function resolve(id, value) {
    if (id !== 'mode' || value !== 'system') return value;
    return prefersLight() ? 'light' : 'dark';
  }

  function applyOne(id, stored) {
    var value = resolve(id, stored);
    if (value === true) root.setAttribute(attrFor(id), 'on');
    else if (typeof value === 'string' && value) root.setAttribute(attrFor(id), value);
    else root.removeAttribute(attrFor(id));
  }

  function applyAll(state) {
    root.setAttribute('data-ggn-toolkit', '1');
    Object.keys(state.features).forEach(function (id) {
      applyOne(id, state.features[id]);
    });
  }

  var settings = load();
  applyAll(settings);

  try {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () {
      if (settings.features.mode === 'system') applyOne('mode', 'system');
    });
  } catch (e) {}

  /* ---- theme handshake ------------------------------------------------ */

  function token(name) {
    var raw = '';
    try {
      raw = getComputedStyle(root).getPropertyValue(name);
    } catch (e) {}
    return raw.trim().replace(/^["']|["']$/g, '');
  }

  function list(name) {
    var raw = token(name);
    if (!raw) return [];
    return raw.split(',').map(function (part) {
      return part.trim();
    }).filter(Boolean);
  }

  /* ---- manifest ------------------------------------------------------- */

  var FALLBACK_MANIFEST = { version: 0, features: [] };

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.features)) return parsed;
    } catch (e) {}
    return null;
  }

  function writeCache(manifest) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(manifest));
    } catch (e) {}
  }

  function fetchManifest() {
    return fetch(MANIFEST_URL, { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (manifest) {
        if (!manifest || !Array.isArray(manifest.features)) throw new Error('bad manifest');
        writeCache(manifest);
        return manifest;
      })
      .catch(function () {
        return readCache() || FALLBACK_MANIFEST;
      });
  }

  function expand(feature) {
    if (feature.type !== 'select' || !feature.from) return feature;
    var values = list(feature.from);
    var options = [{ value: '', label: feature.defaultLabel || 'Default' }];
    values.forEach(function (value) {
      var described = (feature.options || []).filter(function (option) {
        return option.value === value;
      })[0];
      options.push(described || { value: value, label: value });
    });
    return {
      id: feature.id,
      type: 'select',
      group: feature.group,
      label: feature.label,
      help: feature.help,
      preview: feature.preview,
      options: options
    };
  }

  /* ---- panel ---------------------------------------------------------- */

  var RAMP = ['--surface-2', '--surface-5', '--surface-7', '--line-3', '--line-4'];

  var probes = null;

  function probeHost() {
    if (probes && probes.isConnected) return probes;
    probes = document.createElement('div');
    probes.setAttribute('aria-hidden', 'true');
    probes.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
    document.body.appendChild(probes);
    return probes;
  }

  function readRamp(node) {
    var style = getComputedStyle(node);
    var colors = RAMP.map(function (name) { return style.getPropertyValue(name).trim(); });
    return colors.every(Boolean) ? colors : [];
  }

  function rampFor(id, value) {
    try {
      if (!value) {
        var attribute = attrFor(id);
        var current = root.getAttribute(attribute);
        if (current !== null) root.removeAttribute(attribute);
        var base = readRamp(root);
        if (current !== null) root.setAttribute(attribute, current);
        return base;
      }
      var host = probeHost();
      var probe = host.querySelector('[data-ggn-swatch="' + value + '"]');
      if (!probe) {
        probe = document.createElement('div');
        probe.setAttribute('data-ggn-swatch', value);
        host.appendChild(probe);
      }
      var found = readRamp(probe);
      var rootRamp = readRamp(root);
      return found.join() === rootRamp.join() && root.getAttribute(attrFor(id)) !== value ? [] : found;
    } catch (e) {
      return [];
    }
  }


  var GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" aria-hidden="true">' +
    '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0"/>' +
    '<circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>';

  var PANEL_CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:var(--f);margin:0}',
    '.launcher{position:fixed;right:20px;bottom:20px;display:grid;place-items:center;',
    'width:38px;height:38px;padding:0;color:var(--dim);background:var(--raised);',
    'border:1px solid var(--line);border-radius:10px;cursor:pointer;',
    'transition:color .2s,background .2s,border-color .2s}',
    '.launcher svg{width:18px;height:18px}',
    '.launcher:hover{color:#fff;background:var(--accent);border-color:var(--accent)}',
    '.launcher[aria-expanded="true"]{color:#fff;background:var(--accent);border-color:var(--accent)}',
    '.launcher:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
    '.pop{position:fixed;right:20px;bottom:68px;display:flex;flex-direction:column;',
    'width:304px;max-width:calc(100vw - 40px);max-height:min(72vh,560px);',
    'color:var(--ink);background:var(--surface);border:1px solid var(--line);',
    'border-radius:10px;box-shadow:0 1rem 2.5rem rgba(0,0,0,.5);font-size:13px;',
    'line-height:1.5;opacity:0;transform:translateY(6px) scale(.98);transform-origin:bottom right;',
    'pointer-events:none;transition:opacity .16s ease,transform .16s ease}',
    '.open .pop{opacity:1;transform:none;pointer-events:auto}',
    'header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;',
    'padding:13px 15px;border-bottom:1px solid var(--line)}',
    'h1{font-size:15px;font-weight:700;letter-spacing:-.01em}',
    '.ver{margin-top:2px;color:var(--faint);font-size:11px;letter-spacing:.06em;text-transform:uppercase}',
    '.close{display:grid;place-items:center;width:26px;height:26px;color:var(--dim);font-size:18px;',
    'line-height:1;background:none;border:1px solid transparent;border-radius:6px;cursor:pointer}',
    '.close:hover{color:#fff;background:var(--raised);border-color:var(--line)}',
    '.status{padding:9px 15px;color:var(--faint);font-size:11px;letter-spacing:.05em;',
    'text-transform:uppercase;border-bottom:1px solid var(--line)}',
    '.status.miss{color:var(--warn)}',
    '.body{flex:1;min-height:0;overflow-y:auto;padding:4px 15px 15px;border-radius:0 0 9px 9px}',
    '.group{padding-top:16px}',
    '.group h2{margin-bottom:8px;color:var(--faint);font-size:10px;font-weight:700;',
    'letter-spacing:.12em;text-transform:uppercase}',
    '.feat{padding:10px 0;border-top:1px solid var(--line-soft)}',
    '.group .feat:first-of-type{border-top:0}',
    '.feat .name{display:flex;align-items:center;justify-content:space-between;gap:10px;font-weight:600}',
    '.feat .help{margin-top:3px;color:var(--dim);font-size:11.5px;line-height:1.45}',
    '.choices{display:flex;flex-direction:column;gap:5px;margin-top:9px}',
    '.choices + .help{margin-top:8px}',
    '.help:empty{display:none}',
    '.choice{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;',
    'padding:8px 10px;color:var(--dim);font-size:12.5px;font-weight:600;text-align:left;',
    'background:var(--raised);border:1px solid var(--line);border-radius:6px;cursor:pointer;',
    'transition:color .18s,background .18s,border-color .18s}',
    '.choice:hover{color:var(--ink);border-color:var(--line-hi)}',
    '.choice[aria-pressed="true"]{color:var(--ink);border-color:var(--accent);',
    'background:color-mix(in srgb, var(--accent) 14%, var(--raised))}',
    '.ramp{display:flex;flex:none;gap:3px}',
    '.chip{width:13px;height:13px;border:1px solid rgba(255,255,255,.10);border-radius:3px}',
    '.dot{flex:none;width:12px;height:12px;border:1px solid rgba(255,255,255,.18);border-radius:50%}',
    '.sw{position:relative;flex:none;width:34px;height:19px;background:var(--raised);',
    'border:1px solid var(--line);border-radius:20px;cursor:pointer;transition:all .18s}',
    '.sw::after{content:"";position:absolute;top:2px;left:2px;width:13px;height:13px;',
    'background:var(--dim);border-radius:50%;transition:all .18s}',
    '.sw[aria-pressed="true"]{background:var(--accent);border-color:var(--accent)}',
    '.sw[aria-pressed="true"]::after{left:16px;background:#fff}',
    '.empty{padding:26px 0;color:var(--faint);font-size:12px;text-align:center}',
    '@media (prefers-reduced-motion:reduce){*{transition:none!important}}'
  ].join('');

  function paint(shell) {
    var vars = {
      '--f': '"Open Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      '--surface': token('--surface-3') || '#1e2333',
      '--raised': token('--surface-5') || '#262b39',
      '--line': token('--line-2') || '#3a4056',
      '--line-soft': token('--line-1') || '#2f3a52',
      '--line-hi': token('--line-3') || '#4a5470',
      '--ink': token('--ink-1') || '#e6ebf5',
      '--dim': token('--ink-4') || '#99a1b3',
      '--faint': token('--ink-6') || '#7d879b',
      '--accent': token('--fg-accent') || '#4281da',
      '--warn': token('--fg-warn') || '#dfa02d',
      '--danger': token('--fg-bad') || '#c33b4b'
    };
    Object.keys(vars).forEach(function (name) {
      shell.style.setProperty(name, vars[name]);
    });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function build() {
    if (document.getElementById('ggn-toolkit-host')) return;

    var host = el('div');
    host.id = 'ggn-toolkit-host';
    host.style.cssText = 'position:relative;z-index:2147483000';
    document.body.appendChild(host);

    var shadow = host.attachShadow({ mode: 'open' });
    var style = document.createElement('style');
    style.textContent = PANEL_CSS;
    shadow.appendChild(style);

    var shell = el('div', 'shell');
    shadow.appendChild(shell);
    paint(shell);

    var launcher = el('button', 'launcher');
    launcher.innerHTML = GEAR;
    launcher.setAttribute('aria-label', 'Blue Night Toolkit');
    launcher.title = 'Blue Night Toolkit';

    var pop = el('div', 'pop');
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Blue Night Toolkit');

    var head = el('header');
    var titles = el('div');
    titles.appendChild(el('h1', null, 'Blue Night'));
    titles.appendChild(el('p', 'ver', 'Toolkit ' + VERSION));
    var close = el('button', 'close', '×');
    close.setAttribute('aria-label', 'Close');
    head.appendChild(titles);
    head.appendChild(close);

    var themeVersion = token('--ggn-theme-version');
    var status = el('p', 'status' + (themeVersion ? '' : ' miss'),
      themeVersion ? 'Theme ' + themeVersion : 'Blue Night stylesheet not detected');

    var body = el('div', 'body');

    pop.appendChild(head);
    pop.appendChild(status);
    pop.appendChild(body);
    shell.appendChild(launcher);
    shell.appendChild(pop);

    function setOpen(open) {
      shell.classList.toggle('open', open);
      launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
      pop.inert = !open;
      if (open) close.focus();
    }

    pop.inert = true;
    launcher.setAttribute('aria-expanded', 'false');

    launcher.addEventListener('click', function () {
      setOpen(!shell.classList.contains('open'));
    });
    close.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('click', function (event) {
      if (!host.isConnected || !shell.classList.contains('open')) return;
      if (event.composedPath().indexOf(host) === -1) setOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && host.isConnected) setOpen(false);
    });


    var lastManifest = FALLBACK_MANIFEST;

    function commit(id, value) {
      if (value === false || value === '') delete settings.features[id];
      else settings.features[id] = value;
      applyOne(id, value);
      save(settings);
      paint(shell);
      render(body, lastManifest);
    }

    function render(container, manifest) {
      lastManifest = manifest;
      container.textContent = '';

      var features = (manifest.features || []).map(expand).filter(function (feature) {
        return feature.type !== 'select' || (feature.options && feature.options.length > 1);
      });

      if (!features.length) {
        container.appendChild(el('p', 'empty', 'No options available yet.'));
        return;
      }

      var groups = [];
      var byName = {};
      features.forEach(function (feature) {
        var name = feature.group || 'Options';
        if (!byName[name]) {
          byName[name] = [];
          groups.push(name);
        }
        byName[name].push(feature);
      });

      groups.forEach(function (name) {
        var section = el('div', 'group');
        section.appendChild(el('h2', null, name));

        byName[name].forEach(function (feature) {
          var row = el('div', 'feat');
          var name_ = el('div', 'name');
          name_.appendChild(el('span', null, feature.label || feature.id));
          row.appendChild(name_);

          if (feature.type === 'toggle') {
            var sw = el('button', 'sw');
            sw.setAttribute('aria-pressed', settings.features[feature.id] === true ? 'true' : 'false');
            sw.setAttribute('aria-label', feature.label || feature.id);
            sw.addEventListener('click', function () {
              var next = sw.getAttribute('aria-pressed') !== 'true';
              sw.setAttribute('aria-pressed', next ? 'true' : 'false');
              commit(feature.id, next);
            });
            name_.appendChild(sw);
          }

          if (feature.help) row.appendChild(el('p', 'help', feature.help));

          if (feature.type === 'select') {
            var choices = el('div', 'choices');
            var hint = el('p', 'help');
            var describe = function (option) {
              hint.textContent = option && option.help ? option.help : '';
            };
            feature.options.forEach(function (option) {
              var choice = el('button', 'choice');
              choice.appendChild(el('span', null, option.label || option.value));
              var colors = feature.preview === 'ramp' ? rampFor(feature.id, option.value) : [];
              if (colors.length) {
                var ramp = el('span', 'ramp');
                colors.forEach(function (colour) {
                  var chip = el('span', 'chip');
                  chip.style.background = colour;
                  ramp.appendChild(chip);
                });
                choice.appendChild(ramp);
              } else if (option.swatch) {
                var dot = el('span', 'dot');
                dot.style.background = option.swatch;
                choice.appendChild(dot);
              }
              var current = settings.features[feature.id] || '';
              choice.setAttribute('aria-pressed', current === option.value ? 'true' : 'false');
              if (current === option.value) describe(option);
              choice.addEventListener('click', function () {
                [].forEach.call(choices.children, function (sibling) {
                  sibling.setAttribute('aria-pressed', 'false');
                });
                choice.setAttribute('aria-pressed', 'true');
                describe(option);
                commit(feature.id, option.value);
              });
              choices.appendChild(choice);
            });
            row.appendChild(choices);
            row.appendChild(hint);
          }

          section.appendChild(row);
        });

        container.appendChild(section);
      });
    }

    render(body, FALLBACK_MANIFEST);
    fetchManifest().then(function (manifest) {
      render(body, manifest);
    });
  }

  function start() {
    try {
      build();
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
