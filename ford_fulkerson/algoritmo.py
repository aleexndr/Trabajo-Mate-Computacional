from collections import defaultdict

class Graph:
    def __init__(self, graph):
        self.graph = graph
        self.ROW = len(graph)

    def BFS(self, s, t, parent): #BFS
        visited = [False]*(self.ROW)
        queue = []
        queue.append(s)
        visited[s] = True

        while queue:
            u = queue.pop(0)
            for ind, val in enumerate(self.graph[u]):
                if visited[ind] == False and val > 0:
                    queue.append(ind)
                    visited[ind] = True
                    parent[ind] = u
                    if ind == t:
                        return True
        return False

    def FordFulkerson(self, source, sink):
        parent = [-1]*(self.ROW)
        max_flow = 0
        historial_rutas = []

        while self.BFS(source, sink, parent):
            path_flow = float("Inf")
            s = sink
            camino_nodos = []
            
            while(s != source):
                camino_nodos.append(s)
                path_flow = min(path_flow, self.graph[parent[s]][s])
                s = parent[s]
                
            camino_nodos.append(source)
            camino_nodos.reverse()

            max_flow += path_flow

            v = sink
            while(v != source):
                u = parent[v]
                self.graph[u][v] -= path_flow
                self.graph[v][u] += path_flow
                v = parent[v]
                
            historial_rutas.append({
                'camino': camino_nodos,
                'flujo': path_flow
            })

        visited = [False] * self.ROW
        queue = [source]
        visited[source] = True

        while queue:
            u = queue.pop(0)
            for ind, val in enumerate(self.graph[u]):
                if not visited[ind] and val > 0:
                    queue.append(ind)
                    visited[ind] = True

        return max_flow, historial_rutas, visited


def detectar_ciclos(matriz):  #DFS
    n = len(matriz)
    visitado = [False] * n
    pila_recursividad = [False] * n

    def dfs(v):
        visitado[v] = True
        pila_recursividad[v] = True

        for ind, capacidad in enumerate(matriz[v]):
            if capacidad > 0:
                if not visitado[ind]:
                    if dfs(ind):
                        return True
                elif pila_recursividad[ind]:
                    return True
                    
        pila_recursividad[v] = False
        return False

    for nodo in range(n):
        if not visitado[nodo]:
            if dfs(nodo):
                return True
    return False