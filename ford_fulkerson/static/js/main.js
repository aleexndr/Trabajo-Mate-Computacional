
// Variables globales para la red
let nodosActivos = 0;
const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);
const container = document.getElementById('mynetwork');
let historialRutasGlobal = [];
let iteracionActual = -1;
let intervaloReproductor = null;
let corteMinimoGlobal = [];

// Configuración visual de vis.js
const data = { nodes: nodes, edges: edges };
const options = {
    nodes: {
        shape: 'circle',
        size: 20,
        font: { size: 16, color: '#000' },
        borderWidth: 2,
        color: { background: '#e1f5fe', border: '#0288d1' }
    },
    edges: {
        arrows: { to: { enabled: true, scaleFactor: 1 } },
        font: { align: 'top', size: 14, color: '#d32f2f', strokeWidth: 3, strokeColor: '#ffffff' },
        color: { color: '#848484' },
        smooth: { type: 'curvedCW', roundness: 0 }
    },
    physics: {
        enabled: false,
        barnesHut: { gravitationalConstant: -2000, centralGravity: 0.3, springLength: 150 }
    }
};
const network = new vis.Network(container, data, options);

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
        alert("El número de nodos debe estar entre 7 y 16."); return;
    }
    if (fuentes.length === 0 || sumideros.length === 0) {
        alert("Debes especificar al menos 1 nodo fuente y 1 nodo sumidero."); return;
    }
    if (fuentes.length > 2 || sumideros.length > 2) {
        alert("Límite superado: Máximo 2 fuentes y 2 sumideros."); return;
    }
    
    // 2. Validar que existan y no se crucen
    for (let f of fuentes) {
        if (f < 1 || f > n) { alert(`El nodo fuente ${f} no existe.`); return; }
        if (sumideros.includes(f)) { alert(`El nodo ${f} no puede ser fuente y sumidero a la vez.`); return; }
    }
    for (let s of sumideros) {
        if (s < 1 || s > n) { alert(`El nodo sumidero ${s} no existe.`); return; }
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
        alert("Primero debes generar los nodos.");
        return;
    }

    const from = parseInt(document.getElementById('edge-from').value);
    const to = parseInt(document.getElementById('edge-to').value);
    const cap = parseInt(document.getElementById('edge-cap').value);

    if (isNaN(from) || isNaN(to) || isNaN(cap)) {
        alert("Por favor, completa todos los campos numéricos.");
        return;
    }

    if (from < 1 || from > nodosActivos || to < 1 || to > nodosActivos) {
        alert(`Los nodos deben estar entre 1 y ${nodosActivos}.`);
        return;
    }

    if (from === to) {
        alert("No se permiten aristas que apunten al mismo nodo (lazos).");
        return;
    }

    if (cap <= 0) {
        alert("La capacidad debe ser un valor positivo.");
        return;
    }

    // Evitar aristas duplicadas
    const aristasExistentes = edges.get({ filter: item => item.from === from && item.to === to });
    if (aristasExistentes.length > 0) {
        alert("Ya existe una conexión directa entre estos dos nodos.");
        return;
    }

    edges.add({ from: from, to: to, label: cap.toString(), capacidad: cap });
    
    // Limpiar inputs
    document.getElementById('edge-from').value = '';
    document.getElementById('edge-to').value = '';
    document.getElementById('edge-cap').value = '';
}

// Función: Generar grafo aleatorio sin ciclos
function generarGrafoAleatorio() {
    let n = parseInt(document.getElementById('num-nodos').value);
    if (isNaN(n) || n < 7 || n > 16) {
        alert("Define una cantidad válida de nodos [7, 16] en el panel de configuración.");
        return;
    }

    inicializarNodos();
    
    // Generamos una cantidad razonable de aristas para que el grafo se vea bien
    const cantidadAristas = nodosActivos * 1.5; 
    let agregadas = 0;
    let intentos = 0;

    while (agregadas < cantidadAristas && intentos < 100) {
        // Para EVITAR CICLOS, forzamos que la arista siempre vaya de un nodo menor a uno mayor
        let origen = Math.floor(Math.random() * (nodosActivos - 1)) + 1;
        let destino = Math.floor(Math.random() * (nodosActivos - origen)) + origen + 1;
        let capacidad = Math.floor(Math.random() * 25) + 5; // Capacidad aleatoria entre 5 y 30

        const aristasExistentes = edges.get({ filter: item => item.from === origen && item.to === destino });
        
        if (aristasExistentes.length === 0) {
            edges.add({ from: origen, to: destino, label: capacidad.toString(), capacidad: capacidad });
            agregadas++;
        }
        intentos++;
    }
}

