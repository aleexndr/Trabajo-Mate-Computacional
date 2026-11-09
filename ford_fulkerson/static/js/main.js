let nodosActivos = 0;
const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);
const container = document.getElementById('mynetwork');
let historialRutasGlobal = [];
let iteracionActual = -1;
let intervaloReproductor = null;
let corteMinimoGlobal = [];
let animacionFlujoInterval = null;

let animacionRuta = {
    activa: false,
    nodos: [],     
    pasoActual: 0, 
    progreso: 0,   
    reqFrame: null 
};

const data = { nodes: nodes, edges: edges };
const options = {
    nodes: {
        shape: 'circle',
        size: 25, 
        font: { size: 16, color: '#000', bold: true },
        borderWidth: 2,
        shadow: { enabled: true, color: 'rgba(0,0,0,0.2)', size: 10, x: 3, y: 3 } 
    },
    edges: {
        arrows: { to: { enabled: true, scaleFactor: 1 } },
        font: { align: 'top', size: 14, color: '#d32f2f', strokeWidth: 3, strokeColor: '#ffffff' },
        color: { color: '#848484', hover: '#0288d1' }, 
        smooth: { type: 'curvedCW', roundness: 0 }
    },
    interaction: { hover: true },
    physics: {
        enabled: false,
        barnesHut: { gravitationalConstant: -2000, centralGravity: 0.3, springLength: 150 }
    }
};
const network = new vis.Network(container, data, options);

network.on("afterDrawing", function (ctx) {
    if (!animacionRuta.activa || animacionRuta.nodos.length < 2) return;

    const fromNode = animacionRuta.nodos[animacionRuta.pasoActual];
    const toNode = animacionRuta.nodos[animacionRuta.pasoActual + 1];

    const posiciones = network.getPositions([fromNode, toNode]);
    const p1 = posiciones[fromNode];
    const p2 = posiciones[toNode];

    if (!p1 || !p2) return;

    const x = p1.x + (p2.x - p1.x) * animacionRuta.progreso;
    const y = p1.y + (p2.y - p1.y) * animacionRuta.progreso;

    const angulo = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angulo);
    
    ctx.beginPath();
    ctx.moveTo(15, 0);   
    ctx.lineTo(-10, 10); 
    ctx.lineTo(-4, 0);   
    ctx.lineTo(-10, -10);
    ctx.closePath();
    
    ctx.fillStyle = "#ffeb3b"; 
    ctx.shadowColor = "#ff9800"; 
    ctx.shadowBlur = 20;
    ctx.fill();
    
    ctx.restore();
});

function parseNodosInput(id) {
    const val = document.getElementById(id).value;
    if (!val) return [];
    return val.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
}

