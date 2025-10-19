import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { ApolloLink } from '@apollo/client/core';


const httpLink = new HttpLink({
  uri: 'https://indexer.dev.hyperindex.xyz/11b8c6a/v1/graphql',
});

// Optional: Add middleware (if needed)
const link = ApolloLink.from([httpLink]);

const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});

export default client;
