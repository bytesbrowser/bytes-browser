export const is_email = (email: string) => {
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
};
