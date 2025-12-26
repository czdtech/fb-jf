declare module 'opencc-js' {
  interface OpenCCConverter {
    (text: string): string;
  }

  interface OpenCCStatic {
    Converter(options: { from: string; to: string }): OpenCCConverter;
  }

  const OpenCC: OpenCCStatic;
  export = OpenCC;
}