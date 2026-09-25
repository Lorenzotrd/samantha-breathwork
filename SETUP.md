# Mise en service — mesure et indexation

Trois choses à faire, dans cet ordre. Le code est déjà en place : il ne reste
que deux identifiants à coller.

---

## 0. Déployer (indispensable avant tout le reste)

Rien ne peut être indexé tant que la nouvelle version n'est pas en ligne.
La branche `claude/laughing-dijkstra-8fifgm` contient tout le travail, mais
`main` — donc le site public — est encore sur l'ancienne version.

Fusionner la branche dans `main` déclenche automatiquement le déploiement Vercel.

Vérification une fois fait : ouvrir <https://www.samanthabreathwork.com/> et
regarder le titre de l'onglet. Il doit afficher
**« Breathwork anxiété en ligne : séances individuelles | Samantha »**.
S'il affiche encore un titre avec « Thérapie somatique », le
déploiement n'a pas eu lieu.

---

## 1. Google Analytics 4

1. Aller sur <https://analytics.google.com> et créer un compte.
2. Créer une **propriété** nommée `Samantha Breathwork`, fuseau Paris, devise EUR.
3. Créer un **flux de données** de type Web sur `https://www.samanthabreathwork.com`.
4. Google affiche alors un **identifiant de mesure** de la forme `G-XXXXXXXXXX`.
5. Ouvrir `assets/analytics.js`, ligne 14, et remplacer :

   ```js
   var GA4_ID = 'G-XXXXXXXXXX';   // ← à remplacer
   ```

   par l'identifiant réel. C'est la seule ligne à modifier, elle vaut pour
   les pages articles et villes.

   **Les deux pages d'accueil (`/` et `/en`) ont leur propre réglage** : en haut de
   `assets/js/main.js`, remplacer `[GA4_MEASUREMENT_ID]` par le même identifiant
   et `[META_PIXEL_ID]` par l'identifiant du Pixel Meta. Tant qu'ils restent entre
   crochets, rien n'est chargé.

Tant que la ligne n'est pas changée, le fichier ne fait rien : aucune requête,
aucune erreur dans la console.

### Ce qui est mesuré automatiquement

| Évènement | Déclenché quand |
|---|---|
| `reservation_appel` | clic sur un bouton Calendly, avec la page et l'emplacement exacts |
| `lecture_temoignage` | lecture d'une vidéo témoignage |
| `lecture_approfondie` | 75 % d'une page atteints au défilement |

Dans GA4, marquer `reservation_appel` comme **conversion clé**
(Admin › Évènements). C'est le seul chiffre qui compte vraiment.

### Note CNIL

GA4 dépose des cookies. En France, un bandeau de consentement est en principe
requis avant tout dépôt. Le script est déjà configuré au plus sobre
(IP anonymisée, signaux publicitaires désactivés), mais cela ne remplace pas
un bandeau.

Alternative sans cookie et exemptée de bandeau : **Plausible** ou
**Simple Analytics** (~9 €/mois). `assets/booking.js` envoie déjà ses
évènements à Plausible s'il est présent — il n'y aurait rien d'autre à changer.

---

## 2. Google Search Console

1. Aller sur <https://search.google.com/search-console>.
2. Ajouter une propriété de type **Préfixe d'URL** :
   `https://www.samanthabreathwork.com`
3. Choisir la validation par **balise HTML**. Google donne une balise du type :

   ```html
   <meta name="google-site-verification" content="abc123...">
   ```

4. Ouvrir `index.html` et remplacer `REMPLACER_PAR_LE_CODE_GOOGLE`
   par le code donné (ligne 11).
5. Redéployer, puis cliquer sur **Valider** dans Search Console.

---

## 3. Demander l'indexation

Une fois la propriété validée :

1. **Sitemaps** (menu de gauche) › saisir `sitemap.xml` › Envoyer.
   Les 18 URL sont déclarées (dont la version anglaise `/en`).
2. **Inspection de l'URL** (barre du haut) : coller l'adresse de la page, puis
   **Demander une indexation**. À faire en priorité pour :

   - `https://www.samanthabreathwork.com/`
   - `https://www.samanthabreathwork.com/respiration-anxiete`
   - `https://www.samanthabreathwork.com/prix-seance-breathwork`
   - `https://www.samanthabreathwork.com/breathwork-en-ligne`
   - `https://www.samanthabreathwork.com/breathwork-c-est-quoi`

   Google limite le nombre de demandes manuelles par jour : traiter le reste
   sur deux ou trois jours. Le sitemap suffit pour les pages villes.

### Ensuite

Les premières impressions apparaissent généralement sous 3 à 10 jours,
les positions se stabilisent sur 2 à 3 mois. Le rapport à surveiller est
**Performances › Requêtes** : il dira quels mots clés remontent réellement,
ce qu'aucune estimation d'outil ne peut prédire.

---

## À ne pas oublier

- **La devise.** Les prix s'affichent en AUD pour les visiteuses en Australie,
  en euros sinon (`assets/js/main.js`, objet `PRICES` pour changer les tarifs).
  Lien à partager pour forcer l'AUD :
  `https://www.samanthabreathwork.com/?devise=aud`.
- **Les images orphelines.** `images/hero1.png` (3,8 Mo), `images/hero.jpg`
  (2,1 Mo) et quelques autres ne sont plus référencées nulle part. Environ
  7,5 Mo alourdissent chaque déploiement pour rien.
