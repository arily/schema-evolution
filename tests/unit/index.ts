// tests/unit/MyClass.ts

const { describe, it } = intern.getPlugin('interface.bdd')
const { expect } = intern.getPlugin('chai')

import {
  createEdge,
  findShortestPath,
  migrate,
  Edge,
  compileGraph,
  hops,
} from '../../src'
const schema1 = {
  v: 'base',
  parse(data: any) {
    return {
      v: 'base',
      test1: data.test1 || 'test1',
    } as const
  },
} as const

const schema2 = {
  v: 2,
  parse(data: any) {
    return {
      v: 2,
      test1: data.test1 || 'test1',
      test2: data.test2 || 'test2',
    } as const
  },
} as const

const schema3 = {
  v: 3,
  parse(data: any) {
    return {
      v: 3,
      test1: data.test1 || 'test1',
      test2: data.test2 || 'test2',
      test3: data.test3 || 'test3',
    } as const
  },
} as const

const schema4 = {
  v: 4,
  parse(data: any) {
    return {
      v: 4,
      test1: data.test1 || 'test1',
      test2: data.test2 || 'test2',
      test3: data.test3 || 'test3',
      test4: data.test4 || 'test4',
    } as const
  },
} as const

describe('create node', () => {
  it('should create node in spec', () => {
    const transformer = (from: any) => ({
      ...from,
      v: schema3.v,
      test3: 'test3',
    })
    expect(createEdge(schema2, schema3, transformer)).deep.equal({
      from: schema2,
      to: schema3,
      update: transformer,
    })
  })
})

describe('graph compiler', () => {
  it('should compile', () => {
    expect(() => compileGraph([
      createEdge(schema1, schema2, schema2.parse),
      createEdge(schema3, schema4, schema4.parse),
      <Edge<typeof schema3, typeof schema1>>{
        from: schema3,
        to: schema1,
        update: schema1.parse
      },
    ])).to.not.throw()
  })

  it('should detect loop', () => {
    expect(() =>
      compileGraph([
        createEdge(
          schema2,
          // @ts-expect-error test purpose
          schema2,
          schema2.parse
        ),
      ])
    ).to.throw()
  })

  it('should not compile with duplicate edge', () => {
    expect(() =>
      compileGraph([
        createEdge(schema1, schema2, (v) => ({
          ...v,
          v: schema2.v,
          test2: 'test2',
        })),
        createEdge(schema1, schema2, (v) => ({
          ...v,
          v: schema2.v,
          test2: 'test2',
        })),
      ])
    ).to.throw()
  })
})

describe('path finder', () => {
  const compiled = compileGraph([
    createEdge(schema1, schema2, (from) => ({
      ...from,
      v: schema2.v,
      test2: 'test2',
    })),
    createEdge(schema2, schema3, (from) => ({
      ...from,
      v: schema3.v,
      test3: 'test3',
    })),
    createEdge(schema3, schema4, (from) => ({
      ...from,
      v: schema4.v,
      test4: 'test4',
    })),
    <Edge<typeof schema3, typeof schema2>>{
      from: schema3,
      to: schema2,
      update(from) {
        return {
          ...from,
          v: schema2.v,
        }
      },
    },
  ])
  it('should find adjacent path', () => {
    expect(findShortestPath(compiled, schema1.v, schema2.v)).to.not.equal(null)
  })
  it('should find non-adjacent path', () => {
    expect(findShortestPath(compiled, schema1.v, schema4.v)).to.not.equal(null)
  })
  it('should find path to itself with no hops', () => {
    expect(
      hops(findShortestPath(
        compiled,
        schema1.v,
        // @ts-expect-error for test
        schema1.v
      ))?.length
    ).to.equal(0)
  })

  const mixedGraph = compileGraph([
    createEdge(schema1, schema2, schema2.parse),
    createEdge(schema2, schema3, schema3.parse),
    createEdge(schema3, schema4, schema4.parse),
    createEdge(schema4, schema2, schema2.parse),
    createEdge(schema2, schema4, schema4.parse),
  ])
  it('should smart enough to find the shortest path', () => {
    expect(findShortestPath(mixedGraph, schema1.v, schema4.v)).to.deep.equal(
      findShortestPath(
        compileGraph([
          createEdge(schema1, schema2, schema2.parse),
          createEdge(schema2, schema4, schema4.parse),
        ]),
        schema1.v,
        schema4.v
      )
    )
  })

  it('should throw if found no path', () => {

    expect(findShortestPath(
      compileGraph([
        createEdge(schema1, schema2, schema2.parse),
        createEdge(schema2, schema3, schema3.parse),
      ]),
      schema1.v,
      // @ts-expect-error test purpose
      schema4.v
    )
    ).to.equal(undefined)
  })
})

describe('convert', () => {
  it('should able to migrate', () => {
    const compiled = compileGraph([
      createEdge(schema1, schema2, schema2.parse),
      createEdge(schema2, schema3, schema3.parse),
      createEdge(schema3, schema4, schema4.parse),
    ])
    expect(
      migrate(compiled, schema1.v, schema4.v, schema1.parse({}))
    ).to.deep.equal(
      schema4.parse(schema3.parse(schema2.parse(schema1.parse({}))))
    )
  })
})
