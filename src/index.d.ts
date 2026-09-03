declare module '*.css' {
  const content: Readonly<Record<string, string>>;
  export default content;
}