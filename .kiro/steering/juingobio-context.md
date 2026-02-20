---
inclusion: auto
---

# JuingoBIO - Contexte Projet

## Vision
Plateforme de distribution bio en circuit court connectant producteurs → établissements (B2B) et ménages (B2C). Priorités : vitesse extrême, transparence totale, expérience premium.

## Identité Visuelle

### Palette de Couleurs
- **Vert Profond (#1A3C34)** : Couleur dominante (sérieux, prestige, confiance)
- **Vert Bio (#4CAF50)** : Accents secondaires (fraîcheur, nature)
- **Vert Citron (#CDDC39)** : Dynamisme (badges, nouveautés)
- **Orange Terre (#FF9800)** : CTA, notifications, vente

### Typographie
- **Titres** : Playfair Display (Serif élégante)
- **Corps** : Inter ou Montserrat (Sans-serif lisible)
- **Style UI** : Glassmorphism léger, coins arrondis 20px+, ombres douces

## Architecture Utilisateur

### The "Split" (Landing)
Division claire dès l'ouverture :
- **B2B** : Dashboard efficacité, volumes, gestion comptable
- **B2C** : Catalogue visuel, inspiration, paniers personnalisés, storytelling

### Parcours Principal
1. Splash (2.5s) → Onboarding → Auth → Split (B2B/B2C) → Main (Marketplace/Dashboard)
2. Navigation : Marché | Panier | Compte
3. Vues secondaires : Tracking, Profile, Cart

## Fonctionnalités Clés

### B2B (Efficacité & Volume)
- Prix dynamiques HT avec tarifs dégressifs
- Quick Order (commander en <10s)
- Facturation auto conforme

### B2C (Expérience & Engagement)
- Storytelling "Ma terre" par produit
- Abonnements paniers hebdomadaires
- Tracking temps réel du livreur

## Stack Technique
- **Frontend** : React + TypeScript + Tailwind
- **Backend** : Firebase (Firestore, Cloud Functions v2, Cloud Storage)
- **Optimisation** : Optimistic UI, Persistence Firestore, minInstances: 1
- **Images** : WebP compressé via extension automatique

## Principes de Performance

### Zéro Latence (Optimistic UI)
- Action utilisateur → UI change instantanément
- Requête part en background avec retry exponentiel
- Erreur → Toast discret + rollback fluide

### Dénormalisation
- Noms/photos produits copiés dans l'objet Commande
- Évite lectures multiples

### Bundling
- writeBatch pour actions multiples
- CDN pour images producteurs

## Structure Firestore
```
/artifacts/{appId}/public/data/products
/artifacts/{appId}/public/data/producers
/artifacts/{appId}/users/{userId}/orders
/artifacts/{appId}/public/data/b2b_validations
```

## Composants Existants
- **App.tsx** : Routeur principal (splash, onboarding, auth, split, main, cart, tracking, profile)
- **B2BDashboard** : Vue pro
- **B2CMarketplace** : Vue ménage
- **DeviceWrapper** : Conteneur responsive
- **LandingSplit** : Sélecteur B2B/B2C
- **CartView, TrackingView, ProfileView** : Vues secondaires

## Prochaines Étapes
- Animer page d'accueil (marketplace/dashboard)
- Ajouter devise en FC (franc suisse)
- Ajouter section "Commandes" dans navigation
- Intégrer données Firebase
