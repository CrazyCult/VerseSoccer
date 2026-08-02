# VerseSoccer

Frontend alternatif, open source et orienté données pour Soccerverse.

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
4. Ajouter SOCCERVERSE_API_BASE_URL=https://services.soccerverse.com/api dans les variables d’environnement.
5. Déployer. Les pull requests auront leurs previews ; la branche principale aura la production.

Les endpoints publics Soccerverse sont en lecture seule. Les actions wallet et contrats devront passer dans un module séparé, avec confirmation explicite de l’utilisateur.
