import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { showNotification } from '@mantine/notifications';
import { GEN3_REDIRECT_URL, useGetLoginProvidersQuery } from '@gen3/core';
import {
  LoginPageGetServerSideProps as getServerSideProps,
} from '@gen3/frontend';
import PageTitle from '@/components/PageTitle';

const ACCESS_REQUEST_URL =
  'https://mmrf.formstack.com/forms/mmrf_virtual_lab_access_request';
const PLATFORM_PREVIEW_GIF_SRC = '/images/virtual-lab-preview.gif';

const virtualLabFeatures = [
  {
    title: 'Data Visualization Tools',
    description:
      'Visualize complex data, including cohort comparison, gene summary, mutation summary, survival plots, and mutation frequency plots.',
    icon: '/icons/Data-Visualization-Tools.svg',
  },
  {
    title: 'Cohort Builder',
    description:
      'Create and define custom cohorts based on clinical and molecular criteria.',
    icon: '/icons/Cohort Builder.svg',
  },
  {
    title: 'Computational Platform',
    description: 'Run in-depth analysis using RStudio and Jupyter Notebooks.',
    icon: '/icons/Computational Platform.svg',
  },
  {
    title: 'Data Download',
    description:
      'Download raw and clinical data associated with specific cohorts or projects for further analysis.',
    icon: '/icons/Data Download.svg',
  },
];

const getUrlSeparator = (url: string) => (url.includes('?') ? '&' : '?');

const appendParameterToUrl = (
  url: string,
  paramName: string,
  paramValue: string,
) => {
  const [baseUrl, hash] = url.split('#');
  const hashFragment = hash ? `#${hash}` : '';
  const separator = getUrlSeparator(baseUrl);

  return `${baseUrl}${separator}${encodeURIComponent(
    paramName,
  )}=${encodeURIComponent(paramValue)}${hashFragment}`;
};

const filterRedirect = (redirect?: string | string[]) => {
  let redirectPath = Array.isArray(redirect) ? redirect[0] : redirect ?? '/';

  if (redirectPath.includes('Login')) redirectPath = '/';

  if (!GEN3_REDIRECT_URL) return redirectPath;

  const baseUrl = GEN3_REDIRECT_URL.replace(/\/+$/, '');
  const cleanPath = redirectPath.replace(/^\/+/, '');

  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

const HeroLoginButton = () => {
  const router = useRouter();
  const {
    query: { referer: refererQuery, redirect: redirectQuery },
  } = router;
  const { data, isLoading, isFetching, isError } = useGetLoginProvidersQuery();
  const loginUrl = data?.default_provider.urls[0]?.url;
  const isDisabled = isLoading || isFetching || isError || !loginUrl;

  const handleLogin = () => {
    if (!loginUrl) return;

    router
      .push(
        appendParameterToUrl(
          loginUrl,
          'redirect',
          filterRedirect(redirectQuery || refererQuery),
        ),
      )
      .catch((error: Error) => {
        showNotification({
          title: 'Login Error',
          message: `error logging in ${error.message}`,
        });
      });
  };

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={isDisabled}
      className="inline-flex items-center justify-center rounded-full border-2 border-mmrf-plum px-7 py-3 text-sm font-bold text-mmrf-plum transition hover:bg-mmrf-platinum disabled:cursor-not-allowed disabled:border-mmrf-lightgray disabled:text-mmrf-lightgray"
    >
      {isLoading || isFetching ? 'Loading...' : 'Log In'}
    </button>
  );
};

