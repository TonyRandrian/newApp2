import StockMvt from "../entities/StockMvt.js";
import Product from "../entities/Product.js";
import Order from "../entities/Order.js";
import OrderDetail from "../entities/OrderDetail.js";
import {toDayKey} from "../utils/parsing.js";

// Retourne l'historique des mouvements de stock d'un produit/déclinaison, agrégé par jour.
// Retour : Promise<Array<EnrichedBucket>> (voir enrichWithReservations pour la forme).
// Tableau trié chronologiquement, vide si aucun mouvement ni réservation.
export async function getDailyMovement(idProduct, idProductAttribute, productDetails = null) {
    const attrId = Number(idProductAttribute) || 0

    // Cas 1 : une déclinaison précise est ciblée -> on agrège uniquement ses mouvements
    if (attrId > 0) {
        return getDailyMovementWithoutDeclination(idProduct, attrId, productDetails)
    }

    // Cas 2 : produit parent possédant des déclinaisons -> on agrège toutes ses déclinaisons
    const hasDeclinations = Array.isArray(productDetails?.declinations) && productDetails.declinations.length > 0
    if (hasDeclinations) {
        return getDailyMovementWithDeclinations(idProduct, attrId, productDetails)
    }

    // Cas 3 : produit simple (sans déclinaison)
    return getDailyMovementWithoutDeclination(idProduct, 0, productDetails)
}

// Retourne les mouvements quotidiens pour un produit (ou une déclinaison précise)
// et y ajoute les réservations journalières cumulées.
// Retour : Promise<Array<EnrichedBucket>> (voir enrichWithReservations).
export async function getDailyMovementWithoutDeclination(idProduct, idProductAttribute, productDetails = null) {
    const mvt = new StockMvt({}, false)
    const movements = await mvt.getAllByProductAndAttribute(idProduct, idProductAttribute)
    const dayBuckets = aggregateByDay(movements)

    const allowedAttrIds = resolveAllowedAttrIds(idProductAttribute, productDetails)
    const dailyReservedMap = await fetchDailyReservedMap(idProduct, allowedAttrIds, movements)

    return enrichWithReservations(dayBuckets, dailyReservedMap)
}

// Agrège une liste de mouvements bruts par jour.
// Les mouvements sont triés chronologiquement pour que le cumul (final) soit correct,
// et la dernière écriture du jour donne automatiquement le stock en fin de journée.
//
// Retour : Array<DayBucket> trié par date croissante, où DayBucket = {
//   date:      string,   // "YYYY-MM-DD"
//   totalIn:   number,   // somme des quantités entrantes (sign>0) du jour
//   totalOut:  number,   // somme des quantités sortantes (sign<0) du jour
//   net:       number,   // totalIn - totalOut
//   count:     number,   // nb de mouvements agrégés ce jour
//   movements: StockMvt[], // mouvements bruts du jour
//   final:     number,   // stock physique cumulé en fin de journée
// }
function aggregateByDay(movements) {
    const sorted = [...movements].sort((a, b) => {
        const dateA = a.dateAdd ?? ""
        const dateB = b.dateAdd ?? ""
        return dateA.localeCompare(dateB)
    })

    const byDay = new Map()
    let final = 0

    for (const m of sorted) {
        const day = toDayKey(m.dateAdd)
        if (!day) continue

        const quantity = Number(m.physicalQuantity) || 0
        const sign = Number(m.sign) || 0
        const delta = sign * quantity

        const bucket = byDay.get(day) ?? {
            date: day,
            totalIn: 0,
            totalOut: 0,
            net: 0,
            count: 0,
            movements: [],
            final: 0
        }

        if (sign > 0) bucket.totalIn += quantity
        else if (sign < 0) bucket.totalOut += quantity

        bucket.net += delta
        bucket.count += 1
        bucket.movements.push(m)

        final += delta
        bucket.final = final

        byDay.set(day, bucket)
    }

    return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
}


// Calcule l'ensemble des productAttributeId valides pour le cas ciblé :
//  - déclinaison précise      -> { attrId }
//  - produit parent + déclinaisons -> { combinationId, ... }
//  - produit simple           -> { 0 }
//
// Retour : Set<number> (jamais vide ; au pire { 0 } pour un produit simple).
function resolveAllowedAttrIds(idProductAttribute, productDetails) {
    // déclinaison précise
    const attrId = Number(idProductAttribute) || 0
    if (attrId > 0) return new Set([attrId])

    // toutes les déclinaisons d'un produit
    const declinations = productDetails?.declinations
    if (Array.isArray(declinations) && declinations.length > 0) {
        return new Set(
            declinations
                .map((d) => Number(d.combinationId))
                .filter(Number.isFinite)
        )
    }

    // produit simple
    return new Set([0])
}

