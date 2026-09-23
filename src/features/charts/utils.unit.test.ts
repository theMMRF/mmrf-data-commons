import { handleDownloadPNG, handleDownloadSVG } from './utils';

describe('chart download snapshots', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it.each(['SVG', 'PNG'] as const)(
    'preserves the selected chart and dimensions during delayed font loading (%s)',
    async (format) => {
      const style = document.createElement('style');
      style.textContent =
        '@font-face { font-family: Test; src: url("/test-latin.woff2"); }';
      document.head.append(style);
      const element = document.createElement('div');
      element.innerHTML = '<svg><text>Original chart</text></svg>';
      document.body.append(element);
      const bounds = jest.spyOn(element, 'getBoundingClientRect');
      bounds.mockReturnValue({ width: 300, height: 200 } as DOMRect);

      let finishFont!: (response: Response) => void;
      const fontResponse = new Promise<Response>((resolve) => {
        finishFont = resolve;
      });
      const fetchFont = jest
        .spyOn(globalThis, 'fetch')
        .mockReturnValue(fontResponse);
      const createURL = jest
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:test-chart');
      jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});
      // jest-fixed-jsdom uses Node's Blob; its FileReader still expects JSDOM's.
      jest
        .spyOn(FileReader.prototype, 'readAsDataURL')
        .mockImplementation(function (this: FileReader) {
          Object.defineProperty(this, 'result', {
            value: 'data:font/woff2;base64,dGVzdA==',
          });
          this.dispatchEvent(new ProgressEvent('loadend'));
        });
      const image = document.createElement('img');
      const createImage = jest
        .spyOn(globalThis, 'Image')
        .mockImplementation(() => image);
      jest
        .spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockReturnValue(null);

      const download = format === 'SVG' ? handleDownloadSVG : handleDownloadPNG;
      const pendingDownload = download(
        { current: element },
        `chart.${format.toLowerCase()}`,
      );
      expect(fetchFont).toHaveBeenCalledWith('/test-latin.woff2');

      // Simulate disposal/re-render while fonts load, keeping the same host.
      element.innerHTML = '<svg><text>Replacement chart</text></svg>';
      bounds.mockReturnValue({ width: 0, height: 0 } as DOMRect);
      finishFont(new Response('font data'));
      await pendingDownload;

      const svg = await (createURL.mock.calls[0][0] as Blob).text();
      expect(svg).toContain('Original chart');
      expect(svg).not.toContain('Replacement chart');
      expect(svg).toContain('width="400"');
      expect(svg).toContain('height="300"');
      if (format === 'PNG') {
        expect(createImage).toHaveBeenCalledWith(400, 300);
      }
    },
  );
});
