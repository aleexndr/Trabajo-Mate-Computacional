from collections import defaultdict

class Graph:
    def __init__(self, graph):
        self.graph = graph # Grafo residual
        self.ROW = len(graph)

    def BFS(self, s, t, parent):
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

        while self.BFS(source, sink, parent):
            path_flow = float("Inf")
            s = sink
            while(s != source):
                path_flow = min (path_flow, self.graph[parent[s]][s])
                s = parent[s]

            max_flow += path_flow

            v = sink
            while(v != source):
                u = parent[v]
                self.graph[u][v] -= path_flow
                self.graph[v][u] += path_flow
                v = parent[v]

        return max_flow

# Función DFS para garantizar que la red no contenga ciclos
def detectar_ciclos(matriz):
    n = len(matriz)
    visitado = [False] * n
    pila_recursividad = [False] * n

    def dfs(v):
        visitado[v] = True
        pila_recursividad[v] = True

        for ind, capacidad in enumerate(matriz[v]):
            if capacidad > 0: # Existe una arista dirigida
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