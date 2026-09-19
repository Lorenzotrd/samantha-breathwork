/* ──────────────────────────────────────────────────────────────
   Samantha Breathwork — mesure d'audience

   ┌──────────────────────────────────────────────────────────┐
   │  UNE SEULE LIGNE À MODIFIER : GA4_ID ci-dessous.         │
   │  Remplacer G-XXXXXXXXXX par l'identifiant de mesure      │
   │  donné par Google Analytics (Admin › Flux de données).   │
   │  Tant que la ligne n'est pas modifiée, ce fichier ne     │
   │  fait rien du tout : aucune requête, aucune erreur.      │
   └──────────────────────────────────────────────────────────┘
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var GA4_ID = 'G-XXXXXXXXXX';   // ← à remplacer

  /* Tant que l'identifiant n'est pas renseigné, on ne charge rien. */
  if (!GA4_ID || GA4_ID.indexOf('XXXX') !== -1) return;

  /* File d'attente gtag : définie tout de suite pour que booking.js
     puisse envoyer ses évènements même avant le chargement du script. */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('js', new Date());

  /* Réglages orientés CNIL : IP anonymisée, pas de signaux publicitaires,
     pas de personnalisation. Voir SETUP.md pour la question du bandeau. */
  gtag('config', GA4_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
  document.head.appendChild(s);

  /* ── Évènements utiles au-delà des pages vues ──
     booking.js envoie déjà « reservation_appel » à chaque clic Calendly.
     On ajoute ici deux signaux d'engagement qui aident à comprendre
     quelles pages retiennent vraiment l'attention. */

  /* Lecture d'un témoignage vidéo */
  document.addEventListener('play', function (e) {
    if (e.target && e.target.tagName === 'VIDEO') {
      gtag('event', 'lecture_temoignage', {
        event_category: 'engagement',
        event_label: (e.target.getAttribute('src') || '').split('/').pop()
      });
    }
  }, true);

  /* Lecture en profondeur : 75 % de la page atteints */
  var deepRead = false;
  window.addEventListener('scroll', function () {
    if (deepRead) return;
    var h = document.documentElement;
    var pct = (h.scrollTop + window.innerHeight) / h.scrollHeight;
    if (pct >= 0.75) {
      deepRead = true;
      gtag('event', 'lecture_approfondie', {
        event_category: 'engagement',
        event_label: window.location.pathname
      });
    }
  }, { passive: true });
})();
