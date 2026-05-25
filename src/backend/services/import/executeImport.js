import { importFile1 } from './importFile1.js'
import { importFile2 } from './importFile2.js'
import { importFile3 } from './importFile3.js'
import { importFile4 } from './importFile4.js'
import { validateImportBatch } from './importValidation.js'
import { deleteAll, RESOURCES_TO_RESET } from '../Reset.js'

const executeImport = async ({ productFile, declinaisonFile, ordersFile, imageZipFile, doImport, onProgress } = {}) => {
	try {
		if (productFile) {
			// Valider tous les fichiers avant l'import
			const validationResult = await validateImportBatch({
				productFile,
				declinaisonFile,
				ordersFile,
			})

			if (!validationResult.valid) {
				const errorMessages = validationResult.errors
					.map((err) => `${err.file} (ligne ${err.line}): ${err.message}`)
					.join('\n')
				throw new Error(`Validation échouée:\n${errorMessages}`)
			}

			const file1 = await importFile1(productFile, onProgress)
			const output = { file1 }

			if (declinaisonFile) {
				output.file2 = await importFile2(declinaisonFile, file1, onProgress)
			}

			if (ordersFile) {
				output.file3 = await importFile3(ordersFile, file1, output.file2 ?? { combinations: [] }, onProgress)
			}

			if (imageZipFile && !doImport) {
				output.file4 = await importFile4(imageZipFile, file1, onProgress)
			}

			return output
		}

		throw new Error('Le fichier produits est obligatoire')
	} catch (error) {
		console.error('Erreur pendant l\'import. Réinitialisation de la base de données...', error)
		try {
			const resourcesToDelete = RESOURCES_TO_RESET.map((r) => r.value)
			await deleteAll(resourcesToDelete)
			console.log('Base de données réinitialisée après erreur d\'import')
		} catch (resetError) {
			console.error('Erreur lors de la réinitialisation de la base de données:', resetError)
		}
		throw error
	}
}

export default executeImport