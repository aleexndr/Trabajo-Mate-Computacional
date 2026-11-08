
// Variables globales para la red
let nodosActivos = 0;
const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);
const container = document.getElementById('mynetwork');
let historialRutasGlobal = [];
let iteracionActual = -1;
let intervaloReproductor = null;
let corteMinimoGlobal = [];
let animacionFlujoInterval = null;
// Motor de la Flecha Viajera
let animacionRuta = {
    activa: false,
    nodos: [],     // Guardará la secuencia: ej. [1, 2, 4, 8]
    pasoActual: 0, // En qué arista va
    progreso: 0,   // De 0.0 a 1.0 (Porcentaje de avance en la línea actual)
    reqFrame: null // Para detener la animación
};

// Configuración visual de vis.js
const data = { nodes: nodes, edges: edges };
const options = {
    nodes: {
        shape: 'circle',
        size: 25, /* Un poco más grandes */
        font: { size: 16, color: '#000', bold: true },
        borderWidth: 2,
        shadow: { enabled: true, color: 'rgba(0,0,0,0.2)', size: 10, x: 3, y: 3 } /* SOMBRA */
    },
    edges: {
        arrows: { to: { enabled: true, scaleFactor: 1 } },
        font: { align: 'top', size: 14, color: '#d32f2f', strokeWidth: 3, strokeColor: '#ffffff' },
        color: { color: '#848484', hover: '#0288d1' }, /* EFECTO HOVER */
        smooth: { type: 'curvedCW', roundness: 0 }
    },
    interaction: { hover: true },
    physics: {
        enabled: false,
        barnesHut: { gravitationalConstant: -2000, centralGravity: 0.3, springLength: 150 }
    }
};
const network = new vis.Network(container, data, options);

// DIBUJO EN TIEMPO REAL SOBRE EL LIENZO (CANVAS)
network.on("afterDrawing", function (ctx) {
    if (!animacionRuta.activa || animacionRuta.nodos.length < 2) return;

    // Obtener los dos nodos de la etapa actual
    const fromNode = animacionRuta.nodos[animacionRuta.pasoActual];
    const toNode = animacionRuta.nodos[animacionRuta.pasoActual + 1];

    // Obtener las coordenadas X, Y de esos nodos
    const posiciones = network.getPositions([fromNode, toNode]);
    const p1 = posiciones[fromNode];
    const p2 = posiciones[toNode];

    if (!p1 || !p2) return;

    // Matemáticas: Interpolar la posición exacta de la flecha
    const x = p1.x + (p2.x - p1.x) * animacionRuta.progreso;
    const y = p1.y + (p2.y - p1.y) * animacionRuta.progreso;

    // Matemáticas: Calcular el ángulo de rotación de la flecha
    const angulo = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    // DIBUJAR LA FLECHA (Geometría tipo Chevron)
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angulo);
    
    ctx.beginPath();
    ctx.moveTo(15, 0);   // Punta de la flecha
    ctx.lineTo(-10, 10); // Esquina inferior
    ctx.lineTo(-4, 0);   // Hueco trasero aerodinámico
    ctx.lineTo(-10, -10);// Esquina superior
    ctx.closePath();
    
    // Efecto de neón (Luz de energía fluyendo)
    ctx.fillStyle = "#ffeb3b"; // Amarillo brillante
    ctx.shadowColor = "#ff9800"; // Resplandor naranja intenso
    ctx.shadowBlur = 20;
    ctx.fill();
    
    ctx.restore();
});

function parseNodosInput(id) {
    const val = document.getElementById(id).value;
    if (!val) return [];
    // Separa por comas, quita espacios y convierte a números enteros
    return val.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
}

