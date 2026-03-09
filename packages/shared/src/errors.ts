import { GraphQLError } from 'graphql';

export function unauthenticatedError(): GraphQLError {
  return new GraphQLError('Authentication required', {
    extensions: { code: 'UNAUTHENTICATED' },
  });
}

export function forbiddenError(): GraphQLError {
  return new GraphQLError('You do not have permission to perform this action', {
    extensions: { code: 'FORBIDDEN' },
  });
}

export function validationError(message: string): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT' },
  });
}

export function notFoundError(resource: string): GraphQLError {
  return new GraphQLError(`${resource} not found`, {
    extensions: { code: 'NOT_FOUND' },
  });
}
