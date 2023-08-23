import { ApolloProvider } from '@apollo/client';
import 'feeder-react-feedback/dist/feeder-react-feedback.css';
import ReactDOM from 'react-dom/client';
import 'react-toggle/style.css';
import { RecoilRoot } from 'recoil';
import RecoilNexus from 'recoil-nexus';

import App from './App';
import { apolloClient } from './lib/graphql/client';
import './styles/index.scss';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ApolloProvider client={apolloClient}>
    <RecoilRoot>
      <RecoilNexus />
      <App />
    </RecoilRoot>
  </ApolloProvider>,
);
