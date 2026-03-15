import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'

// Detect standalone PWA mode (installed to home screen) or mobile viewport
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;
const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const urlParams = new URLSearchParams(window.location.search);
const forcePwa = urlParams.has('pwa');
const forcePortal = urlParams.has('portal');

const usePWA = forcePortal ? false : (forcePwa || (isStandalone && isMobile));

const JobDoxPortal = lazy(() => import('./JobDoxPortal.jsx'));
const CortexPWA    = lazy(() => import('./CortexPWA.jsx'));

const Loading = () => (
  <div style={{
    display:'flex',alignItems:'center',justifyContent:'center',
    height:'100vh',background:'#06070d',color:'#8b95b0',
    fontFamily:"'Outfit',sans-serif",fontSize:13
  }}>Loading…</div>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<Loading />}>
      {usePWA ? <CortexPWA /> : <JobDoxPortal />}
    </Suspense>
  </StrictMode>
)
