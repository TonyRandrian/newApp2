import {extractIdsFromXml} from "./parsing.js"

const PRESTASHOP_API_KEY = import.meta.env.VITE_PRESTASHOP_API_KEY;
const PRESTASHOP_API_URL = import.meta.env.VITE_PRESTASHOP_BACKEND_URL

const getHeaders = () => {
    const headers = {
        'Content-Type': 'application/xml; charset=UTF-8',
        'Accept': 'application/xml',
    };

    if (PRESTASHOP_API_KEY) {
        const basicAuth = btoa(`${PRESTASHOP_API_KEY}:`);
        headers['Authorization'] = `Basic ${basicAuth}`;
    }

    return headers;
};

const getAuthHeaders = () => {
    const headers = {
        'Accept': 'application/xml',
    };

    if (PRESTASHOP_API_KEY) {
        const basicAuth = btoa(`${PRESTASHOP_API_KEY}:`);
        headers['Authorization'] = `Basic ${basicAuth}`;
    }

    return headers;
};

/**
 * Effectuer une requête HTTP vers l'API et retourner le XML brut.
 * @param {string} endpoint
 * @param {Object} [options={}] – Options de fetch (method, body, headers, etc.)
 * @returns {Promise<string|null>} Corps XML brut ou null
 */
const requestRaw = async (endpoint, options = {}) => {
    const url = `${PRESTASHOP_API_URL}api/${endpoint}`;
    console.log(`[API] Requête vers ${url} avec options :`, options);

    const fetchOptions = {
        ...options,
        headers: {
            ...getHeaders(),
            ...options.headers,
        },
    };

    if (typeof fetchOptions.body === "string") {
        fetchOptions.body = fetchOptions.body.trimStart();
    }

    // Journaliser la requête
    if (fetchOptions.body) {
        console.groupCollapsed(`[API] ${options.method || 'GET'} ${endpoint}`);
        console.log('📤 XML envoyé :', fetchOptions.body);
        console.groupEnd();
    }

    const response = await fetch(url, fetchOptions);
    if (response.status === 204) {
        return null;
    }

    const rawBody = await response.text().catch(() => null);

    if (!response.ok) {
        const error = new Error(response.statusText || `Erreur HTTP ${response.status}`);
        error.status = response.status;
        error.data = rawBody;
        console.error('[API] Reponse erreur brute :', rawBody);
        throw error;
    }

    console.groupCollapsed(`[API] ✅ ${options.method || 'GET'} ${endpoint}`);
    console.log('📥 XML recu :', rawBody);
    console.groupEnd();

    return rawBody;
};

/**
 * Envoyer une requete HTTP avec un FormData et retourner la reponse brute.
 * Evite de forcer Content-Type pour laisser le navigateur definir le boundary.
 * @param {string} endpoint
 * @param {FormData} formData
 * @param {Object} [options={}] – Options de fetch (method, headers, etc.)
 * @returns {Promise<string|null>} Corps brut ou null
 */
const requestRawFormData = async (endpoint, formData, options = {}) => {
    const url = `${PRESTASHOP_API_URL}${endpoint}`;
    console.log(`[API] Requête vers ${url} avec FormData.`);

    const fetchOptions = {
        method: options.method || 'POST',
        ...options,
        body: formData,
        headers: {
            ...getAuthHeaders(),
            ...options.headers,
        },
    };

    const response = await fetch(url, fetchOptions);
    if (response.status === 204) {
        return null;
    }

    const rawBody = await response.text().catch(() => null);

    if (!response.ok) {
        const error = new Error(response.statusText || `Erreur HTTP ${response.status}`);
        error.status = response.status;
        error.data = rawBody;
        console.error('[API] Reponse erreur brute :', rawBody);
        throw error;
    }

    console.groupCollapsed(`[API] ✅ ${fetchOptions.method} ${endpoint}`);
    console.log('📥 Reponse recu :', rawBody);
    console.groupEnd();

    return rawBody;
};

const deleteAll = async (endpoint, idsToKeep = []) => {
    if (!endpoint) {
        throw new Error("deleteAll requires an endpoint");
    }

    const keepSet = new Set(idsToKeep.map((id) => Number(id)).filter((id) => Number.isFinite(id)));
    const xml = await requestRaw(`${endpoint}?display=[id]`, {method: 'GET'});
    const ids = extractIdsFromXml(xml);

    const deletedIds = [];
    const skippedIds = [];

    for (const id of ids) {
        const numericId = Number(id);

        if (keepSet.has(numericId)) {
            skippedIds.push(numericId);
            continue;
        }

        try{
            await api.delete(`${endpoint}/${numericId}`);
        }catch(error){
            console.error(`Erreur lors de la suppression de ${endpoint} avec id ${numericId}:`, error);
            continue;
        }
        deletedIds.push(numericId);
    }

    return true;
};

const api = {
    get: (endpoint) =>
        requestRaw(endpoint, {method: 'GET'}),

    post: (endpoint, rawXml) =>
        requestRaw(endpoint, {method: 'POST', body: rawXml}),

    delete: (endpoint) =>
        requestRaw(endpoint, {method: 'DELETE'}),

    put: (endpoint, rawXml) =>
        requestRaw(endpoint, {method: 'PUT', body: rawXml}),

    patch: (endpoint, rawXml) =>
        requestRaw(endpoint, {method: 'PATCH', body: rawXml}),

    postFormData: (endpoint, formData, options = {}) =>
        requestRawFormData(endpoint, formData, {method: 'POST', ...options}),

    deleteAll,
};

export default api;
