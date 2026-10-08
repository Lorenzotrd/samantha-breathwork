/* ──────────────────────────────────────────────────────────────
   Samantha Breathwork — petit quiz « Le breathwork est-il fait pour toi ? »
   Aucune dépendance. Tous les textes sont dans le HTML (FR ou EN) :
   ce fichier ne contient que la logique, réutilisable sur toutes les pages.

   Balisage attendu :
   [data-quiz data-quiz-some="3" data-quiz-high="6"]
     [data-quiz-step]  une question ; ses boutons portent data-score="N"
                       ou data-flag="caution" (contre-indication possible)
     [data-quiz-result="calm|some|high|caution"]  les quatre résultats
     [data-quiz-progress] [data-quiz-count] [data-quiz-back] [data-quiz-restart]
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var DEFAULT_SOME = 3;
  var DEFAULT_HIGH = 6;

  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  function readThreshold(root, attr, fallback) {
    var value = parseInt(root.getAttribute(attr), 10);
    return isNaN(value) ? fallback : value;
  }

  function resultFor(answers, some, high) {
    if (answers.some(function (a) { return a.flag === 'caution'; })) return 'caution';
    var total = answers.reduce(function (sum, a) { return sum + a.score; }, 0);
    if (total >= high) return 'high';
    if (total >= some) return 'some';
    return 'calm';
  }

  function initQuiz(root) {
    var steps = Array.prototype.slice.call(root.querySelectorAll('[data-quiz-step]'));
    var results = Array.prototype.slice.call(root.querySelectorAll('[data-quiz-result]'));
    var progress = root.querySelector('[data-quiz-progress]');
    var count = root.querySelector('[data-quiz-count]');
    var back = root.querySelector('[data-quiz-back]');
    var some = readThreshold(root, 'data-quiz-some', DEFAULT_SOME);
    var high = readThreshold(root, 'data-quiz-high', DEFAULT_HIGH);
    if (!steps.length) return;

    var state = { index: 0, answers: [] };

    function focusHeading(el) {
      var heading = el.querySelector('[data-quiz-focus]');
      if (heading) heading.focus({ preventScroll: true });
    }

    function render(moveFocus) {
      var done = state.index >= steps.length;
      steps.forEach(function (step, i) { step.hidden = done || i !== state.index; });
      var result = done ? resultFor(state.answers, some, high) : null;
      results.forEach(function (el) { el.hidden = el.getAttribute('data-quiz-result') !== result; });

      if (progress) progress.style.width = Math.round((state.index / steps.length) * 100) + '%';
      if (count) count.textContent = done ? '' : (state.index + 1) + ' / ' + steps.length;
      if (back) back.hidden = state.index === 0 || done;

      if (!moveFocus) return;
      var current = done ? results.filter(function (el) { return !el.hidden; })[0] : steps[state.index];
      if (current) focusHeading(current);
      if (done) track('quiz_complete', { result: result, page: window.location.pathname });
    }

    function answer(button) {
      var choice = {
        score: parseInt(button.getAttribute('data-score'), 10) || 0,
        flag: button.getAttribute('data-flag') || null
      };
      if (state.index === 0) track('quiz_start', { page: window.location.pathname });
      state = { index: state.index + 1, answers: state.answers.slice(0, state.index).concat([choice]) };
      render(true);
    }

    root.addEventListener('click', function (e) {
      var option = e.target.closest('[data-quiz-step] button');
      if (option && root.contains(option)) return answer(option);

      if (e.target.closest('[data-quiz-back]') && state.index > 0) {
        state = { index: state.index - 1, answers: state.answers.slice(0, state.index - 1) };
        return render(true);
      }
      if (e.target.closest('[data-quiz-restart]')) {
        state = { index: 0, answers: [] };
        render(true);
      }
    });

    root.classList.add('quiz--ready');
    render(false);
  }

  document.querySelectorAll('[data-quiz]').forEach(initQuiz);
})();