const PlatformPreview = () => {
  const [previewFailed, setPreviewFailed] = useState(false);

  if (!previewFailed) {
    return (
      <div className="relative min-h-[320px] overflow-hidden rounded-[1.5rem]">
        <Image
          src={PLATFORM_PREVIEW_GIF_SRC}
          alt="Animated preview of MMRF Virtual Lab tools in use"
          fill
          unoptimized
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="object-cover"
          onError={() => setPreviewFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-[320px] overflow-hidden rounded-[1.5rem] bg-mmrf-gunmetal p-6 text-white">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-mmrf-blush opacity-30 blur-3xl" />
      <div className="absolute -bottom-20 left-8 h-56 w-56 rounded-full bg-mmrf-apricot opacity-20 blur-3xl" />

      <div className="relative rounded-2xl bg-white p-4 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-mmrf-rust" />
          <span className="h-3 w-3 rounded-full bg-mmrf-apricot" />
          <span className="h-3 w-3 rounded-full bg-mmrf-plum" />
        </div>
        <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-xl bg-mmrf-platinum p-4">
            <div className="mb-4 h-4 w-28 rounded-full bg-mmrf-lightgray" />
            <div className="space-y-3">
              <div className="h-8 rounded-lg bg-white" />
              <div className="h-8 rounded-lg bg-white" />
              <div className="h-8 rounded-lg bg-white" />
            </div>
          </div>
          <div className="rounded-xl bg-mmrf-platinum p-4">
            <div className="mb-4 flex items-end gap-2">
              <div className="h-16 flex-1 rounded-t-lg bg-mmrf-plum" />
              <div className="h-24 flex-1 rounded-t-lg bg-mmrf-rust" />
              <div className="h-12 flex-1 rounded-t-lg bg-mmrf-apricot" />
              <div className="h-20 flex-1 rounded-t-lg bg-mmrf-purple" />
            </div>
            <div className="h-28 rounded-xl bg-white p-4">
              <div className="mb-3 h-3 w-2/3 rounded-full bg-mmrf-lightgray" />
              <div className="h-3 w-1/2 rounded-full bg-mmrf-lightgray" />
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-mmrf-sand">
          Platform Preview
        </p>
        <p className="mt-2 text-sm text-white/85">
          Add the marketing GIF at <code>{PLATFORM_PREVIEW_GIF_SRC}</code> to
          replace this placeholder automatically.
        </p>
      </div>
    </div>
  );
};

export const LoginPage = () => {
  return (
    <>
      <PageTitle pageName="Login Page" />
      <div className="bg-gradient-to-b from-mmrf-platinum via-white to-white">
        <section className="mx-auto grid max-w-[1440px] gap-10 px-6 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-12 lg:py-16">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-mmrf-plum">
              MMRF Virtual Lab Data Commons
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-mmrf-gunmetal md:text-5xl">
              Access, visualize, and analyze patient-derived multiple myeloma
              data.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-mmrf-gunmetal/85">
              The platform offers researchers, clinicians, and partners
              intuitive tools to access, visualize, and analyze an extensive
              catalog of patient-derived clinical, genomic, and immune data.
              By making high-quality, real-world datasets more accessible,
              Virtual Lab empowers the research community to generate new
              insights, drive innovation, and advance personalized treatment
              strategies.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={ACCESS_REQUEST_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-mmrf-plum px-7 py-3 text-sm font-bold text-white shadow-lg shadow-mmrf-plum/20 transition hover:bg-mmrf-purple"
              >
                Apply for Access
              </a>
              <HeroLoginButton />
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-3 shadow-2xl shadow-mmrf-gunmetal/10 ring-1 ring-mmrf-gunmetal/10">
            <PlatformPreview />
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-6 pb-14 lg:px-12">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {virtualLabFeatures.map((feature) => (
              <article
                key={feature.title}
                className="rounded-3xl bg-white p-6 shadow-lg shadow-mmrf-gunmetal/5 ring-1 ring-mmrf-gunmetal/10"
              >
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-mmrf-platinum">
                  <Image
                    src={feature.icon}
                    alt=""
                    aria-hidden="true"
                    width={54}
                    height={41}
                    className="max-h-10 w-auto max-w-11"
                  />
                </div>
                <h2 className="text-lg font-black text-mmrf-gunmetal">
                  {feature.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-mmrf-gunmetal/80">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[960px] px-6 pb-16">
          <div className="rounded-[2rem] bg-white/85 px-6 py-5 text-center shadow-lg shadow-mmrf-gunmetal/5 ring-1 ring-mmrf-gunmetal/10 backdrop-blur md:px-10">
            <p className="text-sm leading-6 text-mmrf-gunmetal/80">
              Questions about access or registration? Contact{' '}
              <a
                href="mailto:VirtualLab@themmrf.org"
                className="font-bold text-mmrf-plum underline decoration-mmrf-plum/30 underline-offset-4 hover:text-mmrf-purple"
              >
                VirtualLab@themmrf.org
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </>
  );
};

export default LoginPage;

export { getServerSideProps };
