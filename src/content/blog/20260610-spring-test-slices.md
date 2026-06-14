---
title: "Spring Boot Test Slices - Optimiser les tests en ciblant les couches"
date: 2026-06-10
category: testing
tags: ["spring", "performance"]
excerpt: "Comment optimiser les tests Spring en ciblant précisément les couches à valider — et éviter les démarrages de contexte superflus."
draft: false
---

Reprendre un produit ayant quelques années au compteur, c'est souvent hériter de décisions prises sous pression — deadlines, dette technique, raccourcis assumés ou non. Dans ces contextes, un assainissement progressif et itératif de la base de code est impératif pour en reprendre le contrôle.

Que ce soit pour une nouvelle fonctionnalité, un correctif ou un refactoring, obtenir un feedback rapide sur son travail est primordial. Mais lorsque les tests prennent le parti de la lenteur, c'est la productivité de toute l'équipe qui en pâtit — et la cause est parfois moins mystérieuse qu'il n'y paraît : une simple annotation Spring.

# `@SpringBootTest` : un contexte à quel prix ?

`@SpringBootTest` est l'annotation de référence dès qu'il s'agit de tester une application Spring. Simple d'utilisation et fonctionnelle dans tous les cas, elle constitue souvent le premier réflexe — et rarement le bon. Ce que peu de développeurs réalisent, c'est ce qu'elle fait dans l'ombre : localiser la classe annotée `@SpringBootApplication` et déclencher l'intégralité de ses auto-configurations, exactement comme si l'application démarrait en production.

JPA, Hibernate, la datasource, le pool de connexions, Spring Security, les auto-configurations Actuator, le cache, le messaging — tout est initialisé, même si le test ne vérifie que certaines informations d'une couche bien spécifique de notre application (par exemple, une poignée de liens HATEOAS d'une réponse HTTP).

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ReservationControllerTest {
    // Spring charge : JPA, Security, Web, Messaging, Cache,
    // DataSource, tous nos @Service, @Repository, @Component...
    // ...même si le test ne vérifie que la couche HTTP.
}
```

Spring atténue ce coût en mettant le contexte en cache entre les classes de test. Néanmoins, ce cache est invalidé dès qu'une classe modifie la configuration (comme par exemple, l'ajout d'un `@MockBean` ou le changement d'une propriété), créant ainsi un nouveau démarrage complet du contexte.

```java
// Ces trois classes créent trois contextes distincts → trois démarrages complets
@SpringBootTest
class ReservationControllerTest { ... }

@SpringBootTest(properties = "feature.overbooking=true")
class OverbookingTest { ... }

@SpringBootTest
@MockBean(NotificationService.class) // @MockBean invalide le cache de contexte
class ReservationWithNotificationTest { ... }
```

# Pourquoi charger tout un contexte pour tester une seule couche ?

Spring Boot fournit nativement ce qu'on appelle des *test slices* — des annotations qui ne démarrent qu'une tranche ciblée du contexte applicatif. L'idée est simple : si un test ne concerne que la couche web, pourquoi initialiser JPA ?

Voici un aperçu des slices les plus courantes :

| Annotation | Couche ciblée | Instances chargées |
|---|---|---|
| `@WebMvcTest` | Couche Web (Spring MVC) | Controllers, Filters, MockMvc, Security MVC |
| `@DataJpaTest` | Couche JPA | JPA, Hibernate, base H2 en mémoire |
| `@DataMongoTest` | Couche MongoDB | Spring Data MongoDB |
| `@JsonTest` | Sérialisation JSON | Jackson / Gson, JacksonTester |
| `@RestClientTest` | Client HTTP | RestTemplate, MockRestServiceServer |

Pour illustrer concrètement l'apport de ces test slices, prenons le cas de `@WebMvcTest` — et ce qu'elle a changé sur un projet réel.

# De `@SpringBootTest` à `@WebMvcTest` : la migration en pratique

Dans le cadre d'une API REST, les tests de ressources ont pour responsabilité de valider la structure des réponses HTTP exposées — notamment la présence et la cohérence des liens HATEOAS (`self`, `cancel`, `modify`, etc.) qui permettent au consommateur de naviguer dans l'API.

```json
{
  "reference": "REF-001",
  "status": "CONFIRMED",
  "_links": {
    "self": { "href": "http://localhost/reservations/REF-001" },
    "cancel": { "href": "http://localhost/reservations/REF-001/cancel" },
    "modify": { "href": "http://localhost/reservations/REF-001/modify" }
  }
}
```

Ces tests ne touchent ni à la base de données, ni aux règles métier. Ils vérifient uniquement ce que le controller construit et expose.

C'est précisément ce périmètre limité qui rend l'usage de `@SpringBootTest` particulièrement coûteux ici.

## Avant : `@SpringBootTest`

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ReservationControllerTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @MockBean
    private ReservationService reservationService;

    // ...
}
```

Le test fait ce qu'on lui demande. Mais Spring a initialisé Hibernate, ouvert une connexion JDBC et scanné l'ensemble des beans de l'application pour y arriver.

## Après : `@WebMvcTest`

```java
@WebMvcTest(ReservationController.class)
class ReservationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ReservationService reservationService;

    // ...
}
```

Le contrat du test reste identique. Mais le contexte démarré ne contient que le `DispatcherServlet`, le controller cible et la configuration MVC — rien de plus.

> **À noter :** Spring HATEOAS s'auto-configure en présence de `@WebMvcTest`. En revanche, si notre projet utilise un `RepresentationModelAssembler` personnalisé, celui-ci n'étant pas scanné automatiquement dans ce contexte allégé, il faudra l'importer explicitement.

```java
@WebMvcTest(ReservationController.class)
@Import(ReservationModelAssembler.class)
class ReservationControllerTest { ... }
```

