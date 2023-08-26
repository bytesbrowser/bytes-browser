export const formatLongText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;

  const start = text.slice(0, maxLength / 2);
  const end = text.slice(text.length - maxLength / 2);

  return `${start}...${end}`;
};