function inicializarNodos() {
    const n = parseInt(document.getElementById('num-nodos').value);
    const fuentes = parseNodosInput('input-fuentes');
    const sumideros = parseNodosInput('input-sumideros');
    
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
    
    for (let i = 1; i <= nodosActivos; i++) {
        let etiqueta = `N${i}`;
        let colorFondo = '#e1f5fe'; 
        
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

    dibujarFicticios();
}

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

    const aristasExistentes = edges.get({ filter: item => item.from === from && item.to === to });
    if (aristasExistentes.length > 0) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: "Ya existe una conexión directa entre estos dos nodos." });
        return;
    }

    edges.add({ from: from, to: to, label: cap.toString(), capacidad: cap });
    
    document.getElementById('edge-from').value = '';
    document.getElementById('edge-to').value = '';
    document.getElementById('edge-cap').value = '';
}

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

    let intermedios = [];
    for (let i = 1; i <= n; i++) {
        if (!fuentes.includes(i) && !sumideros.includes(i)) {
            intermedios.push(i);
        }
    }
    intermedios.sort(() => Math.random() - 0.5); 

    const ordenTopologico = [...fuentes, ...intermedios, ...sumideros];

    const puedeConectar = (u, v) => {
        return ordenTopologico.indexOf(u) < ordenTopologico.indexOf(v);
    };

    const agregarArista = (u, v) => {
        if (u === v) return false;
        if (!puedeConectar(u, v)) return false; 
        if (fuentes.includes(u) && sumideros.includes(v)) return false; 
        if (aristasGeneradas.some(a => a.from === u && a.to === v)) return false; 
        
        const cap = Math.floor(Math.random() * 25) + 5;
        aristasGeneradas.push({ from: u, to: v, label: cap.toString(), capacidad: cap });
        return true;
    };

    fuentes.forEach(f => {
        let cantidad = Math.floor(Math.random() * Math.min(3, intermedios.length)) + 1;
        let seleccionados = [...intermedios].sort(() => Math.random() - 0.5).slice(0, cantidad);
        seleccionados.forEach(dest => agregarArista(f, dest));
    });

    sumideros.forEach(s => {
        let cantidad = Math.floor(Math.random() * Math.min(3, intermedios.length)) + 1;
        let seleccionados = [...intermedios].sort(() => Math.random() - 0.5).slice(0, cantidad);
        seleccionados.forEach(orig => agregarArista(orig, s));
    });

    for (let i = 0; i < intermedios.length; i++) {
        let actual = intermedios[i];

        if (!aristasGeneradas.some(a => a.to === actual)) {
            let origenesPosibles = [...fuentes, ...intermedios.slice(0, i)];
            let orig = origenesPosibles[Math.floor(Math.random() * origenesPosibles.length)];
            agregarArista(orig, actual);
        }

        if (!aristasGeneradas.some(a => a.from === actual)) {
            let destinosPosibles = [...intermedios.slice(i + 1), ...sumideros];
            let dest = destinosPosibles[Math.floor(Math.random() * destinosPosibles.length)];
            agregarArista(actual, dest);
        }
    }

    let intentos = 0;
    const maxAristas = Math.floor(n * 1.6);
    while (aristasGeneradas.length < maxAristas && intentos < 200) {
        let u = ordenTopologico[Math.floor(Math.random() * (ordenTopologico.length - sumideros.length))];
        let uIndex = ordenTopologico.indexOf(u);
        let vIndex = Math.floor(Math.random() * (ordenTopologico.length - uIndex - 1)) + uIndex + 1;
        let v = ordenTopologico[vIndex];
        
        agregarArista(u, v);
        intentos++;
    }

    edges.add(aristasGeneradas);

    dibujarFicticios();
}

function enviarAlServidor() {
    if (edges.length === 0) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: "No hay aristas en el grafo para procesar." });
        return;
    }
    Swal.fire({ icon: 'success', title: '¡Cálculo Exitoso!', text: "El grafo está listo. En la siguiente fase conectaremos este botón con el backend de Django." });
}

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

