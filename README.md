# VerseSoccer

Frontend alternatif, open source et orienté données pour Soccerverse. Le parcours d'accueil est : wallet MetaMask → noms Xaya `p/` possédés → compte Soccerverse → premier club managé → tableau de bord personnalisable.

## Démarrer

    npm install
    Copy-Item .env.example .env.local
    npm run dev

L’application est disponible sur http://localhost:3000. L’endpoint de contrôle est GET /api/health.

## Vérifier avant déploiement

    npm run typecheck
    npm run test
    npm run build

## Déploiement Vercel

1. Pousser ce contenu dans CrazyCult/VerseSoccer.
2. Dans Vercel, utiliser Add New puis Project et importer le dépôt.
3. Conserver le preset Next.js détecté par Vercel.
4. Ajouter les variables d’environnement suivantes :

       SOCCERVERSE_API_BASE_URL=https://services.soccerverse.com/api
       SOCCERVERSE_DATAPACK_URL=https://elrincondeldt.com/sv/rincon_v1.json
       SOCCERVERSE_PLAYER_DATAPACK_URL=https://elrincondeldt.com/sv/rincon_v4.json

5. Déployer. Les pull requests auront leurs previews ; la branche principale aura la production.

## Données, wallets et widgets

- Le bouton **Connect wallet** utilise l'extension MetaMask, uniquement pour obtenir l'adresse publique. Aucune transaction ni signature n'est demandée.
- L'adresse est résolue via le sous-graphe Xaya public, puis les comptes et clubs via les API Soccerverse publiques.
- Le premier compte qui gère un club est ouvert automatiquement. S'il y en a plusieurs, un sélecteur apparaît.
- Les widgets peuvent être affichés ou masqués depuis **Customise widgets**. La configuration est enregistrée dans le navigateur, séparément pour chaque wallet.
- Le pack communautaire complet fournit les vrais noms, blasons, stades et ligues. La mise à jour joueurs est appliquée par-dessus. Les deux sources sont mises en cache 24 heures côté serveur.

WalletConnect doit être ajouté avec un identifiant de projet Reown/WalletConnect propre au déploiement ; il n'est volontairement pas simulé. Les endpoints Soccerverse utilisés ici sont en lecture seule. Toute action de gestion on-chain devra rester dans un module séparé avec confirmation explicite de l’utilisateur.
