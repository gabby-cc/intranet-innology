// Funciones compartidas para hablar con los archivos PHP de php/rh/
const BASE = 'php/rh/';

async function procesar(respuesta, archivo) {
    let json;
    try {
        json = await respuesta.json();
    } catch {
        throw new Error(`El servidor no devolvió JSON (${archivo}). Revisa que Apache y MySQL estén activos en XAMPP.`);
    }
    if (!respuesta.ok || !json.ok) {
        throw new Error(json.error || 'Error en el servidor.');
    }
    return json.data;
}

// Peticiones normales (JSON)
export async function api(archivo, { method = 'GET', body = null } = {}) {
    const opciones = { method };
    if (body) {
        opciones.headers = { 'Content-Type': 'application/json' };
        opciones.body = JSON.stringify(body);
    }
    return procesar(await fetch(BASE + archivo, opciones), archivo);
}

// Peticiones con archivos (FormData)
export async function apiForm(archivo, formData) {
    return procesar(await fetch(BASE + archivo, { method: 'POST', body: formData }), archivo);
}

// Dirección para descargar un documento: tipo = 'cv' | 'plantilla'
export const urlDescarga = (tipo, id) => `${BASE}descargar.php?tipo=${encodeURIComponent(tipo)}&id=${Number(id)}`;