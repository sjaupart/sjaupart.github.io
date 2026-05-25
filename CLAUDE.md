# CLAUDE.md — mon-blog

Blog personnel. Site statique généré avec Astro, déployé sur GitHub Pages.

## Stack

- **Astro 6** — rendu statique (`output: 'static'`)
- **TypeScript** — tsconfig strict via `astro/tsconfigs/strict`
- **CSS vanilla** — pas de Tailwind, pas de preprocesseur ; design system via variables CSS dans `src/styles/global.css`
- **@astrojs/rss** — flux RSS généré dans `src/pages/rss.xml.ts`

## Commandes

```bash
npm run dev       # dev server sur http://localhost:4321
npm run build     # build statique dans ./dist
npm run preview   # prévisualiser ./dist
```

## Structure

```
src/
  content/blog/   → articles Markdown (.md) — source de vérité
  content.config.ts → schéma Zod de la collection blog
  layouts/
    Base.astro    → layout racine (nav, footer, SEO, fonts)
    BlogPost.astro → layout article (prose, métadonnées)
  pages/
    index.astro         → accueil (3 derniers articles)
    blog/index.astro    → liste complète
    blog/[slug].astro   → page article dynamique
    about.astro
    contact.astro
    confidentialite.astro
    mentions-legales.astro
    rss.xml.ts
  components/
    Nav.astro
    Footer.astro
    ArticleCard.astro
  styles/
    global.css   → tokens CSS, reset, composants globaux
    prose.css    → typographie des articles
public/          → favicon.svg, assets statiques
```

## Schéma des articles

Tout article dans `src/content/blog/*.md` doit respecter ce frontmatter :

```yaml
---
title: "Titre de l'article"
date: 2024-06-01          # YYYY-MM-DD
category: réflexions      # enum : "réflexions" | "veille"
tags: ["architecture"]    # tableau de strings libres
excerpt: "Une phrase."    # accroche utilisée en carte et en meta description
draft: false              # true = exclu du build
---
```

## Design system

Toutes les couleurs, typographies et espacements passent par des variables CSS définies dans `src/styles/global.css` :

- **Accent** : `#D85A30` (orange terracotta)
- **Fonts** : DM Sans (UI), Lora (prose), JetBrains Mono (code)
- **Max-width** : `680px` (colonne centré)
- **Dark mode** : `@media (prefers-color-scheme: dark)` uniquement via les tokens, pas de classe `.dark`

Ne pas ajouter de styles inline quand une variable CSS ou une classe utilitaire existante suffit.

## Déploiement

Push sur `main` → GitHub Actions → build Astro → GitHub Pages.  
Site publié sur `https://sjaupart.github.io`.

## Conventions

- Langue du code et des commits : **français** (textes utilisateur) / anglais acceptable pour noms de variables et symboles
- Pas de commentaires sauf si le *pourquoi* est non-évident
- Préférer modifier des fichiers existants plutôt qu'en créer de nouveaux
- Les articles `draft: true` sont filtrés à la compilation — ne jamais les supprimer pour les masquer
- Pas de dépendances supplémentaires sans raison forte (le projet reste intentionnellement léger)
