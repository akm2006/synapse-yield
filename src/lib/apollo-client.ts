import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { ApolloLink } from '@apollo/client/core';

// Create an HTTP link to your GraphQL endpoint
const httpLink = new HttpLink({
  uri: 'http://localhost:8080/v1/graphql', // replace with your indexer URL
});

// Optional: Add middleware (if needed)
const link = ApolloLink.from([httpLink]);

const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});

export default client;
