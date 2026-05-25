# Guide React hooks — bonnes pratiques pour ce projet

Objectif
- Fournir des règles et exemples concrets pour l'usage des hooks dans ce projet. Ce guide complète l'inventaire présent dans `docs/hooks.md` en expliquant pourquoi et comment utiliser chaque hook dans notre contexte (tables MRT, import orchestrator, formulaires FO/BO).

Principes généraux
- Privilégiez la lisibilité et la stabilité des références passées aux composants tiers (Material React Table). Mémoïser les données et stabiliser les handlers évite des re-renders coûteux.
- Toujours déclarer les dépendances des hooks (`useEffect`, `useMemo`, `useCallback`). Si une dépendance provoque un re-render inutile, réfléchissez à la stabiliser (via `useRef` ou `useMemo`).

`useMemo` — quand et comment
- Usage: mémoïser les tableaux de données, colonnes, ou valeurs dérivées lourdes (tri, agrégation, mapping).
- Pourquoi: empêche de créer de nouvelles références à chaque render, ce qui éviterait à MRT de recalculer toute la table.
- Exemple (pattern utilisé dans `src/pages/FOOrderList.jsx`):

```js
const cartRows = useMemo(() => {
  return carts.map(c => ({
    id: c.id,
    total: c?.totals?.totalTtc ?? 0,
    ...
  })).filter(Boolean)
}, [carts])
```

Conseils:
- Gardez la fonction passée à `useMemo` pure (pas d'effets secondaires).
- Ne mémoïsez pas prématurément : mesurez d'abord si la recomputation coûte réellement.

`useRef` — stabiliser les handlers et stocker des valeurs mutables
- Usage: garder des références stables vers des handlers (`edit`, `onChange`, `onClick`) ou des valeurs mutables qui ne nécessitent pas de re-render.
- Pattern appliqué dans `src/components/FOOrderRow.jsx` et `BOOrderRow.jsx` :

```js
const editRef = useRef(edit)
useEffect(() => { editRef.current = edit }, [edit])

const tableMeta = useMemo(() => ({ editRef }), [])
// passer tableMeta à MRT ; MRT lira editRef.current quand nécessaire
```

Pourquoi :
- Passer `editRef` (stable) évite que MRT voie un nouvel objet `meta` à chaque render.
- Permet d'appeler le handler à jour sans recréer la table.

`useEffect` — bonnes pratiques
- Usage: fetchs, subscriptions, synchronisation côté DOM.
- Important : toujours nettoyer les effets si nécessaire (timers, listeners, abonnements). Exemple :

```js
useEffect(() => {
  let mounted = true
  fetchData().then(data => { if (mounted) setState(data) })
  return () => { mounted = false }
}, [dep1, dep2])
```

Remarques:
- Pour les effets de fetch, protégez-vous contre les mises à jour d'état après démontage.

`useState` — conseils d'usage
- Usage: état local simple (formulaires, flags de chargement).
- Évitez de stocker des objets complexes sans les mémoïser si vous les passez à des composants sensibles à l'identité des props.

Hook custom `useLocalStorage`
- Emplacement: [src/hooks/useLocalStorage.jsx](src/hooks/useLocalStorage.jsx#L1)
- Usage: persistance simple (ex : `user`, `isGuest`).
- Exemple d'utilisation:

```js
const [user, setUser] = useLocalStorage('user', null)
```

Conseil: exportez tous les hooks custom via `src/hooks/index.js` si vous voulez centraliser les imports.

`useCallback` — pourquoi l'envisager ici
- Même si non utilisé largement aujourd'hui, `useCallback` peut aider à stabiliser des fonctions passées en props (ex: callbacks de cellule). Souvent `useRef` + stable meta est suffisant et plus simple.

Performances & MRT (rappels pratiques)
- Mémoïser : `data`, `columns`, et `tableMeta`.
- Stabiliser les handlers via `useRef` plutôt que recréer des objets avec `useMemo` à chaque render.
- Limiter le travail fait dans `render` — déplacez calculs lourds dans `useMemo`.

Checklist rapide pour un composant tableau
- `data` : `useMemo` (dépend de la source brute)
- `columns` : `useMemo` (si construit dynamiquement)
- `handlers` : stocker dans `useRef` et exposer via `tableMeta`
- éviter de passer de nouveaux objets inline dans les props (ex : `rowProps={() => ({})}`)

Exemples supplémentaires et pièges courants
- Problème fréquent : closure obsolète sur un handler. Solution : mettre le handler dans un `ref` et appeler `ref.current(...)`.
- Ne pas oublier les dépendances de `useEffect` : si vous référencez une valeur qui change, ajoutez-la ou stabilisez-la.

Actions recommandées
- Si vous voulez, je peux :
  - ajouter `src/hooks/index.js` pour exporter `useLocalStorage`,
  - lister chaque occurrence (fichier+ligne) des hooks (exportable en CSV/markdown),
  - ajouter une courte section sur les tests (comment mocker `useLocalStorage`).

Fin.
# React Hooks — `useRef` et `useMemo`

Cette note résume deux hooks React utilisés dans le projet pour éviter des recalculs inutiles et stabiliser certaines valeurs entre les renders.

---

## `useRef`

`useRef` sert à conserver une valeur mutable sans déclencher de re-render.

### Quand l’utiliser
- Garder la dernière valeur d’un état technique
- Stocker un handler ou une instance sans recréer l’objet à chaque render
- Mémoriser une donnée qui ne doit pas redessiner l’interface

### Exemple

```jsx
const compteur = useRef(0)

compteur.current += 1
```

Ici, `compteur.current` change, mais React ne relance pas le composant.

### Dans le projet
- Utilisé pour stabiliser des références passées à MaterialReactTable
- Pratique quand un tableau reçoit des handlers qui changent souvent

---

## `useMemo`

`useMemo` sert à mémoriser le résultat d’un calcul et à le recalculer seulement si ses dépendances changent.

### Quand l’utiliser
- Calculs coûteux
- Tableau ou liste dérivée d’un state source
- Valeur calculée dont on veut garder la même référence entre deux renders

### Exemple

```jsx
const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price, 0)
}, [items])
```

Le calcul ne se refait que si `items` change.

### Dans le projet
- Déjà utilisé dans [docs/material-react-table.md](material-react-table.md)
- Sert à stabiliser les colonnes et les données d’un tableau

---

## Différence rapide

| Hook | Rôle | Déclenche un re-render ? |
|---|---|---|
| `useRef` | Stocker une valeur mutable | Non |
| `useMemo` | Mémoriser un calcul | Non, sauf si les dépendances changent |
| `useState` | Stocker un état UI | Oui |

---

## Bonnes pratiques dans ce projet

- Utiliser `useMemo` pour les listes dérivées comme `cartRows`
- Utiliser `useRef` pour garder des handlers stables passés à une table
- Éviter de reconstruire un objet ou un tableau à chaque render si le composant enfant est coûteux

---

## Voir aussi

- [Material React Table — Guide d'utilisation](material-react-table.md)
- [BOStatistic — Documentation détaillée](BOStatistic.md)