// Calcule les variations quotidiennes du stock réservé pour le produit ciblé,
// en ne gardant que les lignes dont productAttributeId appartient à allowedAttrIds.
// Chaque commande contribue :
//   - +quantité au jour de la commande (réservation)
//   - -quantité au jour de la libération (livraison effective), si elle a été livrée.
// La libération est positionnée à la date du mouvement de sortie (StockMvt sign=-1)
// lié à la commande quand on en trouve un — c'est le moment où le stock quitte
// réellement l'entrepôt. À défaut, on retombe sur order.deliveryDate.
// La map renvoyée contient donc des deltas signés ; le cumul est fait par l'appelant.
//
// Retour : Promise<Map<string, number>> où la clé est un jour "YYYY-MM-DD" et la
// valeur le delta net de réservation pour ce jour (positif = nouvelles réservations,
// négatif = libérations). Les jours sans variation ne figurent pas dans la map.
async function fetchDailyReservedMap(idProduct, allowedAttrIds, movements = []) {
    // États considérés comme "réservé" (commande qui retient du stock)
    const reservedStateIds = Array.isArray(Order.reservedStateIds) ? Order.reservedStateIds : []
    // États considérés comme "livré" (commande qui libère le stock réservé à sa date de livraison)
    const deliveredStateIds = Array.isArray(Order.deliveredStateIds) ? Order.deliveredStateIds : []

    const trackedStateIds = [...reservedStateIds, ...deliveredStateIds]
    // Si aucun état n'est configuré, rien à calculer
    if (trackedStateIds.length === 0) return new Map()

    // Récupère toutes les commandes pertinentes (réservées OU livrées)
    const orders = await new Order({}, false).getBy("currentState", trackedStateIds)
    if (orders.length === 0) return new Map()

    // Récupère toutes les lignes associées à ces commandes
    const orderIds = orders.map((order) => order.id)
    const orderDetails = await new OrderDetail({}, false).getBy("orderId", orderIds)

    const deliveredSet = new Set(deliveredStateIds.map(Number))

    // Map orderId -> date du 1er mouvement de sortie lié à la commande.
    // Sert à libérer la réservation au jour où le stock a réellement quitté l'entrepôt,
    // plutôt qu'au order.deliveryDate (qui peut être une date prévue côté client).
    const exitDateByOrderId = new Map()
    for (const mvt of movements) {
        const sign = Number(mvt.sign) || 0
        const orderId = Number(mvt.idOrder) || 0
        if (sign >= 0 || orderId <= 0) continue
        const day = toDayKey(mvt.dateAdd)
        if (!day) continue
        const existing = exitDateByOrderId.get(orderId)
        if (!existing || day < existing) exitDateByOrderId.set(orderId, day)
    }

    // Pour chaque commande : date de commande, et date de libération si elle a été livrée
    const orderInfoById = new Map()
    for (const order of orders) {
        const id = Number(order.id)
        const isDelivered = deliveredSet.has(Number(order.currentState))
        // Priorité : date du mouvement de sortie lié à la commande, sinon order.deliveryDate
        const releaseDate = isDelivered
            ? (exitDateByOrderId.get(id) ?? order.deliveryDate)
            : null
        orderInfoById.set(id, {
            orderDate: order.dateAdd,
            deliveryDate: releaseDate,
        })
    }

    const targetProductId = Number(idProduct)
    const dailyDelta = new Map()

    const addDelta = (day, value) => {
        if (!day || value === 0) return
        dailyDelta.set(day, (dailyDelta.get(day) ?? 0) + value)
    }

    // Parcourt les lignes de commande et émet les deltas (+ réservation, - libération)
    for (const detail of orderDetails) {
        // Ne garder que les lignes correspondant au produit ciblé
        if (Number(detail.productId) !== targetProductId) continue
        // Ne garder que les lignes dont l'attribut/déclinaison est autorisé
        if (!allowedAttrIds.has(Number(detail.productAttributeId))) continue

        const info = orderInfoById.get(Number(detail.orderId))
        if (!info) continue

        const quantity = Number(detail.productQuantity) || 0
        if (quantity === 0) continue

        // Réservation : +qty au jour de la commande
        addDelta(toDayKey(info.orderDate), quantity)

        // Libération : -qty au jour de la livraison (uniquement si commande livrée)
        if (info.deliveryDate) {
            addDelta(toDayKey(info.deliveryDate), -quantity)
        }
    }

    return dailyDelta
}

