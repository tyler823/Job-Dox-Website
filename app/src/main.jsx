import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'

// Detect native Capacitor app (iOS/Android)
const isNative = Capacitor.isNativePlatform();

// Detect signing page route: /sign/{token}
const signingMatch = window.location.pathname.match(/^\/sign\/(.+)/);
const isSigningPage = !!signingMatch;
const signingToken = signingMatch ? signingMatch[1] : null;

// Detect standalone PWA mode (installed to home screen) or mobile viewport
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;
const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const urlParams = new URLSearchParams(window.location.search);
const forcePwa = urlParams.has('pwa');
const forcePortal = urlParams.has('portal');

const usePWA = forcePortal ? false : (forcePwa || (isStandalone && isMobile));

const AppEntry     = lazy(() => import('./AppEntry.jsx'));
const JobDoxPortal = lazy(() => import('./JobDoxPortal.jsx'));
const CortexPWA    = lazy(() => import('./CortexPWA.jsx'));

// Lazy load the signing page component from JobDoxDocuments
const SigningPageWrapper = lazy(() =>
  import('./JobDoxDocuments.jsx').then(mod => ({
    default: () => <mod.PublicSigningPage token={signingToken} />
  }))
);

const Loading = () => (
  <div style={{
    display:'flex',alignItems:'center',justifyContent:'center',
    height:'100vh',background:'#06070d',color:'#8b95b0',
    fontFamily:"'Outfit',sans-serif",fontSize:13
  }}>Loading…</div>
);

function App() {
  if (isSigningPage) return <SigningPageWrapper />;
  if (isNative) return <AppEntry />;
  if (usePWA)   return <CortexPWA />;
  return <JobDoxPortal />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<Loading />}>
      <App />
    </Suspense>
  </StrictMode>
)
