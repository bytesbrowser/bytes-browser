import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | undefined;
export type InputMaybe<T> = T | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  JSON: { input: any; output: any; }
};

export type Mutation = {
  deleteTheme: Scalars['Boolean']['output'];
  publishTheme: Theme;
  register: Scalars['String']['output'];
  updateTheme: Theme;
};


export type MutationDeleteThemeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishThemeArgs = {
  theme: ThemeInput;
};


export type MutationRegisterArgs = {
  params: RegisterUserParams;
};


export type MutationUpdateThemeArgs = {
  id: Scalars['ID']['input'];
  updates: UpdateThemInput;
};

export type Query = {
  getSubscriptionStatus: SubscriptionStatus;
  getTheme: Theme;
  getThemes: Array<Theme>;
  getUser: User;
  login: Scalars['String']['output'];
};


export type QueryGetThemeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLoginArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type RegisterUserParams = {
  avatar?: InputMaybe<Scalars['String']['input']>;
  email: Scalars['String']['input'];
  fullName: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type SubscriptionStatus = {
  active: Scalars['Boolean']['output'];
  created_at: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  user_id: Scalars['ID']['output'];
};

export type Theme = {
  content: Scalars['JSON']['output'];
  created_at: Scalars['String']['output'];
  created_by_alias: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export type ThemeInput = {
  content: Scalars['JSON']['input'];
  created_by_alias: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  version: Scalars['String']['input'];
};

export type UpdateThemInput = {
  content?: InputMaybe<Scalars['JSON']['input']>;
  created_by_alias?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  version?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  avatar?: Maybe<Scalars['String']['output']>;
  created_at: Scalars['String']['output'];
  email: Scalars['String']['output'];
  full_name: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  password: Scalars['String']['output'];
};

export type RegisterMutationVariables = Exact<{
  params: RegisterUserParams;
}>;


export type RegisterMutation = { register: string };

export type GetSubscriptionStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSubscriptionStatusQuery = { getSubscriptionStatus: { id: string, created_at: string, user_id: string, active: boolean } };

export type GetThemeQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetThemeQuery = { getTheme: { id: string, created_by_alias: string, name: string, content: any, description?: string | undefined, icon?: string | undefined, created_at: string, updated_at: string } };

export type GetThemesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetThemesQuery = { getThemes: Array<{ id: string, created_by_alias: string, name: string, content: any, description?: string | undefined, icon?: string | undefined, created_at: string, updated_at: string }> };

export type GetUserQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserQuery = { getUser: { id: string, full_name: string, email: string, created_at: string, password: string, avatar?: string | undefined } };

export type LoginQueryVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type LoginQuery = { login: string };


export const RegisterDocument = gql`
    mutation Register($params: RegisterUserParams!) {
  register(params: $params)
}
    `;
export type RegisterMutationFn = Apollo.MutationFunction<RegisterMutation, RegisterMutationVariables>;

/**
 * __useRegisterMutation__
 *
 * To run a mutation, you first call `useRegisterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegisterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [registerMutation, { data, loading, error }] = useRegisterMutation({
 *   variables: {
 *      params: // value for 'params'
 *   },
 * });
 */
export function useRegisterMutation(baseOptions?: Apollo.MutationHookOptions<RegisterMutation, RegisterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RegisterMutation, RegisterMutationVariables>(RegisterDocument, options);
      }
export type RegisterMutationHookResult = ReturnType<typeof useRegisterMutation>;
export type RegisterMutationResult = Apollo.MutationResult<RegisterMutation>;
export type RegisterMutationOptions = Apollo.BaseMutationOptions<RegisterMutation, RegisterMutationVariables>;
export const GetSubscriptionStatusDocument = gql`
    query GetSubscriptionStatus {
  getSubscriptionStatus {
    id
    created_at
    user_id
    active
  }
}
    `;

/**
 * __useGetSubscriptionStatusQuery__
 *
 * To run a query within a React component, call `useGetSubscriptionStatusQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSubscriptionStatusQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetSubscriptionStatusQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetSubscriptionStatusQuery(baseOptions?: Apollo.QueryHookOptions<GetSubscriptionStatusQuery, GetSubscriptionStatusQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetSubscriptionStatusQuery, GetSubscriptionStatusQueryVariables>(GetSubscriptionStatusDocument, options);
      }
export function useGetSubscriptionStatusLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetSubscriptionStatusQuery, GetSubscriptionStatusQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetSubscriptionStatusQuery, GetSubscriptionStatusQueryVariables>(GetSubscriptionStatusDocument, options);
        }
export type GetSubscriptionStatusQueryHookResult = ReturnType<typeof useGetSubscriptionStatusQuery>;
export type GetSubscriptionStatusLazyQueryHookResult = ReturnType<typeof useGetSubscriptionStatusLazyQuery>;
export type GetSubscriptionStatusQueryResult = Apollo.QueryResult<GetSubscriptionStatusQuery, GetSubscriptionStatusQueryVariables>;
export const GetThemeDocument = gql`
    query GetTheme($id: ID!) {
  getTheme(id: $id) {
    id
    created_by_alias
    name
    content
    description
    icon
    created_at
    updated_at
  }
}
    `;

/**
 * __useGetThemeQuery__
 *
 * To run a query within a React component, call `useGetThemeQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetThemeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetThemeQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetThemeQuery(baseOptions: Apollo.QueryHookOptions<GetThemeQuery, GetThemeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetThemeQuery, GetThemeQueryVariables>(GetThemeDocument, options);
      }
export function useGetThemeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetThemeQuery, GetThemeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetThemeQuery, GetThemeQueryVariables>(GetThemeDocument, options);
        }
export type GetThemeQueryHookResult = ReturnType<typeof useGetThemeQuery>;
export type GetThemeLazyQueryHookResult = ReturnType<typeof useGetThemeLazyQuery>;
export type GetThemeQueryResult = Apollo.QueryResult<GetThemeQuery, GetThemeQueryVariables>;
export const GetThemesDocument = gql`
    query GetThemes {
  getThemes {
    id
    created_by_alias
    name
    content
    description
    icon
    created_at
    updated_at
  }
}
    `;

/**
 * __useGetThemesQuery__
 *
 * To run a query within a React component, call `useGetThemesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetThemesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetThemesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetThemesQuery(baseOptions?: Apollo.QueryHookOptions<GetThemesQuery, GetThemesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetThemesQuery, GetThemesQueryVariables>(GetThemesDocument, options);
      }
export function useGetThemesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetThemesQuery, GetThemesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetThemesQuery, GetThemesQueryVariables>(GetThemesDocument, options);
        }
export type GetThemesQueryHookResult = ReturnType<typeof useGetThemesQuery>;
export type GetThemesLazyQueryHookResult = ReturnType<typeof useGetThemesLazyQuery>;
export type GetThemesQueryResult = Apollo.QueryResult<GetThemesQuery, GetThemesQueryVariables>;
export const GetUserDocument = gql`
    query GetUser {
  getUser {
    id
    full_name
    email
    created_at
    password
    avatar
  }
}
    `;

/**
 * __useGetUserQuery__
 *
 * To run a query within a React component, call `useGetUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetUserQuery(baseOptions?: Apollo.QueryHookOptions<GetUserQuery, GetUserQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetUserQuery, GetUserQueryVariables>(GetUserDocument, options);
      }
export function useGetUserLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetUserQuery, GetUserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetUserQuery, GetUserQueryVariables>(GetUserDocument, options);
        }
export type GetUserQueryHookResult = ReturnType<typeof useGetUserQuery>;
export type GetUserLazyQueryHookResult = ReturnType<typeof useGetUserLazyQuery>;
export type GetUserQueryResult = Apollo.QueryResult<GetUserQuery, GetUserQueryVariables>;
export const LoginDocument = gql`
    query Login($email: String!, $password: String!) {
  login(email: $email, password: $password)
}
    `;

/**
 * __useLoginQuery__
 *
 * To run a query within a React component, call `useLoginQuery` and pass it any options that fit your needs.
 * When your component renders, `useLoginQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLoginQuery({
 *   variables: {
 *      email: // value for 'email'
 *      password: // value for 'password'
 *   },
 * });
 */
export function useLoginQuery(baseOptions: Apollo.QueryHookOptions<LoginQuery, LoginQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<LoginQuery, LoginQueryVariables>(LoginDocument, options);
      }
export function useLoginLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<LoginQuery, LoginQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<LoginQuery, LoginQueryVariables>(LoginDocument, options);
        }
export type LoginQueryHookResult = ReturnType<typeof useLoginQuery>;
export type LoginLazyQueryHookResult = ReturnType<typeof useLoginLazyQuery>;
export type LoginQueryResult = Apollo.QueryResult<LoginQuery, LoginQueryVariables>;