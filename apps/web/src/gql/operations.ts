import { gql } from '@apollo/client';

export const REGISTER_MUTATION = gql`
  mutation Register($username: String!, $email: String!, $password: String!) {
    register(username: $username, email: $email, password: $password) {
      token
      refreshToken
      user {
        id
        username
        email
        role
      }
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      refreshToken
      user {
        id
        username
        email
        role
      }
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($token: String!) {
    refreshToken(token: $token) {
      token
      refreshToken
      user {
        id
        username
        email
        role
      }
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout($refreshToken: String!) {
    logout(refreshToken: $refreshToken)
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      email
      role
    }
  }
`;

export const LIST_MOVIES_QUERY = gql`
  query ListMovies($page: Int, $pageSize: Int) {
    listMovies(page: $page, pageSize: $pageSize) {
      movies {
        id
        title
        description
        releaseYear
        genres
        createdBy {
          id
          username
        }
        createdAt
      }
      total
      page
      pageSize
    }
  }
`;

export const MOVIE_DETAIL_QUERY = gql`
  query MovieDetail($id: ID!) {
    movieById(id: $id) {
      id
      title
      description
      releaseYear
      genres
      createdBy {
        id
        username
      }
      createdAt
      updatedAt
    }
    reviewsByMovie(movieId: $id) {
      id
      user {
        id
        username
      }
      comment
      rating
      createdAt
    }
  }
`;

export const ADD_MOVIE_MUTATION = gql`
  mutation AddMovie($input: AddMovieInput!) {
    addMovie(input: $input) {
      id
      title
      releaseYear
      genres
    }
  }
`;

export const ADD_REVIEW_MUTATION = gql`
  mutation AddReview($input: AddReviewInput!) {
    addReview(input: $input) {
      id
      comment
      rating
      createdAt
      user {
        id
        username
      }
    }
  }
`;

export const DELETE_REVIEW_MUTATION = gql`
  mutation DeleteReview($id: ID!) {
    deleteReview(id: $id)
  }
`;

export const SEARCH_MOVIES_QUERY = gql`
  query SearchMovies($query: String, $filters: SearchFilters, $sort: SearchSort, $page: Int, $pageSize: Int) {
    searchMovies(query: $query, filters: $filters, sort: $sort, page: $page, pageSize: $pageSize) {
      results {
        movieId
        title
        description
        genres
        releaseYear
        avgRating
        reviewCount
      }
      total
      page
      pageSize
    }
  }
`;

export const TRENDING_MOVIES_QUERY = gql`
  query TrendingMovies($limit: Int) {
    trendingMovies(limit: $limit) {
      movieId
      title
      description
      genres
      releaseYear
      avgRating
      reviewCount
    }
  }
`;

export const USER_PROFILE_QUERY = gql`
  query UserProfile($userId: ID!, $page: Int, $pageSize: Int) {
    userById(id: $userId) {
      id
      username
      email
      role
      createdAt
    }
    moviesByUser(userId: $userId, page: $page, pageSize: $pageSize) {
      movies {
        id
        title
        description
        releaseYear
        genres
        createdAt
      }
      total
      page
      pageSize
    }
    reviewsByUser(userId: $userId) {
      id
      movie {
        id
      }
      comment
      rating
      createdAt
    }
  }
`;

export const UPDATE_MOVIE_MUTATION = gql`
  mutation UpdateMovie($id: ID!, $input: UpdateMovieInput!) {
    updateMovie(id: $id, input: $input) {
      id
      title
      description
      releaseYear
      genres
      updatedAt
    }
  }
`;

export const DELETE_MOVIE_MUTATION = gql`
  mutation DeleteMovie($id: ID!) {
    deleteMovie(id: $id)
  }
`;

export const UPDATE_REVIEW_MUTATION = gql`
  mutation UpdateReview($id: ID!, $input: UpdateReviewInput!) {
    updateReview(id: $id, input: $input) {
      id
      comment
      rating
      updatedAt
    }
  }
`;