# Retour d'expérience en chiffres

Au cours de l'une de mes missions, j'ai été amené à répondre à une problématique de performance liée au build du projet. Comptant près de 2000 tests au total, environ 200 d'entre eux étaient des tests de ressources — c'est-à-dire des tests dédiés à la validation de la structure des réponses HTTP exposées par nos controllers — tous orientés validation de la couche MVC.

| Stratégie | Temps d'exécution des tests de ressources |
|---|---|
| `@SpringBootTest` | 1 min 41 sec |
| `@WebMvcTest` | 45 sec |
| **Gain** | **− 56 sec (− 55%)** |

55% de temps en moins sur l'exécution de ces tests. Ces 200 tests de ressources représentaient à eux seuls plus de la moitié du temps total de build — ce qui explique qu'en les optimisant, le gain se ressente à l'échelle du build complet : près de 3 minutes avant migration, environ 2 minutes après, soit 30% de gagnés sur un simple `mvn clean package`.

Ce gain s'explique principalement par deux facteurs. Un contexte allégé, d'abord : `@WebMvcTest` n'embarque pas JPA, Hibernate ou la datasource, dont l'initialisation représente une part conséquente du démarrage. Une surface de variation réduite ensuite : moins d'éléments dans le contexte signifie moins de risques d'invalider le cache entre classes de test — et donc moins de démarrages superflus.

# Quelques pratiques pour tirer le meilleur des Test Slices

Migrer vers `@WebMvcTest` ne suffit pas toujours. Quelques écueils fréquents peuvent annuler une partie du bénéfice si on n'y prête pas attention.

## Mutualiser la configuration pour préserver le cache

Le cache de contexte est partagé entre les classes qui ont exactement la même configuration. Si deux classes de test ciblent le même controller mais déclarent des `@MockBean` différents, Spring créera deux contextes.

```java
// ⚠️ Deux contextes distincts malgré le même controller
@WebMvcTest(ReservationController.class)
class TestA {
    @MockBean ReservationService reservationService;
}

@WebMvcTest(ReservationController.class)
class TestB {
    @MockBean ReservationService reservationService;
    @MockBean NotificationService notificationService; // provoque un second contexte
}
```

La solution : centraliser les mocks communs dans une classe de base abstraite.

```java
@WebMvcTest(ReservationController.class)
abstract class ReservationControllerTestBase {

    @MockBean
    protected ReservationService reservationService;

    @MockBean
    protected AuthorizationService authorizationService;
}

// Les sous-classes héritent du même contexte → réutilisation garantie
class ReservationLinksTest extends ReservationControllerTestBase { ... }
class ReservationErrorHandlingTest extends ReservationControllerTestBase { ... }
```

## L'antipattern `@SpringBootTest` + `@AutoConfigureMockMvc`

Il arrive souvent de rencontrer ce pattern dans des projets hérités :

```java
// ⚠️ Antipattern : charge le contexte complet pour utiliser MockMvc
@SpringBootTest
@AutoConfigureMockMvc
class ReservationControllerTest { ... }
```

Le résultat est fonctionnellement équivalent, mais le coût est celui d'un `@SpringBootTest` complet. `@WebMvcTest` reste la bonne option pour cibler la couche MVC.

## Gérer Spring Security

Contrairement à `@SpringBootTest`, `@WebMvcTest` charge la configuration de sécurité MVC mais pas l'intégralité de la chaîne de sécurité. Sans prise en compte de cette dimension, des endpoints pourraient retourner des 401 ou 403 inattendus en test. Deux options simples :

```java
// Simuler un utilisateur authentifié
@WebMvcTest(ReservationController.class)
@WithMockUser(roles = "USER")
class ReservationControllerTest { ... }

// Ou exclure la configuration de sécurité pour ce test
@WebMvcTest(
    value = ReservationController.class,
    excludeAutoConfiguration = SecurityAutoConfiguration.class
)
class ReservationControllerTest { ... }
```

# Quand garder `@SpringBootTest` ?

Les test slices ne remplacent pas `@SpringBootTest` — ils le complètent. Certains scénarios exigent un contexte complet : un test d'intégration bout-en-bout validant la chaîne entière, la vérification d'un `@ConditionalOnProperty`, ou un scénario s'appuyant sur Testcontainers avec la vraie infrastructure.

Le critère de choix reste simple : un test slice pour valider une couche isolée, `@SpringBootTest` pour valider l'interaction entre plusieurs couches.

Assigner chaque type de test à sa bonne annotation, c'est aussi clarifier l'intention de chacun — et éviter qu'un test de controller ne devienne accidentellement un test d'intégration.

# Un investissement qui se rembourse vite

Migrer une centaine de classes de tests n'est pas une opération anodine. Mais le retour est immédiat et tangible : moins de temps à attendre le build, une boucle de feedback plus courte, et un pipeline CI qui ne décourage plus les petits commits fréquents.

Les bénéfices ne s'arrêtent pas là. Les tests deviennent plus lisibles — les `@MockBean` déclarés documentent explicitement les dépendances du controller. Plus précis dans ce qu'ils affirment tester. Et plus faciles à faire tourner en local sans attendre qu'un contexte complet se charge pour vérifier une seule règle de génération de liens.

Ce type d'optimisation prend tout son sens dans un contexte de reprise. Assainir une base de code legacy, c'est aussi s'attaquer aux frictions du quotidien — et la lenteur du build en fait partie. Chaque démarrage évité est un pas de plus vers une stack que les développeurs prennent plaisir à faire évoluer.

`@SpringBootTest` est un outil puissant. Utilisé avec discernement, il reste indispensable. Utilisé par défaut sur l'ensemble des tests, il devient un frein — souvent silencieux, toujours coûteux.
