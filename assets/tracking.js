/* ──────────────────────────────────────────────────────────────
   Samantha Breathwork — mesure (Google Analytics 4 + Google Ads)
   Chargé en `defer` sur toutes les pages, AVANT booking.js et main.js.

   ┌──────────────────────────────────────────────────────────┐
   │  LES SEULES LIGNES À MODIFIER : les trois identifiants   │
   │  ci-dessous. Tant qu'un identifiant reste entre          │
   │  crochets, l'outil correspondant n'est pas chargé.       │
   └──────────────────────────────────────────────────────────┘

   Ce que fait ce fichier :
   - charge la balise Google (gtag) pour GA4 et Google Ads ;
   - garde l'origine de la visite (UTM, gclid) pour la transmettre à Calendly ;
   - déclenche la conversion quand un rendez-vous est VRAIMENT réservé
     dans la fenêtre Calendly (pas au simple clic sur le bouton) ;
   - mesure deux signaux d'engagement (vidéo lue, page lue à 75 %).
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ── Réglages ────────────────────────────────────────────────── */

  // Google Analytics 4 › Admin › Flux de données › ID de mesure (G-…).
  var GA4_ID = '[GA4_MEASUREMENT_ID]';
  // Google Ads › Objectifs › Conversions › balise : AW-… et libellé de conversion.
  var GOOGLE_ADS_ID = '[GOOGLE_ADS_ID]';
  var GOOGLE_ADS_BOOKING_LABEL = '[GOOGLE_ADS_BOOKING_LABEL]';

  // Pays où les signaux publicitaires sont refusés par défaut (RGPD : UE, EEE,
  // Royaume-Uni, Suisse). Les pubs ne visent que l'Australie ; en Europe on ne
  // dépose aucun cookie publicitaire sans bandeau de consentement.
  var CONSENT_REGIONS = ['AT','BE','BG','CH','CY','CZ','DE','DK','EE','ES','FI','FR','GB','GR','HR','HU','IE','IS','IT','LI','LT','LU','LV','MT','NL','NO','PL','PT','RO','SE','SI','SK'];

  var ATTRIBUTION_KEY = 'sb_attribution';
  var ATTRIBUTION_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
  var MAX_PARAM_LENGTH = 100;
  var CALENDLY_ORIGIN = 'https://calendly.com';
  var DEEP_READ_RATIO = 0.75;

  function isConfigured(id) { return typeof id === 'string' && id.length > 0 && id.charAt(0) !== '['; }

  var hasGA4 = isConfigured(GA4_ID);
  var hasAds = isConfigured(GOOGLE_ADS_ID);
  var hasAdsConversion = hasAds && isConfigured(GOOGLE_ADS_BOOKING_LABEL);

  /* ── Origine de la visite ────────────────────────────────────── */

  function cleanParam(value) {
    return String(value).replace(/[^\w\-. ]/g, '').slice(0, MAX_PARAM_LENGTH);
  }

  function readStoredAttribution() {
    try {
      var raw = window.sessionStorage.getItem(ATTRIBUTION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function storeAttribution(attribution) {
    try {
      window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
    } catch (e) {
      /* Navigation privée ou stockage bloqué : l'origine reste valable pour cette page. */
    }
  }

  // Lit l'origine dans l'URL d'arrivée. Une visite venue d'une pub Google
  // porte un gclid : sans UTM explicites, on la range en google / cpc.
  function attributionFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var found = {};
    ATTRIBUTION_PARAMS.forEach(function (name) {
      var value = params.get(name);
      if (value) found[name] = cleanParam(value);
    });
    if (found.gclid && !found.utm_source) {
      found = Object.assign({}, found, { utm_source: 'google', utm_medium: 'cpc' });
    }
    return Object.keys(found).length ? found : null;
  }

  var attribution = attributionFromUrl() || readStoredAttribution();
  if (attribution) storeAttribution(attribution);

  /* ── Balise Google ───────────────────────────────────────────── */

  function loadGtag(firstId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };

    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      region: CONSENT_REGIONS
    });
    window.gtag('js', new Date());

    if (hasGA4) {
      window.gtag('config', GA4_ID, {
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false
      });
    }
    if (hasAds) window.gtag('config', GOOGLE_ADS_ID);

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(firstId);
    document.head.appendChild(s);
  }

  if (hasGA4 || hasAds) loadGtag(hasGA4 ? GA4_ID : GOOGLE_ADS_ID);

  function sendEvent(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  /* ── Réservation ─────────────────────────────────────────────── */

  // Clic sur un bouton de réservation : une intention, pas encore une conversion.
  function bookingClick(label) {
    sendEvent('reservation_appel', { event_category: 'intention', event_label: label });
    if (window.plausible) window.plausible('Reservation appel', { props: { source: label } });
  }

  // Rendez-vous réellement pris dans la fenêtre Calendly : la conversion.
  function bookingConfirmed() {
    var page = window.location.pathname;
    sendEvent('rendez_vous_confirme', { event_category: 'conversion', event_label: page });
    if (hasAdsConversion) {
      sendEvent('conversion', { send_to: GOOGLE_ADS_ID + '/' + GOOGLE_ADS_BOOKING_LABEL });
    }
    if (window.plausible) window.plausible('Rendez-vous confirme', { props: { page: page } });
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== CALENDLY_ORIGIN) return;
    if (e.data && e.data.event === 'calendly.event_scheduled') bookingConfirmed();
  });

  /* ── Engagement ──────────────────────────────────────────────── */

  document.addEventListener('play', function (e) {
    if (e.target && e.target.tagName === 'VIDEO') {
      var src = e.target.currentSrc || e.target.getAttribute('src') || '';
      sendEvent('lecture_temoignage', { event_category: 'engagement', event_label: src.split('/').pop() });
    }
  }, true);

  var deepRead = false;
  window.addEventListener('scroll', function () {
    if (deepRead) return;
    var h = document.documentElement;
    if ((h.scrollTop + window.innerHeight) / h.scrollHeight >= DEEP_READ_RATIO) {
      deepRead = true;
      sendEvent('lecture_approfondie', { event_category: 'engagement', event_label: window.location.pathname });
    }
  }, { passive: true });

  /* ── Interface pour booking.js ───────────────────────────────── */

  window.SBTracking = {
    attribution: function () { return attribution ? Object.assign({}, attribution) : null; },
    bookingClick: bookingClick
  };
})();
