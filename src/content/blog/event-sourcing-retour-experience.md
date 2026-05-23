---
title: "Event sourcing : retour d'expérience après deux ans en production"
date: 2024-05-15
category: réflexions
tags: ["architecture", "event-sourcing", "ddd"]
excerpt: "Ce que les talks de conférence ne disent pas — les vraies frictions, les patterns qui tiennent, et ceux qu'on abandonne."
draft: false
---

Quand on adopte l'event sourcing, on est vite convaincu par les arguments théoriques : auditabilité totale, replay d'événements, découplage entre lecture et écriture. En pratique, le diable est dans les détails d'implémentation.

## Le problème de la migration de schéma

Contrairement à une base relationnelle, un event store est *append-only*. Ça paraît simple jusqu'au moment où on réalise qu'un événement persisté il y a 18 mois doit encore être désérialisé aujourd'hui.

> Un event store sans stratégie de upcasting est une dette technique à terme fixe. La question n'est pas *si* ça cassera, mais *quand*.

La solution retenue : des **upcasters chaînés**, versionnés, testés unitairement.

```typescript
// Upcaster V1 → V2 : ajout du champ correlationId
export const upcastOrderPlacedV1 = (
  event: OrderPlacedV1
): OrderPlacedV2 => ({
  ...event,
  version: 2,
  correlationId: generateCorrelationId(event.aggregateId),
});
```

Cette approche implique de maintenir une chaîne de transformations pour chaque type d'événement — du code supplémentaire, mais *prévisible*.
