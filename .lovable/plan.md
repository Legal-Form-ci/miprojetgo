
## Réalité du chantier

Tu as listé ~18 features distinctes. Je ne peux pas tout livrer **dans un seul message** sans casser le build. Je propose 3 vagues séquentielles, chacune testable. Tu valides la vague 1, je lance la 2, etc.

La reco faciale custom (cam + IA visage) et la connexion par empreinte **ne sont pas faisables en PWA web** — ça demande une app native (Capacitor/iOS/Android). Je vais à la place utiliser **WebAuthn** (qui déclenche Face ID / empreinte du téléphone via le navigateur) — c'est la seule option viable. Si tu veux vraiment du custom, il faut convertir en app native plus tard.

## Vague 1 — Visuel & sécurité (cette itération)

1. **Carte Visa dynamique** (`src/components/balance-card.tsx`)
   - Tier auto selon solde positif : Bronze < 50k, Argent < 200k, Or < 1M, Saphir < 5M, Diamant ≥ 5M
   - Tier Rouge si solde négatif
   - Affiche nom complet, téléphone, photo profil miniature, numéro masqué (•••• derniers 4 du tel)
   - Mini-cartes Entrée (vert) / Sortie (rouge) du jour avec sélecteur période (Jour/Semaine/Mois/Trim/Sem/An/Tout)
2. **Scoping vendeur/admin** : dashboard vendeur ne voit QUE ses opérations ; admin agrège tout. Migration RLS déjà OK (policy actuelle), mais le dashboard fait un global → je filtre par `user_id` côté query si non-admin.
3. **Auto-déconnexion 5 min d'inactivité** (`src/hooks/use-idle-logout.ts`)
4. **Upload fichier dans import IA** (en plus de la caméra) — input `accept="image/*"` sans `capture`
5. **Profil avec photo** : bucket Storage `avatars` + page `/_authenticated/profil.tsx` ; admin peut éditer tout profil ; auto-recadrage carré + compression côté client (canvas).
6. **Schema** : ajouter colonnes `profiles.username`, `profiles.first_name`, `profiles.last_name`, `profiles.avatar_url`. Migration de remplissage depuis `full_name` existant.

## Vague 2 — Métier (après validation V1)

7. Table `produits` (admin CRUD) : nom, prix_unitaire, catégorie, user_id (scope vendeur ou global admin)
8. Formulaire opération : champ **Quantité × Prix unitaire = Montant auto**, autocomplete produits via combobox
9. Parser vocal : correction quantité×prix (« bière 500f vendue 3 » → 1500), normalisation nom produit via fuzzy-match dans `produits`, anti-répétition renforcé
10. Mode vocal **manuel push-to-talk** : `continuous=false`, l'utilisateur tient/clique pour parler, l'IA ignore les silences
11. Job de nettoyage : `cleanupOperations` server fn qui re-normalise les descriptions existantes via fuzzy-match produits

## Vague 3 — Polish (après validation V2)

12. Export Excel `.xlsx` (lib `xlsx`) même format que PDF, colonnes jour/heure
13. Édition rapide post-IA des lignes import (déjà partiellement là, à renforcer)
14. WebAuthn (Face ID / empreinte navigateur) sur page de connexion + page paramètres pour enregistrer
15. Rapport PDF : ajouter Total Global en plus des totaux mois
16. Catégorisation IA en arrière-plan pour nouveaux produits (Gemini Flash recherche la catégorie)

## Hors scope (impossible en PWA)

- Reco faciale custom par caméra : nécessite app native
- Voix synthèse accent ivoirien RTI : Web Speech API n'a pas ce profil, ElevenLabs requis (tu as refusé)
- 2 empreintes différentes : la PWA ne contrôle pas combien le téléphone enregistre

## Technique (Vague 1 détails)

- Migration : `ALTER TABLE profiles ADD COLUMN username text UNIQUE, first_name text, last_name text, avatar_url text;` + backfill `first_name = split_part(full_name,' ',1)`
- Storage : `avatars` bucket public, RLS `objects` : upload propre user OR admin
- `BalanceCard` : design CSS variables gradient par tier ; calcul tier dans `lib/tier.ts`
- Dashboard query : si pas admin, ajouter `.eq('user_id', userId)`
- `use-idle-logout` : listeners mousemove/keydown/touchstart, timer 5min, signOut + redirect
