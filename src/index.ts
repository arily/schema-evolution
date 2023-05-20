type Key = string | number | symbol
type Last<T extends readonly any[]> = T extends [...infer _, infer LastElement] ? LastElement : never;

export interface Schema<Result = any> {
  v: Key
  parse(data: unknown): Result
}

export type Parsed<T extends Schema> = T extends Schema<infer R> ? R : never

export interface Edge<From extends Schema, To extends Schema> {
  from: From
  to: To
  update: (fromSchema: Parsed<From>) => Parsed<To>
}

export function createEdge<From extends Schema, To extends Schema>(
  from: From,
  to: To,
  updateFn: Edge<From, To>['update']
): Edge<From, To> {
  return {
    from,
    to,
    update: updateFn,
  } as const
}

export type CompiledGraph<T extends Edge<Schema, Schema>> = {
  readonly adjacencyMap: Record<T['from']['v'], Set<T['to']['v']>>
  graph: readonly T[]
}
export function compileGraph<Graph extends Edge<Schema, Schema>>(graph: readonly Graph[]): CompiledGraph<Graph> {
  const adjacencyMap: Record<Key, Set<Key>> = {}

  for (const edge of graph) {
    const fromEdge = edge.from.v
    const toEdge = edge.to.v

    if (edge.from.v === edge.to.v) {
      throw new Error('loop detected')
    }

    if (!(fromEdge in adjacencyMap)) {
      adjacencyMap[fromEdge] = new Set()
    }

    if (adjacencyMap[fromEdge].has(toEdge)) {
      throw new Error(`found duplicate: ${String(fromEdge)} -> ${String(toEdge)}`)
    }

    adjacencyMap[fromEdge].add(toEdge)
  }

  return { adjacencyMap, graph }
}

export function findShortestPath<
  Graph extends Edge<Schema, Schema>,
  FromV extends Graph['from']['v'],
  ToV extends Graph['to']['v']
>(
  compiled: CompiledGraph<Graph>,
  from: FromV,
  to: ToV,
) {
  const { graph, adjacencyMap } = compiled

  const queue: [Graph['from']['v'], Graph['to']['v'][], Graph[]][] = [[from, [], []]]
  const visited: Record<Key, boolean> = {}

  for (const [currentEdge, path, raw] of queue) {
    if (currentEdge === to) {
      return [
        ...raw,
        ...graph.filter(
          (edge) => path.includes(edge.from.v) && currentEdge === edge.to.v
        ),
      ] as const
    }

    if (visited[currentEdge]) {
      continue
    }

    visited[currentEdge] = true

    const adjacentEdges = adjacencyMap[currentEdge]
    if (!adjacentEdges) {
      continue
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
      ])
    }
  }

  // No path found implicitly return undefined
}

export function hops(pathResult?: readonly Edge<Schema, Schema>[]) {
  return pathResult
    ? pathResult.length > 1
      ? [...pathResult.map((edge) => edge.from.v), pathResult.at(-1)?.to.v] as const
      : [] as const
    : undefined
}

function reducePath<GS extends readonly Edge<Schema, Schema>[]>(
  path: GS,
  data: Parsed<GS[0]['from']>
): Parsed<GS extends [...infer Rest, Edge<Schema, infer To>] ? To : never> {
  return path.reduce((acc, cur) => cur.update(acc), data);
}

export function migrate<
  Graph extends Edge<Schema, Schema>,
  FromV extends Graph['from']['v'],
  ToV extends Graph['to']['v']
>(
  compiled: CompiledGraph<Graph>,
  from: FromV,
  to: ToV,
  data: Parsed<Extract<Graph['from'], { v: FromV }>>
) {
  const found = findShortestPath(compiled, from, to);

  if (!found) {
    throw new Error('No path found');
  }

  return reducePath(found, data) as Parsed<Extract<Graph['to'], { v: ToV }>>;
}

export function createPipeline<
  Graph extends Edge<Schema, Schema>,
  FromV extends Graph['from']['v'],
  ToV extends Graph['to']['v']
>(
  compiled: CompiledGraph<Graph>,
  from: FromV,
  to: ToV,
) {
  const found = findShortestPath(compiled, from, to);

  if (!found) {
    throw new Error('No path found');
  }

  return {
    path: found,
    migrate(data: Parsed<Extract<Graph['from'], { v: FromV }>>): Parsed<Extract<Graph['to'], { v: ToV }>> {
      return reducePath(found, data);
    }
  }
}

// export type Destinations<Graph extends Edge<Schema, Schema>, From extends Graph['from'], ToV extends Key[] = []> =
//   Graph extends { from: From }
//     ? Graph['to']['v'] | Extract<Graph, { to: { v: Graph['from']['v'] } }>
//     : Graph extends Edge<Schema, infer To>
//       ? Destinations<Graph | Edge<From, To>, From, [...ToV, Graph['to']['v']]>
//       : never;


