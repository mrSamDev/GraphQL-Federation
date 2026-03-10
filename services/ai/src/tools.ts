import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const MOVIES_URL = process.env.MOVIES_SERVICE_URL ?? 'http://movies:4002';
const REVIEWS_URL = process.env.REVIEWS_SERVICE_URL ?? 'http://reviews:4003';
const SEARCH_URL = process.env.SEARCH_SERVICE_URL ?? 'http://search:4004';
const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://gateway:4000';

async function gqlFetch(
  url: string,
  query: string,
  variables: Record<string, unknown>,
  token?: string
): Promise<unknown> {
  const res = await fetch(`${url}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: unknown; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

export function buildTools(token?: string): DynamicStructuredTool[] {
  const listMovies = new DynamicStructuredTool({
    name: 'list_movies',
    description: 'List movies from the catalog. Use this to browse available movies or find titles to recommend.',
    schema: z.object({
      page: z.number().int().min(1).optional().describe('Page number, defaults to 1'),
      pageSize: z.number().int().min(1).max(20).optional().describe('Results per page, max 20'),
    }),
    func: async ({ page, pageSize }) => {
      const data = await gqlFetch(
        MOVIES_URL,
        `query($page: Int, $pageSize: Int) {
          listMovies(page: $page, pageSize: $pageSize) {
            movies { id title description releaseYear genres }
            total page pageSize
          }
        }`,
        { page, pageSize }
      );
      return JSON.stringify((data as { listMovies: unknown }).listMovies);
    },
  });

  const searchMovies = new DynamicStructuredTool({
    name: 'search_movies',
    description: 'Search movies by title or keyword. Returns movieId which can be passed to get_movie_details. Use this when you only have a title, not an ID.',
    schema: z.object({
      query: z.string().describe('Title or keyword to search for'),
      limit: z.number().int().min(1).max(10).optional().describe('Max results, defaults to 5'),
    }),
    func: async ({ query, limit }) => {
      const data = await gqlFetch(
        SEARCH_URL,
        `query($query: String, $pageSize: Int) {
          searchMovies(query: $query, pageSize: $pageSize) {
            results { movieId title genres releaseYear avgRating reviewCount }
          }
        }`,
        { query, pageSize: limit ?? 5 }
      );
      return JSON.stringify((data as { searchMovies: unknown }).searchMovies);
    },
  });

  const getMovieDetails = new DynamicStructuredTool({
    name: 'get_movie_details',
    description: 'Get full details and reviews for a specific movie by ID. Use search_movies first if you only have a title.',
    schema: z.object({
      movieId: z.string().describe('The movie ID'),
    }),
    func: async ({ movieId }) => {
      const [movieData, reviewData] = await Promise.all([
        gqlFetch(
          MOVIES_URL,
          `query($id: ID!) { movieById(id: $id) { id title description releaseYear genres } }`,
          { id: movieId }
        ),
        gqlFetch(
          REVIEWS_URL,
          `query($movieId: ID!) { reviewsByMovie(movieId: $movieId) { id comment rating createdAt } }`,
          { movieId }
        ),
      ]);
      return JSON.stringify({
        movie: (movieData as { movieById: unknown }).movieById,
        reviews: (reviewData as { reviewsByMovie: unknown }).reviewsByMovie,
      });
    },
  });

  const addMovie = new DynamicStructuredTool({
    name: 'add_movie',
    description: 'Add a new movie to the catalog. Only call when the user explicitly asks to add a movie. Requires authentication.',
    schema: z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      releaseYear: z.number().int().min(1888).max(2100).optional(),
      genres: z.array(z.string()).min(1),
    }),
    func: async (input) => {
      if (!token) return 'Error: you must be logged in to add a movie.';
      const data = await gqlFetch(
        MOVIES_URL,
        `mutation($input: AddMovieInput!) {
          addMovie(input: $input) { id title releaseYear genres }
        }`,
        { input },
        token
      );
      return JSON.stringify((data as { addMovie: unknown }).addMovie);
    },
  });

  const addReview = new DynamicStructuredTool({
    name: 'add_review',
    description: 'Submit a review for a movie. Only call when the user explicitly asks to add a review. Requires authentication.',
    schema: z.object({
      movieId: z.string().describe('The movie ID to review'),
      comment: z.string().min(1).max(2000),
      rating: z.number().int().min(1).max(5),
    }),
    func: async (input) => {
      if (!token) return 'Error: you must be logged in to add a review.';
      const data = await gqlFetch(
        REVIEWS_URL,
        `mutation($input: AddReviewInput!) {
          addReview(input: $input) { id comment rating }
        }`,
        { input },
        token
      );
      return JSON.stringify((data as { addReview: unknown }).addReview);
    },
  });

  const executeGraphQL = new DynamicStructuredTool({
    name: 'execute_graphql',
    description:
      'Execute any GraphQL query against the API. Use this for operations not covered by the specialized tools above.',
    schema: z.object({
      query: z.string().describe('Valid GraphQL query or mutation string'),
      variables: z.record(z.unknown()).optional().describe('Variables for the query'),
    }),
    func: async ({ query, variables }) => {
      const data = await gqlFetch(GATEWAY_URL, query, variables ?? {}, token);
      return JSON.stringify(data, null, 2);
    },
  });

  return [listMovies, searchMovies, getMovieDetails, addMovie, addReview, executeGraphQL];
}