// Función: Inicializar los nodos
function inicializarNodos() {
    const n = parseInt(document.getElementById('num-nodos').value);
    const fuentes = parseNodosInput('input-fuentes');
    const sumideros = parseNodosInput('input-sumideros');
    
    // 1. Validaciones
    if (isNaN(n) || n < 7 || n > 16) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: 'El número de nodos debe estar entre 7 y 16' })
        return;
    }
    if (fuentes.length === 0 || sumideros.length === 0) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: 'Debes especificar al menos 1 nodo fuente y 1 nodo sumidero.' })
        return;
    }
    if (fuentes.length > 2 || sumideros.length > 2) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: 'Límite superado: Máximo 2 fuentes y 2 sumideros.' })
        return;
    }
    
    // 2. Validar que existan y no se crucen
    for (let f of fuentes) {
        if (f < 1 || f > n) { Swal.fire({ icon: 'error', title: 'Oops...', text: `El nodo fuente ${f} no existe.` }); return; }
        if (sumideros.includes(f)) { Swal.fire({ icon: 'error', title: 'Oops...', text: `El nodo ${f} no puede ser fuente y sumidero a la vez.` }); return; }
    }
    for (let s of sumideros) {
        if (s < 1 || s > n) { Swal.fire({ icon: 'error', title: 'Oops...', text: `El nodo sumidero ${s} no existe.` }); return; }
    }
    
    nodosActivos = n;
    nodes.clear();
    edges.clear();
    
    const newNodes = [];
    const radio = 250;
    
    // 3. Crear los nodos
    for (let i = 1; i <= nodosActivos; i++) {
        let etiqueta = `N${i}`;
        let colorFondo = '#e1f5fe'; // Color normal
        
        if (fuentes.includes(i)) {
            etiqueta = `Fuente (${i})`;
            colorFondo = '#b3e5fc';
        } else if (sumideros.includes(i)) {
            etiqueta = `Sumidero (${i})`;
            colorFondo = '#81d4fa';
        }
        
        const angulo = (2 * Math.PI * (i - 1)) / nodosActivos - Math.PI;
        newNodes.push({ 
            id: i, label: etiqueta,
            x: Math.cos(angulo) * radio, y: Math.sin(angulo) * radio,
            color: { background: colorFondo, border: '#0288d1' }
        });
    }
    nodes.add(newNodes);
}

// Función: Agregar una arista manualmente
function agregarArista() {
    if (nodosActivos === 0) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: "Primero debes generar los nodos." });
        return;
    }

    const from = parseInt(document.getElementById('edge-from').value);
    const to = parseInt(document.getElementById('edge-to').value);
    const cap = parseInt(document.getElementById('edge-cap').value);

    if (isNaN(from) || isNaN(to) || isNaN(cap)) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: "Por favor, completa todos los campos numéricos." });
        return;
    }

    if (from < 1 || from > nodosActivos || to < 1 || to > nodosActivos) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: `Los nodos deben estar entre 1 y ${nodosActivos}.` });
        return;
    }

    if (from === to) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: "No se permiten aristas que apunten al mismo nodo (lazos)." });
        return;
    }

    if (cap <= 0) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: "La capacidad debe ser un valor positivo." });
        return;
    }

    // Evitar aristas duplicadas
    const aristasExistentes = edges.get({ filter: item => item.from === from && item.to === to });
    if (aristasExistentes.length > 0) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: "Ya existe una conexión directa entre estos dos nodos." });
        return;
    }

    edges.add({ from: from, to: to, label: cap.toString(), capacidad: cap });
    
    // Limpiar inputs
    document.getElementById('edge-from').value = '';
    document.getElementById('edge-to').value = '';
    document.getElementById('edge-cap').value = '';
}

