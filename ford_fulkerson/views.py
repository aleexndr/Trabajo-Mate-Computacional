import json
import copy
from django.shortcuts import render
from django.http import JsonResponse
from .algoritmo import Graph, detectar_ciclos

def index(request):
    return render(request, 'index.html')

def calcular_flujo(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            nodos = data.get('nodos')
            num_fuentes = data.get('fuentes', 1)
            num_sumideros = data.get('sumideros', 1)
            aristas = data.get('aristas')
            
            matriz_original = [[0] * nodos for _ in range(nodos)]
            for arista in aristas:
                origen = arista['origen'] - 1
                destino = arista['destino'] - 1
                capacidad = arista['capacidad']
                matriz_original[origen][destino] = capacidad

            if detectar_ciclos(matriz_original):
                return JsonResponse({
                    'status': 'error',
                    'mensaje': 'Se detectó un ciclo en el grafo. Corrige la estructura antes de continuar.'
                }, status=400)

            fuentes = data.get('fuentes', [1])
            sumideros = data.get('sumideros', [nodos])

            total_nodos = nodos + 2  
            matriz_extendida = [[0] * total_nodos for _ in range(total_nodos)]
            
            super_fuente = 0
            super_sumidero = total_nodos - 1
            INFINITO = 999999
            
            for i in range(nodos):
                for j in range(nodos):
                    matriz_extendida[i+1][j+1] = matriz_original[i][j]
            
            for f in fuentes:
                matriz_extendida[super_fuente][f] = INFINITO 
                
            for s in sumideros:
                matriz_extendida[s][super_sumidero] = INFINITO 

            g = Graph(copy.deepcopy(matriz_extendida))
            
            flujo_max, historial, nodos_visitados = g.FordFulkerson(super_fuente, super_sumidero)
            
            rutas_limpias = []
            for iteracion in historial:
                ruta_str = []
                enlaces_reales = [] 
                
                camino = iteracion['camino']
                for i in range(len(camino)):
                    nodo_idx = camino[i]
                    if nodo_idx == super_fuente:
                        ruta_str.append("Inicio")
                    elif nodo_idx == super_sumidero:
                        ruta_str.append("Destino")
                    else:
                        ruta_str.append(f"N{nodo_idx}")
                    
                    if i < len(camino) - 1:
                        origen = camino[i]
                        destino = camino[i+1]
                        if origen != super_fuente and destino != super_sumidero:
                            enlaces_reales.append({'from': origen, 'to': destino})
                
                rutas_limpias.append({
                    'ruta': " → ".join(ruta_str),
                    'flujo': iteracion['flujo'],
                    'aristas_reales': enlaces_reales
                })

            corte_minimo = []
            for i in range(total_nodos):
                for j in range(total_nodos):
                    if nodos_visitados[i] and not nodos_visitados[j] and matriz_extendida[i][j] > 0:
                        if i != super_fuente and j != super_sumidero:
                            corte_minimo.append({
                                'from': i,   
                                'to': j,
                                'capacidad': matriz_extendida[i][j]
                            })
                
            return JsonResponse({
                'status': 'success',
                'mensaje': 'Algoritmo ejecutado correctamente.',
                'flujo_maximo': flujo_max,
                'historial': rutas_limpias,
                'corte_minimo': corte_minimo 
            })

        except Exception as e:
            return JsonResponse({
                'status': 'error', 
                'mensaje': f'Error procesando el grafo: {str(e)}'
            }, status=500)
            
    return JsonResponse({'status': 'error', 'mensaje': 'Método no permitido.'}, status=405)