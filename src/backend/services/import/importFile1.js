import Category from '../../entities/Category.js'
import Tax from '../../entities/Tax.js'
import TaxRuleGroup from '../../entities/TaxRuleGroup.js'
import TaxRule from '../../entities/TaxRule.js'
import Product from '../../entities/Product.js'
import { parseCSV } from '../../utils/csv.js'
import { convertDateFormat, convertTTCtoHT, normalizeNumber, toSlug } from '../../utils/utils.js'

const CONSTANTS = {
	ID_PARENT_CATEGORY: 2,
	ID_COUNTRY: 8,
}

const pushSuccess = (collection, payload) => {
	collection.push({
		...payload,
		status: 'success',
	})
}

const pushError = (collection, errors, payload, label, error) => {
	collection.push({
		...payload,
		status: 'error',
		error: error?.message ?? 'Erreur inconnue',
	})
	errors.push(`${label}: ${error?.message ?? 'Erreur inconnue'}`)
}

export const parseFile1CSV = async (file) => {
	const text = await file.text()
	return parseCSV(text)
}

export const extractCategories = (csvData) => {
	const categories = new Set()
	for (const row of csvData) {
		const categoryName = row.categorie?.trim() ?? ''
		if (categoryName) {
			categories.add(categoryName)
		}
	}
	return Array.from(categories)
}

export const extractTaxes = (csvData) => {
	const taxes = new Map()
	for (const row of csvData) {
		const rate = row.taxe?.trim() ?? ''
		if (rate && !taxes.has(rate)) {
			taxes.set(rate, `TVA ${rate}`)
		}
	}
	return taxes
}

export const buildCategoryEntity = (categoryName) => {
	const category = new Category('', false)
	category.parentId = CONSTANTS.ID_PARENT_CATEGORY
	category.active = 1
	category.idShopDefault = 1
	category.isRootCategory = 0
	category.position = 0
	category.name = categoryName
	category.slug = toSlug(categoryName)
	category.description = ''
	category.metaTitle = categoryName
	category.metaDescription = ''
	category.metaKeywords = ''
	return category
}

export const buildTaxEntity = (rate, name) => {
	const tax = new Tax('', false)
	tax.rate = normalizeNumber(rate)
	tax.active = 1
	tax.deleted = 0
	tax.name = name
	return tax
}

export const buildTaxRuleGroupEntity = (rate) => {
	const group = new TaxRuleGroup('', false)
	group.name = `Groupe TVA ${rate}`
	group.active = 1
	group.deleted = 0
	return group
}

export const buildTaxRuleEntity = (groupId, taxId, rate) => {
	const rule = new TaxRule('', false)
	rule.idTaxRulesGroup = groupId
	rule.idCountry = CONSTANTS.ID_COUNTRY
	rule.idTax = taxId
	rule.behavior = 0
	rule.description = `TVA ${rate}`
	return rule
}

export const buildProductEntity = (productData, categoryId, taxRulesGroupId) => {
	const product = new Product('', false)
	const productName = productData.nom?.trim() ?? ''
	const reference = productData.reference?.trim() ?? ''
	const priceTtc = productData.prix_ttc?.trim() ?? ''
	const purchasePrice = productData.prix_achat?.trim() ?? ''
	const taxRate = productData.taxe?.trim() ?? ''
	const availableDate = productData.date_availability_produit?.trim() ?? ''

	product.idCategoryDefault = categoryId
	product.idTaxRulesGroup = taxRulesGroupId
	product.reference = reference
	product.price = convertTTCtoHT(priceTtc, taxRate)
	product.wholesalePrice = normalizeNumber(purchasePrice)
	product.active = 1
	product.availableForOrder = 1
	product.showPrice = 1
	product.indexed = 1
	product.visibility = 'both'
	product.condition = 'new'
	product.minimalQuantity = 1
	product.availableDate = availableDate ? convertDateFormat(availableDate) || availableDate : null
	product.name = productName
	product.linkRewrite = toSlug(productName)
	product.metaTitle = productName
	product.description = ''
	product.descriptionShort = ''
	product.availableNow = ''
	product.availableLater = ''
	product.associations = {
		...product.associations,
		categories: [categoryId],
	}

	return product
}

export const createCategories = async (categories, results) => {
	const categoryMap = {}

	for (const categoryName of categories) {
		try {
			const savedCategory = await buildCategoryEntity(categoryName).save()
			const categoryId = savedCategory.id ?? null
			categoryMap[categoryName] = categoryId
			pushSuccess(results.categories, { name: categoryName, id: categoryId })
		} catch (error) {
			pushError(results.categories, results.errors, { name: categoryName }, `Categorie '${categoryName}'`, error)
		}
	}

	return categoryMap
}

export const createTaxes = async (taxes, results) => {
	const taxMap = new Map()

	for (const [rate, name] of taxes.entries()) {
		try {
			const savedTax = await buildTaxEntity(rate, name).save()
			const taxId = savedTax.id ?? null
			taxMap.set(rate, taxId)
			pushSuccess(results.taxes, { rate, name, id: taxId })
		} catch (error) {
			pushError(results.taxes, results.errors, { rate, name }, `Taxe '${rate}'`, error)
		}
	}

	return taxMap
}

