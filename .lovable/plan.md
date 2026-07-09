# Finalisation MiProjet Go

"Implémente tout ce qui reste" est trop large pour être exécuté d'un bloc sans risquer d'aller à côté de ce que tu veux vraiment. Voici la liste concrète de ce qui manque ou reste à harmoniser dans l'app actuelle. Dis-moi lesquels garder, retirer ou reprioriser — puis j'exécute tout en série.

## État actuel (déjà en place)

- Écrans : dashboard, opérations (liste + new), voix, import, historique, produits, utilisateurs, paramètres, profil, synchronisation.
- Backend : `operations`, `produits`, `profiles`, `user_roles`, `activity_settings`, `export_audit_logs`, `import_sessions` + RLS + rôles.
- Serveur : exports CSV/Excel/rapport avec paywall + audit, IA vocale et import (fallback GPT → Gemini), redeem export unlock, MCP.
- UI : charte vert dominant, carte solde format Visa réel.

## Ce qui reste — à confirmer

### A. Harmonisation UI (rapide)
1. Appliquer le nouveau vert dominant sur tous les écrans qui utilisent encore des dégradés/couleurs héritées du bleu (voix, historique, import, produits, utilisateurs, paramètres, synchronisation).
2. Boutons, cartes, tableaux : composants shadcn uniformes (variants `default`/`secondary`/`ghost`), plus de styles inline dispersés.
3. En-têtes de page harmonisés (grid responsive + logo + titre + sous-titre).

### B. Logique métier automatique
4. **Recalcul automatique du stock produits** après chaque opération (entrée = achat qui augmente stock si lié à un produit, sortie = vente qui diminue) — actuellement les produits et opérations ne sont pas liés.
5. **Alertes stock bas** : badge et notification quand un produit passe sous son seuil.
6. **Clôture de journée automatique** : rapport synthétique généré chaque soir (via cron pg_cron) et disponible dans l'historique.
7. **Détection de doublons** à la saisie (même montant + description + jour) → confirmation.
8. **Suggestion IA** dans `/operations/new` : quand on tape la description, proposer catégorie + prix habituel depuis l'historique.

### C. Téléchargements & documents
9. **Reçu PDF** pour chaque opération (bouton "Télécharger reçu" dans le détail).
10. **Rapport mensuel PDF** (résumé + top produits + graphique entrées/sorties) déclenchable depuis l'historique.
11. **Export produits** CSV/Excel (déjà côté opérations, à répliquer pour produits).
12. **Sauvegarde complète** ZIP (opérations + produits + paramètres) — protégé paywall.

### D. Modules manquants
13. **Journal d'activité** : voir qui (gérant/caissier/livreur) a fait quoi, quand — lecture seule pour le propriétaire.
14. **Facturation client** léger : créer un devis/facture à partir d'une sélection d'opérations d'entrée → PDF partageable WhatsApp.
15. **Notifications in-app** (toast + centre) : nouvelle vente, stock bas, paiement reçu, export prêt.
16. **Mode hors-ligne renforcé** : file d'attente déjà présente, ajouter un indicateur de synchro par opération (⏳ / ✅ / ❌) et un bouton "Retenter tout".

### E. Sécurité & conformité
17. Vérifier RLS sur toutes les tables introduites (audit + policies TO authenticated uniquement).
18. Chiffrer / masquer le numéro de téléphone dans les logs.
19. Rate-limit côté serveur sur `parseVoiceOperation` et `analyzeImportLines` (5 req/min/user).

## Ce dont j'ai besoin de toi

Réponds simplement avec :

- **"Tout"** → j'exécute A → E dans l'ordre, en plusieurs tours (chaque tour = un lot cohérent testé).
- **Numéros** (ex. "A, 4, 5, 9, 10, 13") → je fais uniquement ceux-là.
- **"Skip X"** → je retire X et fais le reste.

Rien de tout cela n'est destructif : les tables existantes ne sont pas modifiées, seulement enrichies. Aucune donnée existante ne sera perdue.

## Notes techniques

- Reçus/rapports PDF : générés côté serveur via `createServerFn` avec `pdf-lib` (compatible Cloudflare Workers, contrairement à Puppeteer).
- Clôture auto : `pg_cron` + route `/api/public/cron/daily-close` avec vérification de secret HMAC.
- Stock produits ↔ opérations : nouvelle colonne `operations.produit_id` (nullable, FK), trigger PL/pgSQL qui ajuste `produits.stock`.
- Rate-limit : table `rate_limits(user_id, endpoint, window_start, count)` + fonction SECURITY DEFINER.
- Aucun secret utilisateur requis : Lovable AI Gateway, PDF côté serveur, Supabase déjà en place.