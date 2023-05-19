# schema-revolution

schema-revolution is a schema migration library that focuses on facilitating the evolution of schemas over time. It provides a set of tools and utilities to manage and transition between different versions of schemas within JavaScript applications.

With schema-revolution, you can define schema objects that represent different versions or stages of your data structure. Each schema object includes a version identifier and a parse function that converts incoming data to the corresponding schema version.

The library allows you to create update paths that define the transitions between different schema versions. An update path consists of a source schema, a target schema, and an update function that transforms data from the source schema to the target schema.

Using these update paths, schema-revolution enables you to convert data from one schema version to another. It automatically determines the shortest path between two schema versions, considering the available update paths, and applies the necessary transformations to migrate the data.

schema-revolution provides flexibility and extensibility, allowing you to define and manage complex schema evolution scenarios. It helps ensure data compatibility and consistency when evolving your application's data structures over time.

By leveraging schema-revolution, you can handle schema changes, data migrations, and backward compatibility in a structured and manageable way, making it easier to adapt and evolve your application as requirements evolve.

## Installation

To install the schema-revolution library, you can use your preferred package manager:

```shell
npm install schema-revolution
```

or

```shell
yarn add schema-revolution
```

## Key Concepts

### Schema

A schema represents the structure and behavior of a node in the graph. It consists of a unique identifier (v) of type Key and a parse method that converts raw data into a parsed representation based on the schema.

### Edge

An edge represents a connection between two schemas in the graph. It defines the source (from) and target (to) schemas and provides an update method to transform data from the source schema to the target schema.

### Graph Compilation

The compileGraph function takes an array of edges and builds a compiled graph. It validates the graph for loops and duplicate edges, and creates an adjacency map representing the connections between schemas.

### Data Migration

The migrate function allows for seamless data migration between different schema versions. Given a compiled graph, a source schema, a target schema, and the data to migrate, it finds the shortest path between the source and target schemas and applies the necessary updates along the path to transform the data to the target schema.

## Usage

Here's an example of how you can use the schema-revolution library:

```typescript
import { createEdge, compileGraph, migrate, Schema } from 'schema-revolution';

// Define your schemas
interface User {
  id: number;
  name: string;
}

const schema1: Schema<User> = {
  v: 'base',
  parse(data: any) {
    return {
      v: 'base',
      id: data.id || 0,
      name: data.name || 'Unknown',
    } as const;
  },
};

interface UserV2 extends User {
  age: number;
}

const schema2: Schema<UserV2> = {
  v: 2,
  parse(data: any) {
    return {
      v: 2,
      id: data.id || 0,
      name: data.name || 'Unknown',
      age: data.age || 0,
    } as const;
  },
};

// Create edges between schemas
const edge1 = createEdge(schema1, schema2, (data) => ({
  ...data,
  v: schema2.v,
  age: 25, // Set a default age during migration
}));

// Compile the graph
const compiledGraph = compileGraph([edge1]);

// Migrate data from schema1 to schema2
const inputData = { id: 1, name: 'John' };
const migratedData = migrate(compiledGraph, schema1.v, schema2.v, schema1.parse(inputData));

console.log(migratedData);
// Output: { v: 2, id: 1, name: 'John', age: 25 }
```

In this example, we define two schemas (schema1 and schema2) representing different versions of a data structure. We create an edge between the schemas using the createEdge function. Then, we compile the graph using compileGraph, passing in an array of edges.

Finally, we can use the migrate function to migrate data from schema1 to schema2. We provide the compiled graph, the source schema identifier, the target schema identifier, and the input data to migrate. The function performs the necessary updates along the shortest path between the schemas and returns the migrated data.

## Contributing

Contributions to schema-revolution are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request on the GitHub repository.

## License

schema-revolution is released under the MIT License. See the LICENSE file for more details.
