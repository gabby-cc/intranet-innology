// Lectura del Excel que exporta el checador (hoja "Registros de asistencia").
// Funciona solo en el navegador: usa la librería SheetJS (XLSX) cargada en intranet-rh.html.

function isoLocal(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function extraerFechas(texto) {
    const res = [];
    const re = /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})|(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/g;
    let m;
    while ((m = re.exec(texto))) {
        const [y, mo, d] = m[1] ? [m[1], m[2], m[3]] : [m[6], m[5], m[4]];
        res.push(`${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return res;
}

function siguienteNoVacia(cells, i) {
    for (let j = i + 1; j < cells.length; j++) if (cells[j]) return cells[j];
    return '';
}

export function parsearChecador(rows) {
    // 1) Periodo del reporte (viene en las primeras filas)
    const cabecera = rows.slice(0, 8).map(r => r.join(' ')).join(' ');
    const fechas = extraerFechas(cabecera);
    let inicio = fechas[0] || null;
    let fin = fechas[1] || null;
    if (inicio && !fin) {
        const m = cabecera.match(/~\s*(\d{1,2})[-\/](\d{1,2})/);
        if (m) {
            let y = Number(inicio.split('-')[0]);
            const mesIni = Number(inicio.split('-')[1]);
            if (Number(m[1]) < mesIni) y++;
            fin = `${y}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
        }
    }
    if (!inicio || !fin) throw new Error('No pude detectar el periodo del reporte.');

    // Número de día -> fecha completa
    const dias = {};
    const [yi, mi, di] = inicio.split('-').map(Number);
    const [yf, mf, df] = fin.split('-').map(Number);
    const cur = new Date(yi, mi - 1, di);
    const ultimo = new Date(yf, mf - 1, df);
    for (let g = 0; cur <= ultimo && g < 400; g++) {
        dias[cur.getDate()] = isoLocal(cur);
        cur.setDate(cur.getDate() + 1);
    }

    // 2) Recorrer filas: encabezado de empleado -> fila de días -> filas con marcas
    const empleados = [];
    let emp = null;
    let dayCols = null;

    rows.forEach(row => {
        const cells = row.map(c => String(c ?? '').trim());

        // Encabezado de empleado: "ID: 7", "Nombre: Gabriela"
        let idVal = null, nomVal = null;
            cells.forEach((c, i) => {
            let m = c.match(/^ID\s*[.:]\s*(.*)$/i);
            if (m) idVal = m[1] || siguienteNoVacia(cells, i);
            else if (/^ID$/i.test(c)) idVal = siguienteNoVacia(cells, i);

            m = c.match(/^(Nombre|Name)\s*[.:]\s*(.*)$/i);
            if (m) nomVal = m[2] || siguienteNoVacia(cells, i);
            else if (/^(Nombre|Name)$/i.test(c)) nomVal = siguienteNoVacia(cells, i);
        });
        if (idVal) {
            emp = { id: String(idVal), nombre: nomVal || '', registros: [] };
            empleados.push(emp);
            return;
        }

        // Fila con los números de día (1, 2, 3 ... 31)
        const numeros = cells.map((c, i) => ({ c, i })).filter(x => /^\d{1,2}$/.test(x.c) && +x.c >= 1 && +x.c <= 31);
        const celdasConDatos = cells.filter(c => c !== '').length;
        if (numeros.length >= 1 && numeros.length === celdasConDatos) {
            dayCols = {};
            numeros.forEach(x => { dayCols[x.i] = +x.c; });
            return;
        }

        // Fila con marcas de asistencia
        if (emp && dayCols) {
            Object.entries(dayCols).forEach(([col, dia]) => {
                const marcas = (cells[col] || '').match(/\d{1,2}:\d{2}/g);
                if (marcas && dias[dia]) {
                    const lista = marcas.map(m => m.padStart(5, '0'));
                    const existente = emp.registros.find(r => r.fecha === dias[dia]);
                    if (existente) existente.marcas = [...existente.marcas, ...lista].sort();
                    else emp.registros.push({ fecha: dias[dia], marcas: lista.sort() });
                }
            });
        }
    });

    return { inicio, fin, empleados };
}

/**
 * Lee el archivo y devuelve { inicio, fin, empleados: [{ id, nombre, registros: [{ fecha, marcas }] }] }.
 * Si algo sale mal, lanza un Error con un mensaje listo para mostrar.
 */
export function leerExcelChecador(archivo) {
    return new Promise((resolve, reject) => {
        if (typeof XLSX === 'undefined') {
            return reject(new Error('No se cargó la librería para leer Excel. Revisa tu conexión a internet y la etiqueta <script> de SheetJS.'));
        }
        if (!/\.(xls|xlsx)$/i.test(archivo.name)) {
            return reject(new Error('Formato no permitido. Selecciona un archivo .xls o .xlsx.'));
        }

        const lector = new FileReader();
        lector.onerror = () => reject(new Error('No pude abrir el archivo.'));
        lector.onload = (ev) => {
            try {
                const libro = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
                const nombreHoja = libro.SheetNames.find((n) => /registro/i.test(n));
                if (!nombreHoja) {
                    console.log('Hojas encontradas:', libro.SheetNames);
                    return reject(new Error('No encontré la hoja "Registros de asistencia" en este archivo.'));
                }

                const filas = XLSX.utils.sheet_to_json(libro.Sheets[nombreHoja], { header: 1, raw: false, defval: '' });
                const resultado = parsearChecador(filas);

                if (resultado.empleados.length === 0) {
                    console.log('FILAS:\n' + filas.slice(0, 30).map((r, i) => i + ': ' + JSON.stringify(r)).join('\n'));
                    return reject(new Error('Pude abrir el archivo, pero no reconocí empleados. Abre la consola (F12) y mándame lo que aparece en "FILAS".'));
                }
                resolve(resultado);
            } catch (err) {
                console.error(err);
                reject(new Error('No pude leer el archivo: ' + err.message));
            }
        };
        lector.readAsArrayBuffer(archivo);
    });
}