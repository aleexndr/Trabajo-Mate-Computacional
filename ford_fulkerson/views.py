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
            aristas = data.get('aristas')
            
            matriz = [[0] * nodos for _ in range(nodos)]
            
            for arista in aristas:
                origen = arista['origen'] - 1
                destino = arista['destino'] - 1
                capacidad = arista['capacidad']
                matriz[origen][destino] = capacidad

            if detectar_ciclos(matriz):
                return JsonResponse({
                    'status': 'error',
                    'mensaje': 'Se detectó un ciclo en el grafo. Corrige la estructura antes de continuar.'
                }, status=400)

            g = Graph(copy.deepcopy(matriz))
            
            nodo_fuente = 0              # Índice 0 (nodo 1 en la interfaz)
            nodo_sumidero = nodos - 1    # Índice N-1 (último nodo en la interfaz)

            flujo_max = g.FordFulkerson(nodo_fuente, nodo_sumidero)
            
            return JsonResponse({
                'status': 'success',
                'mensaje': 'Algoritmo ejecutado correctamente.',
                'flujo_maximo': flujo_max
            })

        except Exception as e:
            return JsonResponse({
                'status': 'error', 
                'mensaje': f'Error procesando el grafo: {str(e)}'
            }, status=500)
            
    return JsonResponse({'status': 'error', 'mensaje': 'Método no permitido.'}, status=405)