type Key = string | number | symbol;

interface Schema<Result> {
  v: Key;
  parse(data: unknown): Result;
}

type InferResult<T extends Schema<any>> = T extends Schema<infer R> ? R : never;

interface UpdatePath<FromSchema extends Schema<any>, ToSchema extends Schema<any>> {
  from: FromSchema;
  to: ToSchema;
  update: (fromSchema: InferResult<FromSchema>) => InferResult<ToSchema>;
}

export function createUpdatePath<From extends Schema<any>, To extends Schema<any>>(
  from: From,
  to: To,
  updateFn: UpdatePath<From, To>['update']
): UpdatePath<From, To> {
  return {
    from,
    to,
    update: updateFn,
  };
}

export function findShortestPath<
  Graph extends UpdatePath<any, any>,
  From extends Graph['from'],
  To extends Graph['to'],
  FromV extends From['v'],
  ToV extends To['v']
>(
  graph: Graph[],
  from: FromV,
  to: Exclude<ToV, FromV>
) {
  const adjacencyMap: Record<Key, Key[]> = {};

  for (const node of graph) {
    const fromVertex = node.from.v;
    const toVertex = node.to.v;

    if (!(fromVertex in adjacencyMap)) {
      adjacencyMap[fromVertex] = [];
    }

    adjacencyMap[fromVertex].push(toVertex);
  }

  const queue: [Key, Key[], Graph[]][] = [[from, [], []]];
  const visited: Record<Key, boolean> = {};

  while (queue.length > 0) {
    const [currentVertex, path, raw] = queue.shift()!;

    if (currentVertex === to) {
      return {
        path: [...path, currentVertex],
        raw: [
          ...raw,
          ...graph.filter(
            (node) => path.includes(node.from.v) && currentVertex === node.to.v
          ),
        ] as const,
      };
    }

    if (visited[currentVertex]) {
      continue;
    }

    visited[currentVertex] = true;

    const adjacentVertices = adjacencyMap[currentVertex] || [];

    for (const adjacentVertex of adjacentVertices) {
      queue.push([
        adjacentVertex,
        [...path, currentVertex],
        [
          ...raw,
          ...graph.filter(
            (node) => path.includes(node.from.v) && currentVertex === node.to.v
          ),
        ],
      ]);
    }
  }

  return null; // No path found
}

export function convert<
  Graph extends UpdatePath<Schema<any>, Schema<any>>,
  From extends Graph['from'],
  To extends Graph['to'],
  FromV extends From['v'],
  ToV extends To['v']
>(
  graph: Graph[],
  from: FromV,
  to: Exclude<ToV, FromV>,
  data: InferResult<From>
) {
  const found = findShortestPath(graph, from, to);
  if (!found) {
    throw new Error('No path found');
  }
  // console.log('Updating Schema:', found.path.map(String).join(' -> '));
  return found.raw.reduce((acc, cur) => cur.update(acc), data) as unknown as  InferResult<To>;
}
