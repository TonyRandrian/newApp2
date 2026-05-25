import Category from "../entities/Category"
import {normalizeNumber} from "../utils/utils.js";

export default class ProductWithCombinations {
    /**
     * Construit un produit enrichi avec sa catégorie et ses déclinaisons.
     * Le DTO conserve l'objet produit d'origine pour garder accès à toutes ses propriétés.
     * @param {object} product - original Product instance (kept entirely)
     * @param {object|null} category - loaded category for the product
     * @param {object|null} declinaisons - result of product.getDeclinaisons()
     */
    constructor(product, category = null, declinaisons = null) {
        this.product = product
        this.category = category
        this.declinaisons = declinaisons
    }

    /**
     * Retourne un nom de catégorie lisible pour l'utilisateur.
     * La méthode privilégie le libellé traduit, puis le slug si nécessaire.
     * @returns {string}
     */
    getCategoryDisplayName() {
        const name = this?.category?.name

        if (typeof name === "string") {
            return name
        }

        if (Array.isArray(name) && name.length > 0) {
            const first = name[0]
            if (typeof first === "string") {
                return first
            }
            if (first && typeof first.value === "string") {
                return first.value
            }
        }

        return this?.category?.slug ?? ""
    }

    /**
     * Retourne l'impact de prix de la déclinaison sélectionnée.
     * Si aucune déclinaison valide n'est trouvée, la valeur retournée est 0.
     * @param {number|string} productAttributeId
     * @returns {number}
     */
    getCombinationPriceImpact(productAttributeId) {
        const attrId = Number(productAttributeId)

        if (!Number.isFinite(attrId) || attrId <= 0) {
            return 0
        }

        const values = this?.declinaisons?.value

        if (!Array.isArray(values) || values.length === 0) {
            return 0
        }

        const matched = values.find((value) => Number(value?.declinaisonId) === attrId)
        return normalizeNumber(matched?.priceImpact)
    }

    /**
     * Construit un DTO à partir d'un produit complet.
     * La catégorie et les déclinaisons sont chargées en parallèle pour limiter le temps d'attente.
     * @param {Product} product
     * @returns {Promise<ProductWithCombinations>}
     */
    static async createFromProduct(product) {
        if (!product) return null

        const categoryId = product.idCategoryDefault ?? product.categoryId ?? null
        const categoryPromise = categoryId ? await new Category({}, false).getById(categoryId) : null
        const declinaisonsPromise = product.getDeclinaisons()

        const [category, declinaisons] = await Promise.all([categoryPromise, declinaisonsPromise])

        return new ProductWithCombinations(product, category, declinaisons)
    }

    /**
     * Recherche la catégorie d'un produit dans une liste déjà chargée.
     * La fonction évite de refaire un appel réseau quand les catégories sont déjà en mémoire.
     * @param {object} product
     * @param {Array<object>} categories
     * @returns {object|null}
     */
    static findCategoryInList(product, categories = []) {
        if (!product || !Array.isArray(categories) || categories.length === 0) return null

        const categoryId = product.idCategoryDefault ?? product.categoryId ?? null
        if (categoryId == null) return null

        const numericCategoryId = Number(categoryId)
        return categories.find((category) => Number(category?.id) === numericCategoryId) ?? null
    }

    /**
     * Construit un DTO à partir d'un produit et d'une liste de catégories déjà chargée.
     * Cette variante réutilise la catégorie en cache puis charge seulement les déclinaisons du produit.
     * @param {object} product
     * @param {Array<object>} categories
     * @returns {Promise<ProductWithCombinations>}
     */
    static async createFromProductWithCategories(product, categories = []) {
        if (!product) return null

        const category = ProductWithCombinations.findCategoryInList(product, categories)
        const declinaisons = await product.getDeclinaisons()

        return new ProductWithCombinations(product, category, declinaisons)
    }

    /**
     * Construit une liste de DTOs pour des produits déjà chargés.
     * Les déclinaisons sont chargées en parallèle pour réduire le temps total.
     * @param {Array<Product>} products
     * @returns {Promise<Array<ProductWithCombinations>>}
     */
    static async listFromProducts(products = []) {
        if (!Array.isArray(products) || products.length === 0) return []
        const promises = products.map((product) => ProductWithCombinations.createFromProduct(product))
        return Promise.all(promises)
    }

    /**
     * Construit une liste de DTOs produits en réutilisant une liste de catégories déjà chargée.
     * Cette méthode est la plus utilisée quand on veut éviter un appel API par produit pour la catégorie.
     * @param {Array<object>} products
     * @param {Array<object>} categories
     * @returns {Promise<Array<ProductWithCombinations>>}
     */
    static async listFromProductsWithCategories(products = [], categories = []) {
        if (!Array.isArray(products) || products.length === 0) return []
        const promises = products.map((product) => ProductWithCombinations.createFromProductWithCategories(product, categories))
        return Promise.all(promises)
    }
}
