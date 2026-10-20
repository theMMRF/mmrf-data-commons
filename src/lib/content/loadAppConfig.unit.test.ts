/** @jest-environment node */
import { loadAppConfig, type AppConfig } from './loadAppConfig';
import { loadContent } from './loadContent';

jest.mock('./loadContent', () => ({ loadContent: jest.fn() }));

const config: AppConfig = {
  icons: [],
  sessionConfig: { monitorWorkspace: true },
  modalsConfig: { systemUseModal: { enabled: false, content: { text: [] } } },
  protectedRoutes: { routes: { '/Discovery': { loginRequired: true } } },
};

describe('loadAppConfig', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
    jest.clearAllMocks();
  });

  it('loads filesystem configuration on the server', async () => {
    jest.mocked(loadContent).mockResolvedValue({
      ...config,
      themeFonts: { fontFamily: 'test', heading: 'test', content: 'test' },
      colors: {},
    });

    expect(await loadAppConfig()).toMatchObject(config);
    expect(loadContent).toHaveBeenCalledTimes(1);
  });

  it('preserves server settings on client navigation without loading filesystem content', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        __NEXT_DATA__: {
          props: { ...config, pageProps: { originalPage: true } },
        },
      },
    });

    expect(await loadAppConfig()).toEqual(config);
    expect(await loadAppConfig()).toEqual(config);
    expect(loadContent).not.toHaveBeenCalled();
  });
});
