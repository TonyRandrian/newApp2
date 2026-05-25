# Hooks utilisés dans le projet

Résumé rapide
- Hooks React natifs utilisés : `useState`, `useEffect`, `useMemo`, `useRef`.
- Hook custom présent : `useLocalStorage` (dans `src/hooks`).

Hook custom
- `useLocalStorage` — [src/hooks/useLocalStorage.jsx](src/hooks/useLocalStorage.jsx#L1)
  - Utilisé pour stocker/récupérer des valeurs persistantes (ex : `user`, `isGuest`).

Hooks natifs (exemples de fichiers)
- `useState` : utilisé largement pour l'état local (ex : [src/pages/BOOrderList.jsx](src/pages/BOOrderList.jsx#L1), [src/pages/FOOrderList.jsx](src/pages/FOOrderList.jsx#L1), [src/pages/FOCart.jsx](src/pages/FOCart.jsx#L1), [src/pages/FOGuestCheckout.jsx](src/pages/FOGuestCheckout.jsx#L1), [src/pages/BOImport.jsx](src/pages/BOImport.jsx#L1)).
- `useEffect` : utilisé pour fetch/side-effects (ex : [src/pages/FOOrderList.jsx](src/pages/FOOrderList.jsx#L1), [src/components/FOOrderRow.jsx](src/components/FOOrderRow.jsx#L1), [src/pages/BOStatistic.jsx](src/pages/BOStatistic.jsx#L1)).
- `useMemo` : utilisé pour mémoïser données/colonnes/filtrages (ex : [src/pages/BOStatistic.jsx](src/pages/BOStatistic.jsx#L71), [src/components/BOOrderRow.jsx](src/components/BOOrderRow.jsx#L68), [src/pages/FOOrderList.jsx](src/pages/FOOrderList.jsx#L92)).
- `useRef` : utilisé pour stabiliser des handlers/meta passés aux tables (ex : [src/components/FOOrderRow.jsx](src/components/FOOrderRow.jsx#L70), [src/components/BOOrderRow.jsx](src/components/BOOrderRow.jsx#L52)).

Hooks non trouvés
- Les hooks suivants ne sont pas présents dans `src/`: `useCallback`, `useContext`, `useReducer`, `useLayoutEffect`, `useImperativeHandle`, `useDebugValue`.

Remarques & suggestions
- Si vous souhaitez un index/export central pour les hooks custom, je peux ajouter `src/hooks/index.js` qui exporte `useLocalStorage`.
- Pour la performance sur de grandes tables, continuer d'utiliser `useMemo` pour les données/colonnes et `useRef` pour les handlers (déjà appliqué dans les composants MRT).

Si vous voulez, je peux :
- générer `src/hooks/index.js` et exporter les hooks custom,
- détailler tous les emplacements (fichier+ligne) où chaque hook apparaît.
