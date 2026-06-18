import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import {
  LoginPanel,
  LoginConfig,
  LoginPageGetServerSideProps as getServerSideProps,
} from '@gen3/frontend';
import { useGetLoginProvidersQuery, GEN3_REDIRECT_URL } from '@gen3/core';
import PageTitle from '@/components/PageTitle';
import { withClientBasePath } from '@/lib/basePath';

const APPLY_URL =
  'https://mmrf.formstack.com/forms/mmrf_virtual_lab_access_request';
const CONTACT_EMAIL = 'VirtualLab@themmrf.org';

interface LoginProvidersData {
  default_provider?: { name?: string; urls?: { url: string; name: string }[] };
  providers?: { name: string; urls: { url: string; name: string }[] }[];
}

// Mirrors the redirect handling used by @gen3/frontend's LoginPanel so the
// hero "Sign in" button performs the same login flow as the provider button.
const appendParameterToUrl = (
  url: string,
  paramName: string,
  paramValue: string,
): string => {
  if (!url || !paramName) return url;
  const [baseUrl, hash] = url.split('#');
  const hashFragment = hash ? `#${hash}` : '';
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${encodeURIComponent(
    paramName,
  )}=${encodeURIComponent(paramValue)}${hashFragment}`;
};

const filterRedirect = (redirect?: string | string[]): string => {
  let redirectPath = Array.isArray(redirect) ? redirect[0] : (redirect ?? '/');
  if (redirectPath?.includes('Login')) redirectPath = '/';
  if (!GEN3_REDIRECT_URL) return redirectPath;
  const baseUrl = GEN3_REDIRECT_URL.replace(/\/+$/, '');
  const cleanPath = redirectPath.replace(/^\/+/, '');
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

// Copy mirrors themmrf.org/for-researchers/data-access-via-virtual-lab
const FEATURES: ReadonlyArray<{
  icon: string;
  title: string;
  body: string;
}> = [
  {
    icon: '/icons/Data-Visualization-Tools.svg',
    title: 'Data Visualization Tools',
    body: 'Visualize complex data, including cohort comparison, gene summary, mutation summary, survival plots, and mutation frequency plots.',
  },
  {
    icon: '/icons/Cohort Builder.svg',
    title: 'Cohort Builder',
    body: 'Create and define custom cohorts based on clinical and molecular criteria.',
  },
  {
    icon: '/icons/Computational Platform.svg',
    title: 'Computational Platform',
    body: 'In-depth data analysis using Jupyter Notebooks.',
  },
  {
    icon: '/icons/Data Download.svg',
    title: 'Data Download',
    body: 'Download raw and clinical data associated with specific cohorts or projects for further analysis.',
  },
];

const iconSrc = (path: string) => withClientBasePath(encodeURI(path));

const PREVIEW_SCREENS: ReadonlyArray<{
  title: string;
  image: string;
}> = [
  {
    title: 'Gene Expression Clustering',
    image: '/images/Gene Expression Clustering.png',
  },
  {
    title: 'Genome Browser',
    image: '/images/Genome Browser.png',
  },
  {
    title: 'OncoMatrix',
    image: '/images/OncoMatrix.png',
  },
  {
    title: 'ProteinPaint',
    image: '/images/ProteinPaint.png',
  },
  {
    title: 'Survival',
    image: '/images/Survival.png',
  },
];

const PreviewScreenTitle = () => (
  <div className="relative h-6 min-w-0 flex-1">
    {PREVIEW_SCREENS.map((screen) => (
      <span
        key={screen.title}
        className="vl-preview-label absolute left-0 top-0 inline-flex max-w-full truncate rounded-md bg-[#8B0053] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-sm"
      >
        <span className="truncate">{screen.title}</span>
      </span>
    ))}
  </div>
);

const PlatformPreview = () => (
  <div className="relative aspect-[16/10] w-full overflow-hidden bg-white p-2 sm:p-3">
    <div className="relative h-full w-full overflow-hidden rounded-md bg-white">
      {PREVIEW_SCREENS.map((screen) => (
        <div key={screen.title} className="vl-preview-slide absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={iconSrc(screen.image)}
            alt=""
            className="h-full w-full object-contain object-center"
          />
        </div>
      ))}
    </div>
  </div>
);

const BrowserFrame = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: React.ReactNode;
}) => (
  <div
    className="overflow-hidden rounded-xl border border-white/15 bg-white shadow-2xl ring-1 ring-black/5"
    aria-hidden="true"
  >
    <div className="flex items-center gap-2 border-b border-[#efedea] bg-[#f4f3f1] px-3 py-2.5 sm:gap-3 sm:px-4">
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#e7726f]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f1c453]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#9fd6a0]" />
      </div>
      <span className="hidden max-w-44 truncate rounded-md bg-white px-3 py-1 text-[10px] font-medium text-[#6b6b6b] shadow-inner sm:block">
        virtuallab.themmrf.org
      </span>
      {title}
    </div>
    {children}
  </div>
);

export const LoginPage = ({ loginConfig }: { loginConfig: LoginConfig }) => {
  const router = useRouter();
  const { data } = useGetLoginProvidersQuery();
  const providers = data as LoginProvidersData | undefined;
  const signInUrl = providers?.default_provider?.urls?.[0]?.url;
  const isDev = process.env.NODE_ENV === 'development';
  const [showDevLogin, setShowDevLogin] = useState(false);

  const handleSignIn = useCallback(() => {
    if (!signInUrl) return;
    const target = router.query.redirect ?? router.query.referer;
    router.push(
      appendParameterToUrl(signInUrl, 'redirect', filterRedirect(target)),
    );
  }, [router, signInUrl]);

  return (
    <>
      <PageTitle pageName="Login Page" />

      <main className="font-content text-[#20313B]">
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#4d0231] via-[#73004a] to-[#8b0053]">
          {/* subtle genomic motif */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
              backgroundSize: '26px 26px',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-[#F58EB3] opacity-20 blur-3xl"
          />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
            <div className="max-w-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={iconSrc('/images/logos/VirtualLab-R-white.svg')}
                alt="MMRF Virtual Lab"
                className="h-auto w-80 max-w-full drop-shadow-[0_8px_22px_rgba(43,0,27,0.32)] sm:w-[26rem] lg:w-[30rem]"
              />
              <h1 className="mt-8 font-heading text-4xl font-extrabold leading-[1.1] text-white sm:text-5xl">
                Access, visualize, and analyze multiple myeloma data.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-white/85">
                The platform offers researchers, clinicians, and partners
                intuitive tools to access, visualize, and analyze our extensive
                catalog of patient-derived clinical, genomic, and immune data.
                By making high-quality, real-world datasets more accessible,
                Virtual Lab empowers the research community to generate new
                insights, drive innovation, and advance personalized treatment
                strategies.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={APPLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#4d0231' }}
                  className="inline-flex items-center justify-center rounded-md bg-[#FCA88D] px-8 py-3.5 text-base font-bold text-[#4d0231] no-underline shadow-[0_12px_30px_rgba(43,0,27,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#ffc0a8] hover:shadow-[0_16px_34px_rgba(43,0,27,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#73004a]"
                >
                  Apply for access
                </a>
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="inline-flex items-center justify-center rounded-md border border-white/55 bg-white/16 px-8 py-3.5 text-base font-bold text-white no-underline shadow-[0_12px_30px_rgba(43,0,27,0.18)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-white/75 hover:bg-white/24 hover:shadow-[0_16px_34px_rgba(43,0,27,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#73004a]"
                >
                  Sign in
                </button>
              </div>
            </div>

            <div className="relative">
              <BrowserFrame title={<PreviewScreenTitle />}>
                <PlatformPreview />
              </BrowserFrame>
            </div>
          </div>
        </section>

        {/* ---------- Capabilities ---------- */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
            <div className="max-w-2xl">
              <p className="font-heading text-sm font-semibold uppercase tracking-[0.2em] text-[#8b0053]">
                What you can do
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold text-[#20313B]">
                One platform, end to end
              </h2>
              <p className="mt-3 text-base text-[#5a5a5a]" style={{ color: '#5a5a5a' }}>
                From building a cohort to downloading results, Virtual Lab brings
                exploration, analysis, and computation together in one place.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="group flex flex-col rounded-xl border border-[#e7e5e2] bg-white p-6 transition-all hover:-translate-y-1 hover:border-[#8b0053]/30 hover:shadow-lg"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#FFE1CC]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={iconSrc(feature.icon)}
                      alt=""
                      aria-hidden="true"
                      className="h-7 w-7"
                    />
                  </div>
                  <h3 className="mt-5 font-heading text-lg font-bold text-[#8b0053]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5a5a5a]">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Contact ---------- */}
        <section className="border-t border-[#e7e5e2] bg-[#f4f3f1]">
          <div className="mx-auto max-w-3xl px-6 py-12 text-center">
            <p className="text-sm text-[#5a5a5a]">
              Questions about access or registration? Contact{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-semibold text-[#8b0053] underline-offset-2 hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>

            {/* Developer-only credentials login. Available only in local dev and
                hidden by default so it stays out of marketing screenshots. */}
            {isDev && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowDevLogin((v) => !v)}
                  className="text-xs font-medium text-[#9a8fa0] underline-offset-2 hover:text-[#8b0053] hover:underline"
                >
                  {showDevLogin ? 'Hide developer login' : 'Developer login'}
                </button>
                {showDevLogin && (
                  <div className="mx-auto mt-4 max-w-xl rounded-xl border border-[#e7e5e2] bg-white p-4 text-left shadow-sm">
                    <LoginPanel {...loginConfig} />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        @keyframes vl-preview-fade {
          0% {
            opacity: 0;
          }
          3% {
            opacity: 1;
          }
          17% {
            opacity: 1;
          }
          20% {
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }
        .vl-preview-slide,
        .vl-preview-label {
          opacity: 0;
          animation: vl-preview-fade 25s ease-in-out infinite;
        }
        .vl-preview-slide:nth-child(1),
        .vl-preview-label:nth-child(1) {
          animation-delay: 0s;
        }
        .vl-preview-slide:nth-child(2),
        .vl-preview-label:nth-child(2) {
          animation-delay: -20s;
        }
        .vl-preview-slide:nth-child(3),
        .vl-preview-label:nth-child(3) {
          animation-delay: -15s;
        }
        .vl-preview-slide:nth-child(4),
        .vl-preview-label:nth-child(4) {
          animation-delay: -10s;
        }
        .vl-preview-slide:nth-child(5),
        .vl-preview-label:nth-child(5) {
          animation-delay: -5s;
        }
        @media (prefers-reduced-motion: reduce) {
          .vl-preview-slide,
          .vl-preview-label {
            animation: none;
            transform: none;
          }
          .vl-preview-slide:first-child,
          .vl-preview-label:first-child {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default LoginPage;

export { getServerSideProps };