export const createTaxRulesGroups = async (taxes, results) => {
	const groupMap = {}

	for (const [rate] of taxes.entries()) {
		try {
			const savedGroup = await buildTaxRuleGroupEntity(rate).save()
			const groupId = savedGroup.id ?? null
			groupMap[rate] = groupId
			pushSuccess(results.taxRulesGroups, { rate, groupName: `Groupe TVA ${rate}`, id: groupId })
		} catch (error) {
			pushError(results.taxRulesGroups, results.errors, { rate }, `Groupe de taxe '${rate}'`, error)
		}
	}

	return groupMap
}

export const createTaxRules = async (taxMap, taxRulesGroupMap, results) => {
	for (const [rate, taxId] of taxMap.entries()) {
		try {
			const groupId = taxRulesGroupMap[rate]
			if (!groupId) {
				throw new Error(`Groupe de taxe non trouve pour ${rate}`)
			}

			const savedRule = await buildTaxRuleEntity(groupId, taxId, rate).save()
			pushSuccess(results.taxRules, {
				rate,
				taxId,
				groupId,
				ruleId: savedRule.id ?? null,
			})
		} catch (error) {
			pushError(results.taxRules, results.errors, { rate }, `Regle de taxe '${rate}'`, error)
		}
	}
}

export const createProducts = async (csvData, categoryMap, taxRulesGroupMap, results, onProgress) => {
	for (let idx = 0; idx < csvData.length; idx++) {
		const row = csvData[idx]
		const productName = row.nom?.trim() ?? ''
		const categoryName = row.categorie?.trim() ?? ''
		const taxRate = row.taxe?.trim() ?? ''
		const reference = row.reference?.trim() ?? ''

		try {
			const categoryId = categoryMap[categoryName] ?? CONSTANTS.ID_PARENT_CATEGORY
			const taxRulesGroupId = taxRulesGroupMap[taxRate]

			if (!taxRulesGroupId) {
				throw new Error(`Groupe de taxe '${taxRate}' non trouve`)
			}

			const savedProduct = await buildProductEntity(row, categoryId, taxRulesGroupId).save()

			onProgress?.({
				step: 'products',
				message: `Creation des produits... (${idx + 1}/${csvData.length})`,
				progress: ((idx + 1) / csvData.length) * 100,
			})

			pushSuccess(results.products, {
				reference,
				name: productName,
				id: savedProduct.id ?? null,
				priceHT: convertTTCtoHT(row.prix_ttc?.trim() ?? '', taxRate),
				wholesalePrice: normalizeNumber(row.prix_achat?.trim() ?? ''),
				taxRate: normalizeNumber(taxRate),
				availableDate: savedProduct.availableDate ?? convertDateFormat(row.date_availability_produit?.trim() ?? ''),
			})
		} catch (error) {
			pushError(results.products, results.errors, { reference, name: productName }, `Produit '${reference}'`, error)
		}
	}
}

export const buildSummary = (results) => {
	return {
		totalCategories: results.categories.length,
		successCategories: results.categories.filter((item) => item.status === 'success').length,
		totalTaxes: results.taxes.length,
		successTaxes: results.taxes.filter((item) => item.status === 'success').length,
		totalTaxRulesGroups: results.taxRulesGroups.length,
		successTaxRulesGroups: results.taxRulesGroups.filter((item) => item.status === 'success').length,
		totalTaxRules: results.taxRules.length,
		successTaxRules: results.taxRules.filter((item) => item.status === 'success').length,
		totalProducts: results.products.length,
		successProducts: results.products.filter((item) => item.status === 'success').length,
		totalErrors: results.errors.length,
	}
}

export const importFile1 = async (csvFile, onProgress = () => {}) => {
	const results = {
		categories: [],
		taxes: [],
		taxRulesGroups: [],
		taxRules: [],
		products: [],
		errors: [],
		summary: {},
	}

	onProgress?.({ step: 'parsing', message: 'Parsing du CSV...' })
	const csvData = await parseFile1CSV(csvFile)

	if (!csvData || csvData.length === 0) {
		throw new Error('Fichier CSV vide')
	}

	const categories = extractCategories(csvData)
	const taxes = extractTaxes(csvData)

	onProgress?.({ step: 'categories', message: 'Creation des categories...' })
	const categoryMap = await createCategories(categories, results)

	onProgress?.({ step: 'taxes', message: 'Creation des taxes...' })
	const taxMap = await createTaxes(taxes, results)

	onProgress?.({ step: 'taxRulesGroups', message: 'Creation des groupes de taxes...' })
	const taxRulesGroupMap = await createTaxRulesGroups(taxes, results)

	onProgress?.({ step: 'taxRules', message: 'Creation des regles de taxe...' })
	await createTaxRules(taxMap, taxRulesGroupMap, results)

	onProgress?.({ step: 'products', message: 'Creation des produits...' })
	await createProducts(csvData, categoryMap, taxRulesGroupMap, results, onProgress)

	results.summary = buildSummary(results)
	onProgress?.({ step: 'complete', message: 'Import termine!' })

	// Si des erreurs ont été accumulées, relancer une exception pour déclencher le reset
	if (results.errors.length > 0) {
		const errorSummary = results.errors.join('\n')
		throw new Error(`Erreurs lors de l'import fichier 1 (produits/taxes):\n${errorSummary}`)
	}

	return results
}

const importFile1Service = {
	parseFile1CSV,
	extractCategories,
	extractTaxes,
	buildCategoryEntity,
	buildTaxEntity,
	buildTaxRuleGroupEntity,
	buildTaxRuleEntity,
	buildProductEntity,
	createCategories,
	createTaxes,
	createTaxRulesGroups,
	createTaxRules,
	createProducts,
	buildSummary,
	importFile1,
}

export default importFile1Service
