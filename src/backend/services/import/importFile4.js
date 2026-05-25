import JSZip from 'jszip'

const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg']

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

const getFileExtension = (fileName) => {
	const index = fileName.lastIndexOf('.')
	return index >= 0 ? fileName.slice(index).toLowerCase() : ''
}

const isSupportedImageFile = (fileName) => SUPPORTED_IMAGE_EXTENSIONS.includes(getFileExtension(fileName))

const isZipFile = (file) => {
	if (!file) {
		return false
	}

	const name = (file.name || '').toLowerCase()
	return name.endsWith('.zip') || file.type === 'application/zip'
}

const extractImagesFromZip = async (zipFile) => {
	const zip = await JSZip.loadAsync(zipFile)
	const extractedFiles = []

	for (const entry of Object.values(zip.files)) {
		if (entry.dir) {
			continue
		}

		if (entry.name.includes('/')) {
			continue
		}

		if (!isSupportedImageFile(entry.name)) {
			continue
		}

		const blob = await entry.async('blob')
		extractedFiles.push(new File([blob], entry.name, {
			type: blob.type || 'application/octet-stream',
			lastModified: zipFile.lastModified || Date.now(),
		}))
	}

	return extractedFiles
}

const resolveImageFiles = async (imageFiles) => {
	const files = Array.isArray(imageFiles)
		? imageFiles
		: imageFiles && typeof imageFiles.length === 'number' && typeof imageFiles !== 'string'
			? Array.from(imageFiles)
			: imageFiles
				? [imageFiles]
				: []

	if (files.length === 1 && isZipFile(files[0])) {
		return extractImagesFromZip(files[0])
	}

	return files.filter((file) => isSupportedImageFile(file.name))
}

const uploadProductImage = async (productId, file) => {
	const baseUrl = import.meta.env.VITE_PRESTASHOP_BACKEND_URL || ''
	const apiKey = import.meta.env.VITE_PRESTASHOP_API_KEY
	const authQuery = apiKey ? `?ws_key=${encodeURIComponent(apiKey)}` : ''
	const url = `${baseUrl}api/images/products/${productId}${authQuery}`
	const formData = new FormData()
	formData.append('image', file, file.name)

	const response = await fetch(url, {
		method: 'POST',
		body: formData,
	})

	if (!response.ok) {
		const contentType = response.headers.get('content-type')
		let errorText = `HTTP ${response.status}`

		if (contentType?.includes('application/json')) {
			try {
				const errorData = await response.json()
				errorText = errorData.message || errorData.error || errorText
			} catch {
				errorText = await response.text()
			}
		} else {
			errorText = await response.text()
		}

		throw new Error(`Upload échoué: ${errorText}`)
	}

	const contentType = response.headers.get('content-type')
	if (contentType?.includes('application/json')) {
		return await response.json()
	}

	return await response.text()
}

export const importFile4 = async (imageFiles, file1Results, onProgress = () => {}) => {
	const results = {
		images: [],
		errors: [],
		summary: {
			totalImages: 0,
			successImages: 0,
			totalErrors: 0,
		},
	}

	try {
		if (!imageFiles) {
			throw new Error('Aucun fichier image sélectionné')
		}

		if (!file1Results?.products) {
			throw new Error('Les données du Fichier 1 (produits) sont manquantes')
		}

		const productsByReference = {}
		for (const product of file1Results.products) {
			if (product?.status === 'success' && product.id && product.reference) {
				productsByReference[product.reference] = product.id
			}
		}

		const validImages = await resolveImageFiles(imageFiles)
		results.summary.totalImages = validImages.length

		if (validImages.length === 0) {
			throw new Error('Aucun fichier image valide (.png/.jpg/.jpeg) trouvé')
		}

		for (let idx = 0; idx < validImages.length; idx++) {
			const file = validImages[idx]
			try {
				const fileName = file.name
				const dotIndex = fileName.lastIndexOf('.')
				const reference = dotIndex >= 0 ? fileName.substring(0, dotIndex) : fileName

				if (!reference) {
					continue
				}

				const productId = productsByReference[reference]
				if (!productId) {
					continue
				}

				await uploadProductImage(productId, file)

				onProgress?.({
					step: 'images',
					message: `Import des images... (${idx + 1}/${validImages.length})`,
					progress: ((idx + 1) / validImages.length) * 100,
				})

				pushSuccess(results.images, {
					fileName,
					reference,
					productId,
				})
				results.summary.successImages++
			} catch (error) {
				pushError(results.images, results.errors, { fileName: file.name }, `Image '${file.name}'`, error)
			}
		}

		results.summary.totalErrors = results.errors.length
		onProgress?.({ step: 'complete', message: 'Import Fichier 4 (Images) terminé!' })

		// Si des erreurs ont été accumulées, relancer une exception pour déclencher le reset
		if (results.errors.length > 0) {
			const errorSummary = results.errors.join('\n')
			throw new Error(`Erreurs lors de l'import fichier 4 (images):\n${errorSummary}`)
		}

		return results
	} catch (error) {
		results.errors.push(`Erreur générale Fichier 4: ${error.message}`)
		results.summary.totalErrors = results.errors.length
		throw error
	}
}

export const parseFile4CSV = async () => []

export { importFile4 as importImage }