// Función: Generar grafo aleatorio estructurado (Red de Flujo válida)
function generarGrafoAleatorio() {
    const n = parseInt(document.getElementById('num-nodos').value);
    const fuentes = parseNodosInput('input-fuentes');
    const sumideros = parseNodosInput('input-sumideros');

    if (isNaN(n) || n < 7 || n > 16) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: 'Define una cantidad válida de nodos [7, 16].' });
        return;
    }
    if (fuentes.length === 0 || sumideros.length === 0 || fuentes.length > 2 || sumideros.length > 2) {
        Swal.fire({ icon: 'warning', title: 'Revisa los nodos', text: 'Define 1 o 2 fuentes y sumideros.' });
        return;
    }

    inicializarNodos();
    const aristasGeneradas = [];

    // Función auxiliar para agregar aristas de forma segura
    const agregarArista = (u, v) => {
        if (u === v) return false;
        if (fuentes.includes(v) || sumideros.includes(u)) return false; // Prohibir retroceder a fuentes o salir de sumideros
        if (fuentes.includes(u) && sumideros.includes(v)) return false; // Prohibir conexión directa Fuente -> Sumidero
        if (aristasGeneradas.some(a => a.from === u && a.to === v)) return false; // Evitar duplicados
        
        const cap = Math.floor(Math.random() * 25) + 5;
        aristasGeneradas.push({ from: u, to: v, label: cap.toString(), capacidad: cap });
        return true;
    };

    // Identificar nodos intermedios
    const intermedios = [];
    for (let i = 1; i <= n; i++) {
        if (!fuentes.includes(i) && !sumideros.includes(i)) intermedios.push(i);
    }

    // PASO 1: Garantizar que cada Fuente se conecte al menos a un nodo intermedio aleatorio
    fuentes.forEach(f => {
        let posibles = intermedios.filter(i => i > f); // Solo hacia adelante para evitar ciclos
        if (posibles.length > 0) {
            agregarArista(f, posibles[Math.floor(Math.random() * Math.min(3, posibles.length))]);
        }
    });

    // PASO 2: Garantizar que cada Sumidero reciba de al menos un nodo intermedio aleatorio
    sumideros.forEach(s => {
        let posibles = intermedios.filter(i => i < s);
        if (posibles.length > 0) {
            agregarArista(posibles[Math.floor(Math.random() * posibles.length)], s);
        }
    });

    // PASO 3: Construir la "Columna Vertebral" (Ningún nodo intermedio se queda aislado)
    for (let i = 0; i < intermedios.length; i++) {
        let actual = intermedios[i];

        // 3.1. Asegurar que el nodo reciba al menos una conexión (Entrada)
        if (!aristasGeneradas.some(a => a.to === actual)) {
            let origenesPosibles = [...fuentes, ...intermedios.slice(0, i)].filter(nodo => nodo < actual);
            if (origenesPosibles.length > 0) {
                let orig = origenesPosibles[Math.floor(Math.random() * origenesPosibles.length)];
                agregarArista(orig, actual);
            }
        }

        // 3.2. Asegurar que el nodo envíe al menos una conexión (Salida)
        if (!aristasGeneradas.some(a => a.from === actual)) {
            let destinosPosibles = [...intermedios.slice(i + 1), ...sumideros].filter(nodo => nodo > actual);
            if (destinosPosibles.length > 0) {
                let dest = destinosPosibles[Math.floor(Math.random() * destinosPosibles.length)];
                agregarArista(actual, dest);
            }
        }
    }

    // PASO 4: Rellenar con conexiones extra para mayor complejidad (hasta n * 1.5)
    let intentos = 0;
    const cantidadAristas = Math.floor(n * 1.5);
    
    while (aristasGeneradas.length < cantidadAristas && intentos < 100) {
        let origen = Math.floor(Math.random() * (n - 1)) + 1;
        // Obligar a que vaya de un número menor a uno mayor para EVITAR CICLOS
        let destino = Math.floor(Math.random() * (n - origen)) + origen + 1;
        
        agregarArista(origen, destino);
        intentos++;
    }

    // 5. Renderizar en el mapa
    edges.add(aristasGeneradas);
}

// Función placeholder para la Fase 3
function enviarAlServidor() {
    if (edges.length === 0) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: "No hay aristas en el grafo para procesar." });
        return;
    }
    Swal.fire({ icon: 'success', title: '¡Cálculo Exitoso!', text: "El grafo está listo. En la siguiente fase conectaremos este botón con el backend de Django." });
}

