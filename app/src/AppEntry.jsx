import { useState, useEffect, useCallback, lazy, Suspense } from "react";

/* ══════════════════════════════════════════════════════════════════
   AppEntry — Native Capacitor launch screen
   Shows Cortex branding + Sign In when running inside the iOS app.
   After successful Memberstack login, renders the full portal.
══════════════════════════════════════════════════════════════════ */

const JobDoxPortal = lazy(() => import("./JobDoxPortal.jsx"));

/* ── Inline brain logo (matches shared/icon.svg without red background) ── */
const CortexLogo = () => (
  <svg width="80" height="80" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(256,256) scale(0.6)" stroke="var(--acc)" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-10,-160 C-80,-160 -140,-120 -160,-60 C-180,0 -170,50 -140,90 C-120,120 -110,140 -110,170 C-110,190 -90,200 -60,200 L-10,200"/>
      <path d="M10,-160 C80,-160 140,-120 160,-60 C180,0 170,50 140,90 C120,120 110,140 110,170 C110,190 90,200 60,200 L10,200"/>
      <line x1="0" y1="-160" x2="0" y2="200"/>
      <path d="M-10,-80 C-60,-80 -100,-60 -120,-30"/>
      <path d="M-10,10 C-60,10 -110,30 -130,60"/>
      <path d="M-10,100 C-50,100 -90,110 -110,130"/>
      <path d="M10,-80 C60,-80 100,-60 120,-30"/>
      <path d="M10,10 C60,10 110,30 130,60"/>
      <path d="M10,100 C50,100 90,110 110,130"/>
      <path d="M-20,200 L-20,230 C-20,250 -10,260 0,260 C10,260 20,250 20,230 L20,200"/>
    </g>
  </svg>
);

const ENTRY_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;overflow:hidden;}
:root{
  --bg:#06070d;--s1:#0c0e18;--s2:#10121e;--s3:#161929;--s4:#1c2035;
  --acc:#e43531;--acc-lo:rgba(228,53,49,.09);--acc-glo:rgba(228,53,49,.28);
  --t1:#eef1f8;--t2:#8b95b0;--t3:#404866;
  --br:rgba(255,255,255,.10);
  --ui:'Outfit',sans-serif;--mono:'Space Mono',monospace;
}
.app-entry{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100%;width:100%;background:var(--bg);
  font-family:var(--ui);color:var(--t1);
  padding:0 32px;
  -webkit-user-select:none;user-select:none;
  position:relative;overflow:hidden;
}
/* Subtle radial glow behind the logo */
.app-entry::before{
  content:'';position:absolute;
  width:340px;height:340px;border-radius:50%;
  background:radial-gradient(circle,var(--acc-glo) 0%,transparent 70%);
  top:50%;left:50%;transform:translate(-50%,-62%);
  pointer-events:none;opacity:.45;
}
.entry-logo{position:relative;z-index:1;margin-bottom:16px;}
.entry-wordmark{
  position:relative;z-index:1;
  font-family:var(--ui);font-weight:700;font-size:32px;
  letter-spacing:4px;text-transform:uppercase;color:var(--t1);
  margin-bottom:8px;
}
.entry-tagline{
  position:relative;z-index:1;
  font-size:13px;color:var(--t2);font-weight:400;
  letter-spacing:.5px;margin-bottom:48px;
}
.entry-signin{
  position:relative;z-index:1;
  width:100%;max-width:320px;
  padding:16px 0;border:none;border-radius:12px;
  background:var(--acc);color:#fff;
  font-family:var(--ui);font-weight:600;font-size:16px;
  letter-spacing:.5px;cursor:pointer;
  transition:transform .15s,box-shadow .15s;
  box-shadow:0 0 24px var(--acc-glo);
}
.entry-signin:active{transform:scale(.97);box-shadow:0 0 12px var(--acc-glo);}
.entry-learn{
  position:relative;z-index:1;
  margin-top:20px;background:none;border:none;
  color:var(--t2);font-family:var(--ui);font-size:13px;
  cursor:pointer;text-decoration:none;
  letter-spacing:.3px;
  padding:8px 16px;
}
.entry-learn:active{color:var(--t1);}
/* Loading spinner */
@keyframes spin{to{transform:rotate(360deg)}}
.entry-loading{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100%;width:100%;background:var(--bg);
  font-family:var(--ui);color:var(--t2);font-size:13px;
}
.entry-spin{animation:spin .8s linear infinite;margin-bottom:12px;}
`;

export default function AppEntry() {
  const [authReady, setAuthReady] = useState(false);
  const [member, setMember] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 40; // 10 seconds

    function poll() {
      if (cancelled) return;
      if (window.$memberstackDom) {
        // SDK loaded — check current auth state
        window.$memberstackDom.getCurrentMember().then(({ data: m }) => {
          if (cancelled) return;
          if (m) {
            localStorage.setItem("jd_portal_active", "1");
            setMember(m);
          }
          setAuthReady(true);
        }).catch(() => {
          if (!cancelled) setAuthReady(true);
        });

        // Watch for auth changes (login / logout)
        window.$memberstackDom.onAuthChange((m) => {
          if (cancelled) return;
          if (m) {
            localStorage.setItem("jd_portal_active", "1");
            setMember(m);
          } else {
            localStorage.removeItem("jd_portal_active");
            setMember(null);
          }
        });
      } else {
        attempts++;
        if (attempts >= MAX_ATTEMPTS) {
          if (!cancelled) setAuthReady(true);
        } else {
          pollTimer = setTimeout(poll, 250);
        }
      }
    }

    poll();
    return () => { cancelled = true; if (pollTimer) clearTimeout(pollTimer); };
  }, []);

  /* ── Sign In → open Memberstack login modal ── */
  const openLogin = useCallback(() => {
    if (window.$memberstackDom?.openModal) {
      window.$memberstackDom.openModal("LOGIN");
    }
  }, []);

  /* ── Learn More → open job-dox.ai in external browser ── */
  const openLearnMore = useCallback(() => {
    window.open("https://job-dox.ai", "_blank");
  }, []);

  /* ── Loading state while polling for Memberstack SDK ── */
  if (!authReady) {
    return (
      <>
        <style>{ENTRY_CSS}</style>
        <div className="entry-loading">
          <svg className="entry-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2">
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
          </svg>
          Loading…
        </div>
      </>
    );
  }

  /* ── Authenticated → render full portal dashboard ── */
  if (member) {
    return (
      <Suspense fallback={
        <>
          <style>{ENTRY_CSS}</style>
          <div className="entry-loading">
            <svg className="entry-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="2">
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
            </svg>
            Loading…
          </div>
        </>
      }>
        <JobDoxPortal />
      </Suspense>
    );
  }

  /* ── Not logged in → native login screen ── */
  return (
    <>
      <style>{ENTRY_CSS}</style>
      <div className="app-entry">
        <div className="entry-logo"><CortexLogo /></div>
        <div className="entry-wordmark">Cortex</div>
        <div className="entry-tagline">Operations Intelligence</div>
        <button className="entry-signin" onClick={openLogin}>Sign In</button>
        <button className="entry-learn" onClick={openLearnMore}>Learn More</button>
      </div>
    </>
  );
}
