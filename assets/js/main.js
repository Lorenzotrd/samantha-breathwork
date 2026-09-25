/* ──────────────────────────────────────────────────────────────
   Samantha Breathwork — landing FR / EN
   Aucune dépendance. Chargé en `defer` sur / et /en/.
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ── Réglages : tout ce qui se modifie est ici ───────────────── */

  // Lien de réservation de l'appel découverte (tous les boutons « Réserver »).
  var CALENDLY_URL = 'https://calendly.com/samanthabreathwork-fyum/30min';

  // Identifiants de suivi. Tant qu'ils restent entre crochets, rien n'est chargé.
  var META_PIXEL_ID = '[META_PIXEL_ID]';
  var GA4_ID = '[GA4_MEASUREMENT_ID]';

  // Prix : le seul endroit où les changer. `per` = prix par séance affiché sous les packs.
  var PRICES = {
    EUR: {
      single: 90,
      pack3: 250, pack3Per: 83,
      pack5: 390, pack5Per: 78,
      coaching: 950,
      singleLabel: { fr: '1ère séance', en: 'First session' }
    },
    AUD: {
      single: 150,
      pack3: 390, pack3Per: 130,
      pack5: 650, pack5Per: 130,
      coaching: 1500,
      singleLabel: { fr: 'Séance 1h30', en: 'Single session' }
    }
  };

  // GeoJS : gratuit, sans clé, CORS ouvert (ipapi.co répond 429 dès le palier gratuit).
  var IP_LOOKUP_URL = 'https://get.geojs.io/v1/ip/country.json';
  var EUROPE_COUNTRIES = ['AD','AL','AT','BA','BE','BG','CH','CY','CZ','DE','DK','EE','ES','FI','FR','GB','GR','HR','HU','IE','IS','IT','LI','LT','LU','LV','MC','MD','ME','MK','MT','NL','NO','PL','PT','RO','RS','SE','SI','SK','SM','UA','VA','GP','MQ','GF','RE','YT','PM','BL','MF','NC','PF','WF'];
  var IP_LOOKUP_TIMEOUT_MS = 1500;
  var CURRENCY_STORAGE_KEY = 'sb_currency';

  var BREATH = { inhale: 4, hold: 2, exhale: 6, cycles: 6 };

  /* ── Textes par langue ───────────────────────────────────────── */

  var LANG = document.documentElement.lang === 'en' ? 'en' : 'fr';
  var DEFAULT_CURRENCY = LANG === 'en' ? 'AUD' : 'EUR';

  var TEXT = {
    fr: {
      noteManual: 'Devise choisie manuellement',
      noteDetected: 'Devise détectée automatiquement selon ta localisation',
      noteDefault: 'Prix affichés en euros',
      inhale: 'Inspire', hold: 'Retiens', exhale: 'Expire', done: 'Bravo',
      cycle: function (n, t) { return 'Cycle ' + n + ' sur ' + t; },
      finished: 'Exercice terminé. Comment te sens-tu ?',
      start: 'Commencer · 1 min', stop: 'Arrêter'
    },
    en: {
      noteManual: 'Currency selected manually',
      noteDetected: 'Currency detected automatically from your location',
      noteDefault: 'Prices shown in Australian dollars',
      inhale: 'Breathe in', hold: 'Hold', exhale: 'Breathe out', done: 'Well done',
      cycle: function (n, t) { return 'Cycle ' + n + ' of ' + t; },
      finished: 'Exercise complete. How do you feel?',
      start: 'Start · 1 min', stop: 'Stop'
    }
  };
  var T = TEXT[LANG];

  /* ── Suivi (Meta Pixel + GA4) ────────────────────────────────── */

  function isConfigured(id) { return typeof id === 'string' && id.length > 0 && id.charAt(0) !== '['; }

  function loadScript(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function initMetaPixel() {
    if (!isConfigured(META_PIXEL_ID)) return;
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; }(window, document);
    /* eslint-enable */
    loadScript('https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  function initGA4() {
    if (!isConfigured(GA4_ID)) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID, { anonymize_ip: true, allow_google_signals: false });
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID));
  }

  function newEventId() {
    return 'sb-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function trackMeta(eventName, params) {
    if (typeof window.fbq !== 'function') return;
    // API Conversions de Meta (à brancher plus tard) : envoyer le même évènement
    // côté serveur avec le même `event_id` pour que Meta déduplique navigateur + serveur.
    // Ex. une fonction serverless POST /api/meta-capi { event_name, event_id, event_source_url }.
    window.fbq('track', eventName, params || {}, { eventID: newEventId() });
  }

  function trackGA(eventName, params) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params || {});
  }

  /* ── Réservation ─────────────────────────────────────────────── */

  function initBooking() {
    document.querySelectorAll('[data-book]').forEach(function (link) {
      link.setAttribute('href', CALENDLY_URL);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener');
      link.addEventListener('click', function () {
        var placement = link.getAttribute('data-book') || 'cta';
        trackMeta('Schedule', { content_name: placement });
        trackGA('book_call_click', { placement: placement, language: LANG });
      });
    });
  }

  /* ── Devise ──────────────────────────────────────────────────── */

  var currency = { value: DEFAULT_CURRENCY, source: 'default' };

  function readStoredCurrency() {
    try {
      var v = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
      return PRICES[v] ? v : null;
    } catch (e) { return null; }
  }

  function storeCurrency(value) {
    try { window.localStorage.setItem(CURRENCY_STORAGE_KEY, value); } catch (e) { /* stockage bloqué : le choix vaut pour la visite */ }
  }

  function currencyFromTimeZone() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz.indexOf('Australia/') === 0) return 'AUD';
      if (tz.indexOf('Europe/') === 0) return 'EUR';
    } catch (e) { /* Intl indisponible : on passe à l'IP */ }
    return null;
  }

  function currencyFromIp() {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, IP_LOOKUP_TIMEOUT_MS);
    return fetch(IP_LOOKUP_URL, { signal: controller ? controller.signal : undefined, credentials: 'omit' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data) return null;
        var country = String(data.country || '').toUpperCase();
        if (country === 'AU') return 'AUD';
        if (EUROPE_COUNTRIES.indexOf(country) !== -1) return 'EUR';
        return null;
      })
      .catch(function () { return null; })
      .then(function (result) { clearTimeout(timer); return result; });
  }

  function formatAmount(amount, cur, withCode) {
    var n = new Intl.NumberFormat(LANG === 'fr' ? 'fr-FR' : 'en-AU', { maximumFractionDigits: 0 }).format(amount);
    if (cur === 'EUR') return LANG === 'fr' ? n + ' €' : '€' + n;
    if (LANG === 'fr') return n + ' $' + (withCode ? ' AUD' : '');
    return '$' + n + (withCode ? ' AUD' : '');
  }

  function renderPrices() {
    var p = PRICES[currency.value];
    document.querySelectorAll('[data-price]').forEach(function (el) {
      var key = el.getAttribute('data-price');
      if (key === 'singleLabel') { el.textContent = p.singleLabel[LANG]; return; }
      if (typeof p[key] !== 'number') return;
      var isPerSession = /Per$/.test(key);
      el.textContent = formatAmount(p[key], currency.value, !isPerSession);
    });
    document.querySelectorAll('[data-currency]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-currency') === currency.value));
    });
    var note = document.querySelector('[data-currency-note]');
    if (note) {
      note.textContent = currency.source === 'manual' ? T.noteManual
        : currency.source === 'detected' ? T.noteDetected
        : (currency.value === 'EUR' && LANG === 'en') ? 'Prices shown in euros'
        : (currency.value === 'AUD' && LANG === 'fr') ? 'Prix affichés en dollars australiens'
        : T.noteDefault;
    }
  }

  function setCurrency(value, source) {
    if (!PRICES[value]) return;
    currency = { value: value, source: source };
    renderPrices();
  }

  function initCurrency() {
    document.querySelectorAll('[data-currency]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var value = btn.getAttribute('data-currency');
        storeCurrency(value);
        setCurrency(value, 'manual');
        trackGA('currency_switch', { currency: value, language: LANG });
      });
    });

    // Lien forcé, ex. bio Instagram : /?devise=aud ou /en?currency=eur
    var fromUrl = null;
    try {
      var params = new URLSearchParams(window.location.search);
      fromUrl = String(params.get('devise') || params.get('currency') || '').toUpperCase();
    } catch (e) { fromUrl = null; }
    if (fromUrl && PRICES[fromUrl]) { setCurrency(fromUrl, 'detected'); return; }

    var stored = readStoredCurrency();
    if (stored) { setCurrency(stored, 'manual'); return; }

    var fromTz = currencyFromTimeZone();
    if (fromTz) { setCurrency(fromTz, 'detected'); return; }

    setCurrency(DEFAULT_CURRENCY, 'default');
    currencyFromIp().then(function (fromIp) {
      // Ne pas écraser un choix fait pendant la requête.
      if (fromIp && currency.source === 'default') setCurrency(fromIp, 'detected');
    });
  }

  /* ── Menu mobile ─────────────────────────────────────────────── */

  function initMenu() {
    var toggle = document.querySelector('[data-menu-toggle]');
    var menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;
    function close() { menu.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
    toggle.addEventListener('click', function () {
      var open = !menu.classList.contains('is-open');
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ── CTA collant mobile + ViewContent sur les tarifs ─────────── */

  function initObservers() {
    if (!('IntersectionObserver' in window)) return;

    var hero = document.querySelector('.hero');
    var sticky = document.querySelector('.sticky-cta');
    if (hero && sticky) {
      new IntersectionObserver(function (entries) {
        var visible = !entries[0].isIntersecting;
        sticky.classList.toggle('is-visible', visible);
        sticky.setAttribute('aria-hidden', String(!visible));
        sticky.querySelectorAll('a').forEach(function (a) { a.tabIndex = visible ? 0 : -1; });
      }).observe(hero);
    }

    var pricing = document.getElementById(LANG === 'en' ? 'pricing' : 'tarifs');
    if (pricing) {
      var seen = false;
      new IntersectionObserver(function (entries, obs) {
        if (seen || !entries[0].isIntersecting) return;
        seen = true;
        trackMeta('ViewContent', { content_name: 'pricing', content_category: 'offers' });
        trackGA('view_pricing', { language: LANG });
        obs.disconnect();
      }, { threshold: 0.35 }).observe(pricing);
    }
  }

  /* ── Témoignages vidéo ───────────────────────────────────────── */

  function initVideos() {
    document.querySelectorAll('.t-media').forEach(function (media) {
      var video = media.querySelector('video');
      var play = media.querySelector('.t-play');
      if (!video || !play) return;
      play.addEventListener('click', function () {
        document.querySelectorAll('.t-media video').forEach(function (other) { if (other !== video) other.pause(); });
        media.classList.add('is-playing');
        video.setAttribute('controls', '');
        var p = video.play();
        if (p && typeof p.catch === 'function') p.catch(function () { /* lecture refusée : les contrôles restent disponibles */ });
        trackGA('testimonial_play', { name: media.getAttribute('data-name') || '' });
      });
    });

    var track = document.querySelector('.t-track');
    var dots = document.querySelectorAll('.t-dots span');
    if (!track || !dots.length) return;
    track.addEventListener('scroll', function () {
      var cards = track.children;
      var center = track.scrollLeft + track.clientWidth / 2;
      var active = 0;
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].offsetLeft <= center) active = i;
      }
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === active); });
    }, { passive: true });
  }

  /* ── Exercice de respiration ─────────────────────────────────── */

  function initBreathing() {
    var circle = document.querySelector('.breathe__circle');
    var word = document.querySelector('.breathe__word');
    var count = document.querySelector('.breathe__count');
    var button = document.querySelector('[data-breathe-toggle]');
    if (!circle || !word || !count || !button) return;

    var timers = [];
    var running = false;
    var phases = [
      { key: 'inhale', cls: 'is-in', secs: BREATH.inhale },
      { key: 'hold', cls: 'is-hold', secs: BREATH.hold },
      { key: 'exhale', cls: 'is-out', secs: BREATH.exhale }
    ];

    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function show(phase, cycle) {
      circle.classList.remove('is-in', 'is-hold', 'is-out');
      circle.style.transitionDuration = phase.secs + 's';
      circle.classList.add(phase.cls);
      word.textContent = T[phase.key];
      count.textContent = T.cycle(cycle, BREATH.cycles);
    }

    function reset(message) {
      clearTimers();
      running = false;
      circle.classList.remove('is-in', 'is-hold', 'is-out');
      circle.style.transitionDuration = '1s';
      word.textContent = message ? T.done : T.inhale;
      count.textContent = message || T.cycle(1, BREATH.cycles);
      button.textContent = T.start;
      button.setAttribute('aria-pressed', 'false');
    }

    function start() {
      running = true;
      button.textContent = T.stop;
      button.setAttribute('aria-pressed', 'true');
      trackGA('breathing_start', { language: LANG });
      var t = 0;
      for (var c = 1; c <= BREATH.cycles; c++) {
        phases.forEach(function (phase) {
          var cycle = c;
          timers.push(setTimeout(function () { show(phase, cycle); }, t * 1000));
          t += phase.secs;
        });
      }
      timers.push(setTimeout(function () { reset(T.finished); }, t * 1000));
    }

    button.addEventListener('click', function () {
      if (running) reset(); else start();
    });
    reset();
  }

  /* ── Démarrage ───────────────────────────────────────────────── */

  initMetaPixel();
  initGA4();
  initBooking();
  initCurrency();
  initMenu();
  initObservers();
  initVideos();
  initBreathing();
})();
