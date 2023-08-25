import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, Observable, concat } from '@apollo/client';
import { getRecoil } from 'recoil-nexus';

import { runtimeState } from '../state/runtime.state';
import { Profile } from '../types';

const httpLink = new HttpLink({
  uri: 'https://bytes-browser-server-c02da281c0f3.herokuapp.com/',
});

const authMiddleware = new ApolloLink((operation, forward) => {
  return new Observable((observer) => {
    const runtime = getRecoil(runtimeState);

    runtime.profileStore
      .get<Profile[]>('profiles')
      .then((profiles) => {
        if (!profiles || profiles === null) {
          forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          });
        } else {
          const token = profiles[runtime.currentUser]?.token;

          const prevHeaders = operation.getContext().headers;

          if (token) {
            operation.setContext({
              headers: {
                Authorization:
                  prevHeaders && (prevHeaders.Authorization === '' || prevHeaders.Authorization.length > 0)
                    ? prevHeaders.Authorization
                    : token,
              },
            });
          } else {
            operation.setContext({});
          }

          forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          });
        }
      })
      .catch((err) => {
        console.error(err);
        forward(operation).subscribe({
          next: observer.next.bind(observer),
          error: observer.error.bind(observer),
          complete: observer.complete.bind(observer),
        });
      });
  });
});

export const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  defaultOptions: {
    mutate: { errorPolicy: 'all' },
    query: { errorPolicy: 'all' },
  },
  link: concat(authMiddleware, httpLink),
});
