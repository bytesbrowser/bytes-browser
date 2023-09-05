import { atom } from 'recoil';

import { Theme } from '../../graphql';
import { BytesBrowserDarkTheme, BytesBrowserLightTheme } from '../constants';
import { applyTheme } from '../themes/loader';
import { ThemeJSONSchema } from '../types';

export const themeState = atom<{
  theme?: string;
  themes: Theme[];
  currentTheme?: Theme;
  config?: ThemeJSONSchema;
}>({
  key: 'theme_state',
  default: {
    themes: [BytesBrowserDarkTheme, BytesBrowserLightTheme],
    currentTheme: BytesBrowserDarkTheme,
    theme: BytesBrowserDarkTheme.name,
    config: BytesBrowserDarkTheme.content,
  },
  effects: [
    ({ onSet }) => {
      onSet((newValue) => {
        if (newValue.config) {
          applyTheme(newValue.config);
        }
      });
    },
  ],
});