// Fusionne les réservations journalières avec les jours déjà agrégés depuis les mouvements.
// Ajoute trois champs par jour : reservedDaily (jour), reserved (cumul) et remaining (final - reserved).
// Les jours qui n'ont que des réservations sont ajoutés avec un final reporté du dernier jour connu.
//
// Retour : Array<EnrichedBucket> trié par date croissante, où EnrichedBucket = DayBucket + {
//   reservedDaily: number, // delta de réservation pour ce jour (signé, 0 si absent)
//   reserved:      number, // cumul des réservations depuis le début (peut diminuer)
//   remaining:     number, // final - reserved (stock réellement disponible)
// }
function enrichWithReservations(dayBuckets, dailyReservedMap) {
    // Indexe les buckets existants par date pour un accès rapide
    const bucketsByDate = new Map(dayBuckets.map((bucket) => [bucket.date, bucket]))

    // Ajoute les jours présents dans les réservations mais absents des mouvements
    for (const day of dailyReservedMap.keys()) {
        if (!bucketsByDate.has(day)) {
            // Crée un bucket vide qui sera complété avec les valeurs réservées
            bucketsByDate.set(day, {
                date: day,
                totalIn: 0,
                totalOut: 0,
                net: 0,
                count: 0,
                movements: [],
                final: 0,
            })
        }
    }

    // Parcours des dates dans l'ordre chronologique
    const sortedDates = Array.from(bucketsByDate.keys()).sort()
    let lastFinal = 0 // stock final connu du jour précédent
    let reservedCum = 0 // cumul des réservations jusqu'à la date courante
    const result = []

    for (const date of sortedDates) {
        const bucket = bucketsByDate.get(date)

        // Si aucune écriture de mouvement ce jour, reprendre le `final` précédent
        if (bucket.movements.length === 0) {
            bucket.final = lastFinal
        } else {
            // Sinon, mettre à jour `lastFinal` avec le final calculé pour ce jour
            lastFinal = bucket.final
        }

        // Quantité réservée ce jour (zéro si absent)
        const reservedThisDay = dailyReservedMap.get(date) ?? 0
        // Met à jour le cumul des réservations
        reservedCum += reservedThisDay
        // Ajoute les champs attendus par la logique de présentation
        bucket.reservedDaily = reservedThisDay
        bucket.reserved = reservedCum
        // Quantité restante = stock final - réservations cumulées
        bucket.remaining = bucket.final - reservedCum

        result.push(bucket)
    }

    return result
}

// Agrège les mouvements de toutes les déclinaisons d'un produit
// et y ajoute les réservations journalières cumulées pour le produit.
// Retour : Promise<Array<EnrichedBucket>> (voir enrichWithReservations).
// Tableau vide si le produit n'a aucune déclinaison.
export async function getDailyMovementWithDeclinations(idProduct, idProductAttribute, productDetails = null) {
    const productId = productDetails?.product?.id ?? idProduct
    const declinations = productDetails?.declinations ?? await fetchDeclinationsFromDb(productId)

    if (declinations.length === 0) return []

    const mvt = new StockMvt({}, false)

    // Fusion de tous les mouvements de toutes les déclinaisons en une seule liste,
    // puis agrégation globale -> le cumul `final` est le stock total du produit.
    const allMovements = []
    for (const declination of declinations) {
        const movements = await mvt.getAllByProductAndAttribute(productId, declination.combinationId)
        allMovements.push(...movements)
    }

    const dayBuckets = aggregateByDay(allMovements)

    const allowedAttrIds = resolveAllowedAttrIds(0, {...(productDetails ?? {}), declinations})
    const dailyReservedMap = await fetchDailyReservedMap(productId, allowedAttrIds, allMovements)

    return enrichWithReservations(dayBuckets, dailyReservedMap)
}

// Récupère la liste des combinationId d'un produit depuis Prestashop
// (utilisé quand productDetails n'est pas fourni par l'appelant).
//
// Retour : Promise<Array<{combinationId: number}>> ; tableau vide si le produit
// n'a aucune déclinaison référencée dans associations.stockAvailables.
async function fetchDeclinationsFromDb(idProduct) {
    const product = await new Product({}, false).getById(idProduct)
    const entries = product.associations?.stockAvailables ?? []

    return entries
        .map((entry) => ({combinationId: Number(entry.idProductAttribute)}))
        .filter((d) => Number.isFinite(d.combinationId) && d.combinationId > 0)
}
