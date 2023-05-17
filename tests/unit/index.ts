import {
  createUpdatePath,
  findShortestPath,
  Evolution,
  convert
} from 'src'
const schema1 = {
  v: 'base',
  parse(data: any) {
    return {
      v: 'base',
      test1: data.test1 || 'nothing',
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

export const paths = [
  createUpdatePath(schema1, schema2, (from) => ({
    ...from,
    v: schema2.v,
    test2: 'something',
  })),
  createUpdatePath(schema2, schema3, (from) => ({
    ...from,
    v: schema3.v,
    test3: 'something',
  })),
  createUpdatePath(schema3, schema4, (from) => ({
    ...from,
    v: schema4.v,
    test3: 'something',
    test4: 'updated to schema 4',
  })),
]
findShortestPath(paths, 2, 4)
console.log(convert(paths, 2, 3, { v: 'base', test1: 'whatever' }))