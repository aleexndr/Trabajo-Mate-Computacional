
// Variables globales para la red
let nodosActivos = 0;
const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);
const container = document.getElementById('mynetwork');

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
        smooth: { type: 'dynamic' }
    },
    physics: {
        enabled: true,
        barnesHut: { gravitationalConstant: -2000, centralGravity: 0.3, springLength: 150 }
    }
};
const network = new vis.Network(container, data, options);

// Función: Inicializar los nodos
function inicializarNodos() {
    const n = parseInt(document.getElementById('num-nodos').value);
    // Validación estricta del rango solicitado[cite: 1]
    if (isNaN(n) || n < 7 || n > 16) {
        alert("El número de nodos debe estar entre 7 y 16.");
        return;
    }
    
    nodosActivos = n;
    nodes.clear();
    edges.clear();
    
    const newNodes = [];
    for (let i = 1; i <= nodosActivos; i++) {
        let etiqueta = `N${i}`;
        if (i === 1) etiqueta = 'Fuente (1)';
        if (i === nodosActivos) etiqueta = `Sumidero (${nodosActivos})`;
        
        newNodes.push({ id: i, label: etiqueta });
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

    // 1. Extraemos y formateamos los datos del grafo
    const numNodos = parseInt(document.getElementById('num-nodos').value);
    const listaAristas = edges.get().map(edge => ({
        origen: edge.from,
        destino: edge.to,
        capacidad: edge.capacidad
    }));

    const payload = {
        nodos: numNodos,
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
            alert(`¡Cálculo Exitoso!\nEl Flujo Máximo de la red es: ${result.flujo_maximo}`);
            console.log("Respuesta del servidor:", result);
        } else {
            alert("Atención: " + result.mensaje);
        }

    } catch (error) {
        console.error("Error en la comunicación:", error);
        alert("Fallo al conectar con el backend. ¿Está corriendo el servidor de Django?");
    }
}