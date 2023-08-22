import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, concat } from '@apollo/client';
import { getRecoil } from 'recoil-nexus';

import { runtimeState } from '../state/runtime.state';
import { Profile } from '../types';

const httpLink = new HttpLink({
  uri: 'https://bytes-browser-server-c02da281c0f3.herokuapp.com/',
});

const authMiddleware = new ApolloLink((operation, forward) => {
  const runtime = getRecoil(runtimeState);

  runtime.profileStore
    .get<Profile[]>('profiles')
    .then((profiles) => {
      if (!profiles || profiles === null) {
        return forward(operation);
      }

      const token = profiles[runtime.currentUser].token;

      if (token !== null && token !== undefined && token.length > 0) {
        operation.setContext({
          headers: {
            Authorization: token,
          },
        });
      } else {
        operation.setContext({});
      }

      return forward(operation);
    })
    .catch((err) => {
      console.log(err);
      return forward(operation);
    });

  return forward(operation);
});

export const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  defaultOptions: {
    mutate: { errorPolicy: 'all' },
    query: { errorPolicy: 'all' },
  },
  link: concat(authMiddleware, httpLink),
});
