import {
  getIntrospectionQuery,
  buildClientSchema,
  type GraphQLSchema,
  type GraphQLField,
  type GraphQLArgument,
  type IntrospectionQuery,
  isObjectType,
} from 'graphql';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://gateway:4000';

let cachedSDL: string | null = null;

async function introspect(): Promise<string> {
  const res = await fetch(`${GATEWAY_URL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: getIntrospectionQuery() }),
  });
  const { data } = (await res.json()) as { data: IntrospectionQuery };
  return formatOperations(buildClientSchema(data));
}

export async function fetchSchemaSDL(): Promise<string> {
  if (cachedSDL) return cachedSDL;
  try {
    cachedSDL = await introspect();
  } catch {
    return '';
  }
  return cachedSDL;
}

export function refreshSchemaSDL(): void {
  cachedSDL = null;
}

function printArg(arg: GraphQLArgument): string {
  return `${arg.name}: ${arg.type.toString()}`;
}

function printField(name: string, field: GraphQLField<unknown, unknown>): string {
  const args = field.args.length ? `(${field.args.map(printArg).join(', ')})` : '';
  return `  ${name}${args}: ${field.type.toString()}`;
}

const FEDERATION_FIELDS = new Set(['_service', '_entities']);

function formatOperations(schema: GraphQLSchema): string {
  const lines: string[] = [];

  const queryType = schema.getQueryType();
  if (queryType && isObjectType(queryType)) {
    lines.push('Query:');
    for (const [name, field] of Object.entries(queryType.getFields())) {
      if (!FEDERATION_FIELDS.has(name)) lines.push(printField(name, field));
    }
  }

  const mutationType = schema.getMutationType();
  if (mutationType && isObjectType(mutationType)) {
    lines.push('Mutation:');
    for (const [name, field] of Object.entries(mutationType.getFields())) {
      lines.push(printField(name, field));
    }
  }

  return lines.join('\n');
}
