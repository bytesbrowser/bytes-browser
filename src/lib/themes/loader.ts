import { ThemeJSONSchema } from '../types';

export const applyTheme = (theme: ThemeJSONSchema) => {
  const scss = generateSCSSFromJSON(theme);
  const styleElement = document.createElement('style');
  styleElement.innerHTML = scss;
  document.head.appendChild(styleElement);
};

function generateSCSSFromJSON(themeConfig: ThemeJSONSchema): string {
  let scss = ':root {\n';
  if (themeConfig.sidebarBG) {
    scss += `--sidebar-bg: ${themeConfig.sidebarBG};`;
  }

  if (themeConfig.primaryBG) {
    scss += `--primary-bg: ${themeConfig.primaryBG};`;
  }

  if (themeConfig.primaryTextColor) {
    scss += `--primary-text-color: ${themeConfig.primaryTextColor};`;
  }

  if (themeConfig.lightTextOpacity != undefined) {
    scss += `--light-text-opacity: ${themeConfig.lightTextOpacity};`;
  }

  if (themeConfig.iconColor) {
    scss += `--icon-color: ${themeConfig.iconColor};`;
  }

  if (themeConfig.sidebarInsetBg) {
    scss += `--sidebar-inset-bg: ${themeConfig.sidebarInsetBg};`;
  }

  if (themeConfig.sidebarInsetTextColor) {
    scss += `--sidebar-inset-text-color: ${themeConfig.sidebarInsetTextColor};`;
  }

  if (themeConfig.iconLightOpacity) {
    scss += `--icon-light-opacity: ${themeConfig.iconLightOpacity};`;
  }

  if (themeConfig.sidebarBorderColor) {
    scss += `--sidebar-border-color: ${themeConfig.sidebarBorderColor};`;
  }

  if (themeConfig.primaryBorderColor) {
    scss += `--primary-border-color: ${themeConfig.primaryBorderColor};`;
  }

  scss += '\n}';

  return scss;
}
