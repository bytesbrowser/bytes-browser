export const getRandomColorfulHexColor = () => {
  // Generate a random hue value between 0 and 360
  const hue = Math.floor(Math.random() * 360);
  // Use full saturation (100%) and a relatively bright lightness value (50%)
  const saturation = 100;
  const lightness = 50;

  // Convert to RGB using the HSL-to-RGB conversion formula
  const c = (1 - Math.abs((2 * lightness) / 100 - 1)) * (saturation / 100);
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness / 100 - c / 2;

  let r, g, b;
  if (hue >= 0 && hue < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (hue >= 60 && hue < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (hue >= 120 && hue < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (hue >= 180 && hue < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (hue >= 240 && hue < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  // Convert to 0-255 scale and make it a hex string
  r = Math.floor((r + m) * 255)
    .toString(16)
    .padStart(2, '0');
  g = Math.floor((g + m) * 255)
    .toString(16)
    .padStart(2, '0');
  b = Math.floor((b + m) * 255)
    .toString(16)
    .padStart(2, '0');

  return `#${r}${g}${b}`;
};
