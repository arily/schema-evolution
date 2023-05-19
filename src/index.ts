/**
 * 
 * The provided code is a TypeScript implementation that defines types and functions for working with a graph structure. Here's a summary of what each part does:

 * - The Key type is defined as a union of string, number, and symbol.
 * - The Schema interface represents a schema with a v property of type Key and a parse method that takes an unknown data and returns a specified Result type.
 * - The Parsed type infers the Result type from a given Schema type.
 * - The Edge interface represents an edge in the graph, connecting two schemas (From and To). It has from and to properties representing the source and target schemas respectively, and an update method that transforms data of type InferResult<From> to InferResult<To>.
 * - The createEdge function creates an edge between two schemas and defines the update function for the edge.
 * - The compileGraph function takes an array of edges and returns the adjacency map and the original graph.
 * - The findShortestPath function finds the shortest path between two vertices in the graph using breadth-first search (BFS) algorithm. It takes the compiled graph, the starting vertex, and the target vertex as input.
 * - The hops function extracts the vertices from a path result, representing the intermediate hops between the source and target vertices.
 * - The migrate function performs a migration from a source schema (From) to a target schema (To). It takes the compiled graph, the starting vertex, the target vertex, and the data to be migrated as input. It finds the shortest path between the source and target vertices and applies the update functions along the path to transform the data.
 * 
 * Overall, this code provides functionality for working with a graph of schemas and performing migrations between schemas based on the defined edges.
 */
type Key = string | number | symbol;

export interface Schema<Result = any> {
  v: Key;
  parse(data: unknown): Result;
}

export type Parsed<T extends Schema> = ReturnType<T['parse']>

export interface Edge<From extends Schema, To extends Schema> {
  from: From;
  to: To;
  update: (fromSchema: Parsed<From>) => Parsed<To>;
}

export function createEdge<From extends Schema, To extends Schema>(
  from: From,
  to: Exclude<To, From>,
  updateFn: Edge<From, To>['update']
): Edge<From, To> {
  return {
    from,
    to,
    update: updateFn,
  };
}

export function compileGraph<Graph extends Edge<Schema, Schema>>(graph: readonly Graph[]) {
  const adjacencyMap: Record<Key, Set<Key>> = {};

  for (const edge of graph) {
    const fromEdge = edge.from.v;
    const toEdge = edge.to.v;

    if (edge.from.v === edge.to.v) {
      throw new Error('loop detected');
    }

    if (!(fromEdge in adjacencyMap)) {
      adjacencyMap[fromEdge] = new Set();
    }

    if (adjacencyMap[fromEdge].has(toEdge)) {
      throw new Error(`found duplicate: ${String(fromEdge)} -> ${String(toEdge)}`);
    }

    adjacencyMap[fromEdge].add(toEdge);
  }

  return { adjacencyMap, graph };
}

export function findShortestPath<
  Graph extends Edge<Schema, Schema>,
  FromEdge extends Graph['from']['v'],
  ToEdge extends Graph['to']['v'],
>(
  compiled: ReturnType<typeof compileGraph<Graph>>,
  from: FromEdge,
  to: Exclude<ToEdge, FromEdge>,
) {
  const { graph, adjacencyMap } = compiled;

  const queue: [Key, Key[], Graph[]][] = [[from, [], []]];
  const visited: Record<Key, boolean> = {};

  for (const [currentEdge, path, raw] of queue) {
    if (currentEdge === to) {
      return [
        ...raw,
        ...graph.filter(
          (edge) => path.includes(edge.from.v) && currentEdge === edge.to.v
        ),
      ] as const;
    }

    if (visited[currentEdge]) {
      continue;
    }

    visited[currentEdge] = true;

    const adjacentEdges = adjacencyMap[currentEdge];
    if (!adjacentEdges) {
      continue;
    }

    for (const adjacentEdge of adjacentEdges) {
      queue.push([
        adjacentEdge,
        [...path, currentEdge],
        [
          ...raw,
          ...graph.filter(
            (edge) => path.includes(edge.from.v) && currentEdge === edge.to.v
          ),
        ],
      ]);
    }
  }

  // No path found implicitly return undefined
}

export function hops(pathResult?: readonly Edge<Schema, Schema>[]) {
  return pathResult
    ? pathResult.length > 1
      ? [...pathResult.map((edge) => edge.from.v), pathResult.at(-1)?.to]
      : []
    : undefined;
}

export function migrate<
  Graph extends Edge<Schema, Schema>,
  From extends Graph['from'],
  To extends Graph['to'],
  FromEdge extends From['v'],
  ToEdge extends To['v'],
>(
  compiled: ReturnType<typeof compileGraph<Graph>>,
  from: FromEdge,
  to: Exclude<ToEdge, FromEdge>,
  data: Parsed<From>
) {
  const found = findShortestPath(compiled, from, to);

  if (!found) {
    throw new Error('No path found');
  }

  return found.reduce((acc, cur) => cur.update(acc), data as unknown) as unknown as Parsed<To>;
}