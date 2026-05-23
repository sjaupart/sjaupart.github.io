# Mon Blog — Astro + GitHub Pages

Blog personnel de développeur senior. Stack : Astro 4, TypeScript, GitHub Pages.

## Démarrage

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # Build statique dans ./dist
npm run preview   # Prévisualiser le build
```

## Structure

```
src/
  content/blog/   → Articles en Markdown (.md)
  layouts/        → Base.astro, BlogPost.astro
  pages/          → index, blog/index, blog/[slug], about, contact
  styles/         → global.css, prose.css
public/           → favicon, images, CV.pdf
.github/workflows → deploy.yml (CI/CD → GitHub Pages)
```

## Écrire un article

Créer un fichier dans `src/content/blog/mon-titre.md` :

```md
---
title: "Mon titre"
date: 2024-06-01
category: réflexions   # ou : veille
tags: ["architecture", "backend"]
excerpt: "Une phrase d'accroche pour la carte et le SEO."
draft: false
---

Contenu en Markdown...
```

## Déploiement

Pusher sur `main` déclenche le build et le déploiement automatiquement via GitHub Actions.

**Configuration requise :**
1. Dans les Settings du repo → Pages → Source : GitHub Actions
2. Modifier `site` dans `astro.config.mjs` avec ton URL GitHub Pages
3. Mettre à jour les liens GitHub/LinkedIn dans `Base.astro` et `contact.astro`
