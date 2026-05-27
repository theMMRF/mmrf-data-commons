export { middleware } from './middleware-impl';

export const config = {
  matcher: [
    '/((?!api/auth|api/terms|Login|TermsAcceptance|_next/static|_next/image|favicon.ico|_status|user|authz|lw-workspace|icons|images|mockServiceWorker\\.js).*)',
  ],
};
