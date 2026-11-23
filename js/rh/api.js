// Función compartida para hablar con los archivos PHP de php/rh/
const BASE = 'php/rh/';

export async function api(archivo, { method = 'GET', body = null } = {}) {
    const opciones = { method };
    if (body) {
        opciones.headers = { 'Content-Type': 'application/json' };
        opciones.body = JSON.stringify(body);
    }

    const respuesta = await fetch(BASE + archivo, opciones);

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