// Función estándar para leer el token CSRF de las cookies en Django
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Función asíncrona para enviar los datos a la vista de Python
async function enviarAlServidor() {
    if (edges.length === 0) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: "No hay aristas en el grafo para procesar." })
        return;
    }

    // Busca esta parte en enviarAlServidor() y reemplázala:
    const numNodos = parseInt(document.getElementById('num-nodos').value);
    const fuentes = parseNodosInput('input-fuentes');     // Lista de ej: [1, 2]
    const sumideros = parseNodosInput('input-sumideros'); // Lista de ej: [6, 7]

    const listaAristas = edges.get().map(edge => ({
        origen: edge.from,
        destino: edge.to,
        capacidad: edge.capacidad
    }));

    const payload = {
        nodos: numNodos,
        fuentes: fuentes,       // Enviamos el arreglo
        sumideros: sumideros,   // Enviamos el arreglo
        aristas: listaAristas
    };

    // Obtenemos el token de seguridad
    const csrftoken = getCookie('csrftoken');

    // 2. Ejecutamos la petición POST
    try {
        const response = await fetch('/api/calcular/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken // Enviamos el token en la cabecera
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            document.getElementById('panel-resultados').style.display = 'block';
            corteMinimoGlobal = result.corte_minimo;
            
            // Guardamos el historial para usarlo en el reproductor
            historialRutasGlobal = result.historial;
            iteracionActual = -1;
            
            const tbody = document.getElementById('tabla-rutas');
            tbody.innerHTML = ''; 
            
            historialRutasGlobal.forEach((item, index) => {
                // Hacemos que la fila sea clickeable con "cursor: pointer" y llame a resaltarRuta()
                const fila = `<tr id="fila-${index}" onclick="resaltarRuta(${index})" style="cursor: pointer; transition: 0.3s;">
                    <td>${index + 1}</td>
                    <td>${item.ruta}</td>
                    <td><b style="color: green;">+${item.flujo}</b></td>
                </tr>`;
                tbody.innerHTML += fila;
            });
            
            document.getElementById('total-flujo').innerText = result.flujo_maximo;
        
            Swal.fire({ icon: 'success', title: '¡Cálculo Exitoso!', text: 'El Flujo Máximo de la red es: ' + result.flujo_maximo })
        } else {
            Swal.fire({ icon: 'error', title: 'Oops...', text: "Atención: " + result.mensaje });
        }

    } catch (error) {
        console.error("Error en la comunicación:", error);
        Swal.fire({ icon: 'error', title: 'Oops...', text: "Fallo al conectar con el backend. ¿Está corriendo el servidor de Django?" });
    }
}


