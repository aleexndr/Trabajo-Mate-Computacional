# Trabajo-Mate-Computacional
Problema del flujo máximo - Ford-Fulkerson

Se deberá desarrollar una aplicación con una interfaz amigable e interactiva
que permita al usuario participar activamente en cada etapa de la ejecución
del algoritmo de Ford-Fulkerson. Inicialmente, el programa solicitará un
número entero n con n ∈ [7, 16]. , correspondiente a la cantidad de nodos
del grafo dirigido, y permitirá elegir entre generar el grafo de forma manual
o aleatoria. En el caso de la creación manual, el usuario podrá definir las
aristas e ingresar la capacidad asociada a cada una de ellas. El sistema deberá
verificar que el grafo no contenga ciclos; en caso de detectarse alguno,
deberá informar al usuario y solicitar la corrección de la estructura antes de
continuar con la ejecución del algoritmo. Una vez construido el grafo, este se
mostrará de manera gráfica y etiquetada, permitiendo al usuario seleccionar
un vértice fuente y un vértice sumidero. Adicionalmente, el programa deberá
contemplar escenarios en los que sea necesario incorporar un origen ficticio
y/o un destino ficticio para modelar problemas con múltiples fuentes o
múltiples sumideros.
A continuación, el sistema ejecutará el algoritmo de Ford-Fulkerson
mostrando detalladamente cada etapa del proceso. El usuario podrá avanzar
de manera interactiva paso a paso para observar la identificación de caminos
aumentantes, la determinación de capacidades residuales, la actualización
de los flujos en las aristas y la construcción de la red residual en cada
iteración. Durante el desarrollo del algoritmo se deberá visualizar
claramente cómo evoluciona el flujo total de la red y cómo se modifican las
capacidades disponibles. Finalmente, el programa presentará la solución
completa indicando el valor del flujo máximo obtenido entre la fuente y el
sumidero, la asignación de flujo en cada arista y el detalle de los caminos
aumentantes utilizados durante el procedimiento. Asimismo, deberá
identificar y resaltar sobre el grafo un corte mínimo que certifique la
maximalidad del flujo encontrado, permitiendo al usuario comprender la
relación entre el flujo máximo y el corte mínimo mediante una
representación visual clara y de fácil interpretación.
