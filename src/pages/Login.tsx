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
    body: 'In-depth data analysis using RStudio and Jupyter Notebooks.',
  },
  {
    icon: '/icons/Data Download.svg',
    title: 'Data Download',
    body: 'Download raw and clinical data associated with specific cohorts or projects for further analysis.',
  },
];

const iconSrc = (path: string) => withClientBasePath(encodeURI(path));

/**
 * Placeholder preview of the platform shown in the hero. The marketing team's
 * animated GIF can drop straight into the browser frame below: replace
 * <PlatformPreview /> with
 *   <img src={iconSrc('/images/virtual-lab-preview.gif')} alt="Virtual Lab in use" />
 * and keep the surrounding <BrowserFrame>.
 */
const SurvivalScreen = () => (
  <svg
    viewBox="0 0 360 210"
    className="h-full w-full"
    role="img"
    aria-label="Sample survival plot"
  >
    {/* axes */}
    <line x1="44" y1="18" x2="44" y2="172" stroke="#cdccca" strokeWidth="1.5" />
    <line x1="44" y1="172" x2="338" y2="172" stroke="#cdccca" strokeWidth="1.5" />
    {[0, 1, 2, 3].map((g) => (
      <line
        key={g}
        x1="44"
        x2="338"
        y1={172 - g * 46}
        y2={172 - g * 46}
        stroke="#efedea"
        strokeWidth="1"
      />
    ))}
    {/* two stepped survival curves */}
    <polyline
      className="vl-draw"
      points="44,28 96,28 96,44 150,44 150,70 206,70 206,104 262,104 262,128 338,128"
      fill="none"
      stroke="#8b0053"
      strokeWidth="3"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <polyline
      className="vl-draw vl-draw-2"
      points="44,28 112,28 112,58 168,58 168,92 224,92 224,134 286,134 286,158 338,158"
      fill="none"
      stroke="#FCA88D"
      strokeWidth="3"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

const MUTATIONS: ReadonlyArray<[string, number]> = [
  ['KRAS', 92],
  ['NRAS', 78],
  ['TP53', 54],
  ['DIS3', 41],
  ['FAM46C', 33],
  ['BRAF', 21],
];

const MutationScreen = () => (
  <svg
    viewBox="0 0 360 210"
    className="h-full w-full"
    role="img"
    aria-label="Sample mutation frequency chart"
  >
    {MUTATIONS.map(([gene, width], i) => {
      const y = 16 + i * 31;
      return (
        <g key={gene}>
          <text
            x="62"
            y={y + 14}
            textAnchor="end"
            fontSize="12"
            fontFamily="Montserrat, sans-serif"
            fontStyle="italic"
            fill="#20313B"
          >
            {gene}
          </text>
          <rect x="72" y={y} width="266" height="20" rx="4" fill="#f1eef0" />
          <rect
            className="vl-bar"
            x="72"
            y={y}
            width={(width / 100) * 266}
            height="20"
            rx="4"
            fill={i % 2 === 0 ? '#8b0053' : '#60023E'}
          />
        </g>
      );
    })}
  </svg>
);

const PlatformPreview = () => (
  <div className="relative aspect-[16/10] w-full overflow-hidden bg-white">
    {/* faux app sidebar + main, cross-fading between two analysis views */}
    <div className="flex h-full w-full">
      <aside
        aria-hidden="true"
        className="hidden w-[34%] flex-col gap-3 border-r border-[#efedea] bg-[#faf8f7] p-4 sm:flex"
      >
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8b0053]">
          Cohort
        </div>
        {['Disease stage', 'Treatment', 'Age at diagnosis', 'Cytogenetics'].map(
          (f, i) => (
            <div key={f} className="space-y-1.5">
              <div className="text-[10px] font-medium text-[#20313B]">{f}</div>
              <div className="h-2 rounded-full bg-[#efedea]">
                <div
                  className="h-2 rounded-full bg-[#F58EB3]"
                  style={{ width: `${[70, 45, 60, 35][i]}%` }}
                />
              </div>
            </div>
          ),
        )}
        <div className="mt-auto rounded-md bg-[#8b0053] px-3 py-2 text-center text-[10px] font-semibold text-white">
          1,143 cases
        </div>
      </aside>

      <div className="relative flex-1 p-4">
        <div className="mb-3 flex h-6 items-center">
          <div className="relative">
            <span className="vl-screen-label-a inline-block whitespace-nowrap rounded-full bg-[#FFE1CC] px-2.5 py-1 text-[10px] font-semibold text-[#60023E]">
              Survival
            </span>
            <span className="vl-screen-label-b absolute left-0 top-0 inline-block whitespace-nowrap rounded-full bg-[#FFE1CC] px-2.5 py-1 text-[10px] font-semibold text-[#60023E]">
              Mutation frequency
            </span>
          </div>
        </div>
        <div className="relative h-[calc(100%-2rem)] w-full">
          <div className="vl-screen vl-screen-a absolute inset-0">
            <SurvivalScreen />
          </div>
          <div className="vl-screen vl-screen-b absolute inset-0">
            <MutationScreen />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const BrowserFrame = ({ children }: { children: React.ReactNode }) => (
  <div
    className="overflow-hidden rounded-xl border border-white/15 bg-white shadow-2xl ring-1 ring-black/5"
    aria-hidden="true"
  >
    <div className="flex items-center gap-1.5 border-b border-[#efedea] bg-[#f4f3f1] px-4 py-2.5">
      <span className="h-2.5 w-2.5 rounded-full bg-[#e7726f]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#f1c453]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#9fd6a0]" />
      <span className="ml-3 truncate rounded-md bg-white px-3 py-1 text-[10px] font-medium text-[#6b6b6b]">
        virtuallab.themmrf.org
      </span>
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
              <div className="inline-flex max-w-full rounded-2xl bg-white px-6 py-4 shadow-2xl shadow-[#2b001b]/25 ring-1 ring-white/40 sm:px-8 sm:py-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={iconSrc('/images/logos/VirtualLab-R.svg')}
                  alt="MMRF Virtual Lab"
                  className="h-auto w-64 max-w-full sm:w-80"
                />
              </div>
              <h1 className="mt-8 font-heading text-4xl font-extrabold leading-[1.1] text-white sm:text-5xl">
                Access, visualize, and analyze multiple myeloma data.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-white/85">
                Intuitive tools for researchers, clinicians, and partners to
                explore the MMRF&rsquo;s extensive catalog of patient-derived
                clinical, genomic, and immune data &mdash; built to turn
                real-world datasets into new insights and personalized treatment
                strategies.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={APPLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-[#FCA88D] px-7 py-3 text-base font-semibold text-[#4d0231] no-underline shadow-sm transition-colors hover:bg-[#ffc0a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#73004a]"
                >
                  Apply for access
                </a>
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="inline-flex items-center justify-center rounded-md border border-white/60 px-7 py-3 text-base font-semibold text-white no-underline transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#73004a]"
                >
                  Sign in
                </button>
              </div>
            </div>

            <div className="relative">
              <BrowserFrame>
                {/* Swap the line below for the marketing GIF when ready:
                    <img src={iconSrc('/images/virtual-lab-preview.gif')}
                         alt="Virtual Lab in use" className="w-full" /> */}
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
              <p className="mt-3 text-base text-[#5a5a5a]">
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

      <style jsx global>{`
        @keyframes vl-cycle {
          0%,
          42% {
            opacity: 1;
          }
          50%,
          92% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes vl-cycle-alt {
          0%,
          42% {
            opacity: 0;
          }
          50%,
          92% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes vl-draw-in {
          from {
            stroke-dashoffset: 620;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes vl-bar-in {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
        .vl-screen-a,
        .vl-screen-label-a {
          animation: vl-cycle 11s ease-in-out infinite;
        }
        .vl-screen-b,
        .vl-screen-label-b {
          animation: vl-cycle-alt 11s ease-in-out infinite;
        }
        .vl-draw {
          stroke-dasharray: 620;
          animation: vl-draw-in 2.2s ease-out forwards;
        }
        .vl-draw-2 {
          animation-delay: 0.3s;
        }
        .vl-bar {
          transform-origin: left center;
          animation: vl-bar-in 1.1s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .vl-screen-a,
          .vl-screen-label-a {
            animation: none;
            opacity: 1;
          }
          .vl-screen-b,
          .vl-screen-label-b {
            animation: none;
            opacity: 0;
          }
          .vl-draw,
          .vl-draw-2,
          .vl-bar {
            animation: none;
            stroke-dashoffset: 0;
            transform: none;
          }
        }
      `}</style>
    </>
  );
};

export default LoginPage;

export { getServerSideProps };