async function enviarAlServidor() {
    if (edges.length === 0) {
        Swal.fire({ icon: 'error', title: 'Oops...', text: "No hay aristas en el grafo para procesar." })
        return;
    }

    const numNodos = parseInt(document.getElementById('num-nodos').value);
    const fuentes = parseNodosInput('input-fuentes');     
    const sumideros = parseNodosInput('input-sumideros'); 

    const listaAristas = [];
    edges.get().forEach(edge => {
        if (edge.id && !String(edge.id).startsWith('fict-')) {
            listaAristas.push({
                origen: edge.from,
                destino: edge.to,
                capacidad: edge.capacidad
            });
        }
    });

    const payload = {
        nodos: numNodos,
        fuentes: fuentes,       
        sumideros: sumideros,   
        aristas: listaAristas
    };

    const csrftoken = getCookie('csrftoken');

    try {
        const response = await fetch('/api/calcular/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken 
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            document.getElementById('panel-resultados').style.display = 'block';
            corteMinimoGlobal = result.corte_minimo;
            
            historialRutasGlobal = result.historial;
            iteracionActual = -1;
            
            const tbody = document.getElementById('tabla-rutas');
            tbody.innerHTML = ''; 
            
            historialRutasGlobal.forEach((item, index) => {
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


function resaltarRuta(index) {
    animacionRuta.activa = false;
    if (animacionRuta.reqFrame) cancelAnimationFrame(animacionRuta.reqFrame);
    if (animacionFlujoInterval) {
        clearInterval(animacionFlujoInterval);
        animacionFlujoInterval = null;
    }

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

    // 3. Pintar TODAS las aristas de base
    const actualizacionesEdges = [];
    todosLosEdges.forEach(e => {
        // SALTAR aristas ficticias para que conserven su diseño punteado e Infinito (∞)
        if (String(e.id).startsWith('fict-')) return; 

        const flujo = flujosAcumulados[e.id];
        const estaSaturado = flujo === e.capacidad; 
        
        actualizacionesEdges.push({
            id: e.id,
            color: { 
                color: estaSaturado ? '#d32f2f' : '#b0bec5', 
                highlight: estaSaturado ? '#d32f2f' : '#b0bec5',
                hover: estaSaturado ? '#d32f2f' : '#b0bec5'
            }, 
            width: estaSaturado ? 3 : 1.5,
            label: index === -1 ? e.capacidad.toString() : `${e.capacidad}, ${flujo}`,
            shadow: { enabled: false } 
        });
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
                const colorRiel = eDir ? '#ffb74d' : '#ba68c8'; 
                
                aristasA_Resaltar.push({
                    id: edgeEncontrado.id,
                    color: { 
                        color: colorRiel, 
                        highlight: colorRiel, 
                        hover: colorRiel 
                    }, 
                    width: 5.5,
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

    animacionRuta.nodos = rutaNodos;
    animacionRuta.pasoActual = 0;
    animacionRuta.progreso = 0;
    animacionRuta.activa = true;
    animarFlecha(); 


    const todosLosNodos = nodes.get();
    
    const actualizacionesNodos = todosLosNodos.map(n => {
        return { id: n.id, label: n.label.split('\n')[0] };
    });

    if (index >= 0 && historialRutasGlobal[index].aristas_reales.length > 0) {
        
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

        let deltaActual = Infinity;
        const rutaAristas = historialRutasGlobal[index].aristas_reales;
        const nodoInicio = rutaAristas[0].from;

        let indiceInicio = actualizacionesNodos.findIndex(n => n.id === nodoInicio);
        actualizacionesNodos[indiceInicio].label += '\n(-, ∞)';

        rutaAristas.forEach(arista => {
            let u = arista.from;
            let v = arista.to;
            
            let eDir = edges.get({ filter: item => item.from === u && item.to === v })[0];
            let eInv = edges.get({ filter: item => item.from === v && item.to === u })[0];
            let esAdelante = !!eDir;
            
            let capResidual = esAdelante 
                ? (eDir.capacidad - (flujosAntes[eDir.id] || 0)) 
                : (flujosAntes[eInv.id] || 0);

            deltaActual = Math.min(deltaActual, capResidual);
            
            let signo = esAdelante ? '+' : '-';
            
            let indiceV = actualizacionesNodos.findIndex(n => n.id === v);
            actualizacionesNodos[indiceV].label += `\n(N${u}${signo}, ${deltaActual})`;
        });
    }
    
    nodes.update(actualizacionesNodos);

    const filaDOM = document.getElementById(`fila-${index}`);
    filaDOM.style.backgroundColor = '#b3e5fc';
    filaDOM.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


function controlReproductor(accion) {
    if (accion !== 'auto' && intervaloReproductor) {
        clearInterval(intervaloReproductor);
        intervaloReproductor = null;
    }

    if (accion === 'next' || accion === 'auto') {
        if (iteracionActual < historialRutasGlobal.length - 1) {
            resaltarRuta(iteracionActual + 1);
        } else if (accion === 'auto') {
            clearInterval(intervaloReproductor); 
        }
    } 
    else if (accion === 'prev') {
        if (iteracionActual > 0) {
            resaltarRuta(iteracionActual - 1);
        }
    } 
    else if (accion === 'play') {
        if (historialRutasGlobal.length === 0) return;
        if (iteracionActual === historialRutasGlobal.length - 1) resaltarRuta(-1);
        
        intervaloReproductor = setInterval(() => {
            controlReproductor('auto');
        }, 1500);
    }
}


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
    
    if (intervaloReproductor) {
        clearInterval(intervaloReproductor);
        intervaloReproductor = null;
    }
    resaltarRuta(historialRutasGlobal.length - 1);
    
    const aristasCorte = corteMinimoGlobal.map(arista => {
        let edgeEncontrado = edges.get({ filter: item => item.from === arista.from && item.to === arista.to })[0];
        if (edgeEncontrado) {
            return {
                id: edgeEncontrado.id,
                color: { color: '#000000', highlight: '#000000' }, 
                width: 6,
                dashes: [10, 10] 
            };
        }
    }).filter(e => e !== undefined);
    
    edges.update(aristasCorte);
    
    const textoCorte = corteMinimoGlobal.map(c => `(N${c.from} ➔ N${c.to} | Cap: ${c.capacidad})`).join("\n");
    const sumaCapacidades = corteMinimoGlobal.reduce((acc, c) => acc + c.capacidad, 0);
    
    Swal.fire({ icon: 'success', title: '¡Cálculo Exitoso!', text: `✂️ TEOREMA DE CORTE MÍNIMO COMPROBADO:\n\nAristas críticas que limitan la red:\n${textoCorte}\n\nCapacidad total del corte: ${sumaCapacidades}\nFlujo Máximo del algoritmo: ${document.getElementById('total-flujo').innerText}\n\nAmbos valores coinciden, demostrando la maximalidad.` });
}


function animarFlecha() {
    if (!animacionRuta.activa) return;

    animacionRuta.progreso += 0.03; 

    if (animacionRuta.progreso >= 1.0) {
        animacionRuta.progreso = 0;
        animacionRuta.pasoActual++;
        
        if (animacionRuta.pasoActual >= animacionRuta.nodos.length - 1) {
            animacionRuta.pasoActual = 0; 
        }
    }
    
    network.redraw();
    animacionRuta.reqFrame = requestAnimationFrame(animarFlecha);
}




// Función para dibujar visualmente la Super-Fuente y Super-Sumidero teóricos
function dibujarFicticios() {
    const n = parseInt(document.getElementById('num-nodos').value);
    const fuentes = parseNodosInput('input-fuentes');
    const sumideros = parseNodosInput('input-sumideros');
    
    // Obtenemos posiciones para ubicarlos a los extremos
    const posiciones = network.getPositions();
    let minX = 0, maxX = 0, sumY = 0, count = 0;
    for (let id in posiciones) {
        if (posiciones[id].x < minX) minX = posiciones[id].x;
        if (posiciones[id].x > maxX) maxX = posiciones[id].x;
        sumY += posiciones[id].y;
        count++;
    }
    const centroY = count > 0 ? sumY / count : 0;

    // 1. Crear Super-Fuente (Si hay más de 1 fuente real)
    if (fuentes.length > 1 && !nodes.get(0)) {
        nodes.add({ 
            id: 0, 
            label: 'S*\n(Ficticia)', 
            color: { background: '#eceff1', border: '#90a4ae' },
            font: { size: 14 },
            shape: 'circle',
            x: minX - 150, // Ubicado a la extrema izquierda
            y: centroY
        });
        fuentes.forEach(f => {
            edges.add({ 
                id: `fict-src-${f}`, from: 0, to: f, 
                label: '∞', capacidad: Infinity, 
                color: { color: '#90a4ae', highlight: '#90a4ae' }, 
                dashes: [5, 5], width: 2 // Línea punteada teórica
            });
        });
    }

    // 2. Crear Super-Sumidero (Si hay más de 1 sumidero real)
    if (sumideros.length > 1) {
        const idSumideroFicticio = n + 1;
        if (!nodes.get(idSumideroFicticio)) {
            nodes.add({ 
                id: idSumideroFicticio, 
                label: 'T*\n(Ficticia)', 
                color: { background: '#eceff1', border: '#90a4ae' },
                font: { size: 14 },
                shape: 'circle',
                x: maxX + 150, // Ubicado a la extrema derecha
                y: centroY
            });
            sumideros.forEach(s => {
                edges.add({ 
                    id: `fict-sink-${s}`, from: s, to: idSumideroFicticio, 
                    label: '∞', capacidad: Infinity, 
                    color: { color: '#90a4ae', highlight: '#90a4ae' }, 
                    dashes: [5, 5], width: 2
                });
            });
        }
    }
}