declare global {
  interface Window {
    monaco: typeof monaco;
    __monacoLoading: boolean;
    __sqllab_themes: boolean;
    require: any;
  }
}

export {};