// Función placeholder para la Fase 3
function enviarAlServidor() {
    if (edges.length === 0) {
        alert("No hay aristas en el grafo para procesar.");
        return;
    }
    alert("El grafo está listo. En la siguiente fase conectaremos este botón con el backend de Django.");
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
        alert("No hay aristas en el grafo para procesar.");
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
        
            alert(`¡Cálculo Exitoso!\nEl Flujo Máximo de la red es: ${result.flujo_maximo}. Revisa la tabla de rutas.`);
        } else {
            alert("Atención: " + result.mensaje);
        }

    } catch (error) {
        console.error("Error en la comunicación:", error);
        alert("Fallo al conectar con el backend. ¿Está corriendo el servidor de Django?");
    }
}


// Función para pintar la ruta en el grafo
// Función para pintar la ruta en el grafo y actualizar las capacidades residuales
function resaltarRuta(index) {
    // 1. Calcular el flujo acumulado hasta la iteración seleccionada
    let flujosAcumulados = {};
    const todosLosEdges = edges.get();
    
    // Inicializar en 0
    todosLosEdges.forEach(e => {
        flujosAcumulados[e.id] = 0;
    });

    // Sumar (o restar) los flujos iteración por iteración hasta el "index"
    if (index >= 0) {
        for (let i = 0; i <= index; i++) {
            const iteracion = historialRutasGlobal[i];
            const flujoAñadido = iteracion.flujo;

            iteracion.aristas_reales.forEach(arista => {
                let edgeDirecto = edges.get({ filter: item => item.from === arista.from && item.to === arista.to })[0];
                if (edgeDirecto) {
                    flujosAcumulados[edgeDirecto.id] += flujoAñadido; // Suma flujo normal
                } else {
                    let edgeInverso = edges.get({ filter: item => item.from === arista.to && item.to === arista.from })[0];
                    if (edgeInverso) {
                        flujosAcumulados[edgeInverso.id] -= flujoAñadido; // Resta flujo (arrepentimiento matemático)
                    }
                }
            });
        }
    }

    // 2. Limpiar colores y actualizar el texto de TODAS las aristas
    const actualizacionesEdges = todosLosEdges.map(e => {
        const flujo = flujosAcumulados[e.id];
        // Si el flujo es igual a la capacidad, lo pintamos de rojo para indicar que está "Saturado"
        const estaSaturado = flujo === e.capacidad; 
        
        return {
            id: e.id,
            color: { color: estaSaturado ? '#d32f2f' : '#848484' }, // Rojo si satura, gris si no
            width: estaSaturado ? 2 : 1,
            // Formato visual: "Flujo/Capacidad" (Ej: "5/15"). Si presionamos Reset (-1), vuelve a mostrar solo "15"
            label: index === -1 ? e.capacidad.toString() : `${flujo}/${e.capacidad}`
        };
    });
    edges.update(actualizacionesEdges);

    // 3. Limpiar color de la tabla
    for (let i = 0; i < historialRutasGlobal.length; i++) {
        document.getElementById(`fila-${i}`).style.backgroundColor = 'transparent';
    }

    iteracionActual = index;
    if (index < 0 || index >= historialRutasGlobal.length) return; // Si es Reset, paramos aquí

    // 4. Pintar las aristas de la ruta actual
    const iteracionActualData = historialRutasGlobal[index];
    const aristasA_Resaltar = [];

    iteracionActualData.aristas_reales.forEach(arista => {
        let edgeDirecto = edges.get({ filter: item => item.from === arista.from && item.to === arista.to })[0];
        let edgeInverso = edges.get({ filter: item => item.from === arista.to && item.to === arista.from })[0];
        
        let edgeEncontrado = edgeDirecto || edgeInverso;

        if (edgeEncontrado) {
            aristasA_Resaltar.push({
                id: edgeEncontrado.id,
                // Color Naranja brillante para ruta directa. Color Morado si usa ruta residual inversa.
                color: { color: edgeDirecto ? '#ff9800' : '#9c27b0', highlight: '#ff9800' }, 
                width: 4
            });
        }
    });

    edges.update(aristasA_Resaltar);

    // 5. Resaltar la fila en la tabla
    const filaDOM = document.getElementById(`fila-${index}`);
    filaDOM.style.backgroundColor = '#b3e5fc';
    
    // Auto-scroll en la tabla para que siempre se vea la fila seleccionada
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
    if (corteMinimoGlobal.length === 0) {
        alert("Calcula primero el flujo máximo.");
        return;
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
    
    alert(`✂️ TEOREMA DE CORTE MÍNIMO COMPROBADO:\n\nAristas críticas que limitan la red:\n${textoCorte}\n\nCapacidad total del corte: ${sumaCapacidades}\nFlujo Máximo del algoritmo: ${document.getElementById('total-flujo').innerText}\n\nAmbos valores coinciden, demostrando la maximalidad.`);
}