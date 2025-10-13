import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { ApolloLink } from '@apollo/client/core';


const httpLink = new HttpLink({
  uri: 'https://indexer.dev.hyperindex.xyz/7d169b2/v1/graphql',
});

// Optional: Add middleware (if needed)
const link = ApolloLink.from([httpLink]);

const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});

export default client;