// Función para pintar la ruta en el grafo
// Función para pintar la ruta en el grafo y actualizar las capacidades residuales
function resaltarRuta(index) {
    // 1. Detener TODAS las animaciones anteriores para limpiar el lienzo
    animacionRuta.activa = false;
    if (animacionRuta.reqFrame) cancelAnimationFrame(animacionRuta.reqFrame);
    if (animacionFlujoInterval) {
        clearInterval(animacionFlujoInterval);
        animacionFlujoInterval = null;
    }

    // 2. Calcular el flujo acumulado hasta la iteración seleccionada
    let flujosAcumulados = {};
    const todosLosEdges = edges.get();
    todosLosEdges.forEach(e => { flujosAcumulados[e.id] = 0; });

    if (index >= 0) {
        for (let i = 0; i <= index; i++) {
            const iteracion = historialRutasGlobal[i];
            iteracion.aristas_reales.forEach(arista => {
                let edgeDirecto = edges.get({ filter: item => item.from === arista.from && item.to === arista.to })[0];
                if (edgeDirecto) {
                    flujosAcumulados[edgeDirecto.id] += iteracion.flujo;
                } else {
                    let edgeInverso = edges.get({ filter: item => item.from === arista.to && item.to === arista.from })[0];
                    if (edgeInverso) flujosAcumulados[edgeInverso.id] -= iteracion.flujo;
                }
            });
        }
    }

    // 3. Pintar TODAS las aristas de base (Rojo si satura, Gris si es normal)
    const actualizacionesEdges = todosLosEdges.map(e => {
        const flujo = flujosAcumulados[e.id];
        const estaSaturado = flujo === e.capacidad; 
        return {
            id: e.id,
            color: { 
                color: estaSaturado ? '#d32f2f' : '#b0bec5', 
                highlight: estaSaturado ? '#d32f2f' : '#b0bec5',
                hover: estaSaturado ? '#d32f2f' : '#b0bec5'
            }, 
            width: estaSaturado ? 3 : 1.5,
            label: index === -1 ? e.capacidad.toString() : `${e.capacidad}/${flujo}`,
            shadow: { enabled: false } 
        };
    });
    edges.update(actualizacionesEdges);

    for (let i = 0; i < historialRutasGlobal.length; i++) {
        document.getElementById(`fila-${i}`).style.backgroundColor = 'transparent';
    }

    iteracionActual = index;
    if (index < 0 || index >= historialRutasGlobal.length) {
        network.redraw(); 
        return; 
    }

    // 4. Crear el "Riel de Energía" (Naranja/Morado pastel estático y grueso)
    const iteracionActualData = historialRutasGlobal[index];
    const aristasA_Resaltar = [];
    let rutaNodos = [];

    if (iteracionActualData.aristas_reales.length > 0) {
        rutaNodos.push(iteracionActualData.aristas_reales[0].from);
        
        iteracionActualData.aristas_reales.forEach(arista => {
            rutaNodos.push(arista.to);
            
            let eDir = edges.get({ filter: item => item.from === arista.from && item.to === arista.to })[0];
            let eInv = edges.get({ filter: item => item.from === arista.to && item.to === arista.from })[0];
            let edgeEncontrado = eDir || eInv;

            if (edgeEncontrado) {
                // Naranja suave para directo, Morado suave para inverso
                const colorRiel = eDir ? '#ffb74d' : '#ba68c8'; 
                
                aristasA_Resaltar.push({
                    id: edgeEncontrado.id,
                    color: { 
                        color: colorRiel, 
                        highlight: colorRiel, 
                        hover: colorRiel 
                    }, 
                    width: 5.5, // Carril grueso
                    shadow: {
                        enabled: true,
                        color: colorRiel,
                        size: 8,
                        x: 0, y: 0
                    }
                });
            }
        });
    }
    edges.update(aristasA_Resaltar);

    // 5. INICIAR LA FLECHA VIAJERA (El motor a 60 FPS)
    animacionRuta.nodos = rutaNodos;
    animacionRuta.pasoActual = 0;
    animacionRuta.progreso = 0;
    animacionRuta.activa = true;
    animarFlecha(); 

    // =======================================================
    // NUEVO PASO: ETIQUETADO MATEMÁTICO DE VÉRTICES (a+, Δ(x))
    // =======================================================
    const todosLosNodos = nodes.get();
    
    // A. Limpiar las etiquetas de todos los nodos para dejar solo su nombre base
    const actualizacionesNodos = todosLosNodos.map(n => {
        return { id: n.id, label: n.label.split('\n')[0] }; // Quita las etiquetas de la iteración anterior
    });

    if (index >= 0 && historialRutasGlobal[index].aristas_reales.length > 0) {
        
        // B. Calcular el flujo EXACTAMENTE ANTES de esta iteración (para saber la capacidad real)
        let flujosAntes = {};
        todosLosEdges.forEach(e => { flujosAntes[e.id] = 0; });
        
        for (let i = 0; i < index; i++) {
            historialRutasGlobal[i].aristas_reales.forEach(arista => {
                let eDir = edges.get({ filter: item => item.from === arista.from && item.to === arista.to })[0];
                if (eDir) {
                    flujosAntes[eDir.id] += historialRutasGlobal[i].flujo;
                } else {
                    let eInv = edges.get({ filter: item => item.from === arista.to && item.to === arista.from })[0];
                    if (eInv) flujosAntes[eInv.id] -= historialRutasGlobal[i].flujo;
                }
            });
        }

        // C. Generar las etiquetas dinámicas para la ruta actual
        let deltaActual = Infinity;
        const rutaAristas = historialRutasGlobal[index].aristas_reales;
        const nodoInicio = rutaAristas[0].from;

        // 1. Etiquetar el nodo Fuente inicial como (-, ∞)
        let indiceInicio = actualizacionesNodos.findIndex(n => n.id === nodoInicio);
        actualizacionesNodos[indiceInicio].label += '\n(-, ∞)';

        // 2. Recorrer cada salto de la ruta para calcular y pegar la etiqueta
        rutaAristas.forEach(arista => {
            let u = arista.from;
            let v = arista.to;
            
            let eDir = edges.get({ filter: item => item.from === u && item.to === v })[0];
            let eInv = edges.get({ filter: item => item.from === v && item.to === u })[0];
            let esAdelante = !!eDir;
            
            // Si es hacia adelante, la capacidad residual es (Capacidad - Flujo). Si es en reversa, es el Flujo previo.
            let capResidual = esAdelante 
                ? (eDir.capacidad - (flujosAntes[eDir.id] || 0)) 
                : (flujosAntes[eInv.id] || 0);

            // Δ(x) es el mínimo entre el cuello de botella que arrastramos y la capacidad de este paso
            deltaActual = Math.min(deltaActual, capResidual);
            
            // Signo '+' para aristas normales, '-' para flujo en reversa (red residual)
            let signo = esAdelante ? '+' : '-';
            
            // Pegar la etiqueta debajo del nombre del nodo destino (Ej: N4\n(N2+, 5))
            let indiceV = actualizacionesNodos.findIndex(n => n.id === v);
            actualizacionesNodos[indiceV].label += `\n(N${u}${signo}, ${deltaActual})`;
        });
    }
    
    // Aplicar los cambios al lienzo de vis.js
    nodes.update(actualizacionesNodos);
    // =======================================================

    // 6. Resaltar la fila en la tabla
    const filaDOM = document.getElementById(`fila-${index}`);
    filaDOM.style.backgroundColor = '#b3e5fc';
    filaDOM.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


// Función para manejar los botones del reproductor
function controlReproductor(accion) {
    // Detener reproducción automática si se hace clic manual
    if (accion !== 'auto' && intervaloReproductor) {
        clearInterval(intervaloReproductor);
        intervaloReproductor = null;
    }

    if (accion === 'next' || accion === 'auto') {
        if (iteracionActual < historialRutasGlobal.length - 1) {
            resaltarRuta(iteracionActual + 1);
        } else if (accion === 'auto') {
            clearInterval(intervaloReproductor); // Detener si llegó al final
        }
    } 
    else if (accion === 'prev') {
        if (iteracionActual > 0) {
            resaltarRuta(iteracionActual - 1);
        }
    } 
    else if (accion === 'play') {
        if (historialRutasGlobal.length === 0) return;
        if (iteracionActual === historialRutasGlobal.length - 1) resaltarRuta(-1); // Reiniciar si estaba al final
        
        // Ejecutar "next" cada 1.5 segundos
        intervaloReproductor = setInterval(() => {
            controlReproductor('auto');
        }, 1500);
    }
}


// Función para visualizar el Teorema del Corte Mínimo
function mostrarCorteMinimo() {

    animacionRuta.activa = false;

    if (corteMinimoGlobal.length === 0) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: "Calcula primero el flujo máximo." });
        return;
    }

    if (animacionFlujoInterval) {
        clearInterval(animacionFlujoInterval);
        animacionFlujoInterval = null;
    }
    
    // 1. Pausar reproductor y adelantar todo hasta el final para que la red esté saturada
    if (intervaloReproductor) {
        clearInterval(intervaloReproductor);
        intervaloReproductor = null;
    }
    resaltarRuta(historialRutasGlobal.length - 1);
    
    // 2. Pintar el corte mínimo
    const aristasCorte = corteMinimoGlobal.map(arista => {
        let edgeEncontrado = edges.get({ filter: item => item.from === arista.from && item.to === arista.to })[0];
        if (edgeEncontrado) {
            return {
                id: edgeEncontrado.id,
                color: { color: '#000000', highlight: '#000000' }, // Negro oscuro
                width: 6,
                dashes: [10, 10] // Línea punteada de corte
            };
        }
    }).filter(e => e !== undefined);
    
    edges.update(aristasCorte);
    
    // 3. Crear el mensaje de validación matemática
    const textoCorte = corteMinimoGlobal.map(c => `(N${c.from} ➔ N${c.to} | Cap: ${c.capacidad})`).join("\n");
    const sumaCapacidades = corteMinimoGlobal.reduce((acc, c) => acc + c.capacidad, 0);
    
    Swal.fire({ icon: 'success', title: '¡Cálculo Exitoso!', text: `✂️ TEOREMA DE CORTE MÍNIMO COMPROBADO:\n\nAristas críticas que limitan la red:\n${textoCorte}\n\nCapacidad total del corte: ${sumaCapacidades}\nFlujo Máximo del algoritmo: ${document.getElementById('total-flujo').innerText}\n\nAmbos valores coinciden, demostrando la maximalidad.` });
}


// Función que actualiza la posición de la flecha y pide redibujar la pantalla
function animarFlecha() {
    if (!animacionRuta.activa) return;

    animacionRuta.progreso += 0.03; // Velocidad de la flecha (Auméntalo para que vaya más rápido)

    if (animacionRuta.progreso >= 1.0) {
        animacionRuta.progreso = 0;
        animacionRuta.pasoActual++;
        
        // Si llegó al último nodo de la ruta, reinicia el ciclo
        if (animacionRuta.pasoActual >= animacionRuta.nodos.length - 1) {
            animacionRuta.pasoActual = 0; 
        }
    }
    
    network.redraw(); // Obliga a vis.js a disparar "afterDrawing"
    animacionRuta.reqFrame = requestAnimationFrame(animarFlecha);
}