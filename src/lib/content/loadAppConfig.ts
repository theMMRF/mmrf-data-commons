import type {
  AuthorizedRoutesConfig,
  ModalsConfig,
  RegisteredIcons,
  SessionConfiguration,
} from '@gen3/frontend';

export interface AppConfig {
  icons: RegisteredIcons[];
  modalsConfig: ModalsConfig;
  sessionConfig: SessionConfiguration;
  protectedRoutes: AuthorizedRoutesConfig;
}

export const loadAppConfig = async (): Promise<AppConfig> => {
  if (typeof window !== 'undefined') {
    // Next runs _app.getInitialProps again on client navigation. Reuse the
    // configuration serialized by the server instead of reading filesystem
    // content in the browser or replacing it with Gen3's default modals.
    const { icons, modalsConfig, sessionConfig, protectedRoutes } =
      window.__NEXT_DATA__.props as AppConfig;
    return { icons, modalsConfig, sessionConfig, protectedRoutes };
  }

  const { loadContent } = await import('./loadContent');
  return loadContent();
};
