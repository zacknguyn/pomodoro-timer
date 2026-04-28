import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const LoginScreen = () => {
  const container = useRef();

  useGSAP(() => {
    const tl = gsap.timeline();
    
    tl.from('.constellation-dot', {
      scale: 0,
      opacity: 0,
      duration: 2,
      stagger: { amount: 1.5, from: "center" },
      ease: 'power4.out'
    });

    tl.from('.content-reveal', {
      y: 40,
      opacity: 0,
      stagger: 0.1,
      duration: 1.2,
      ease: 'expo.out'
    }, "-=1.5");
  }, { scope: container });

  return (
    <div ref={container} className="w-screen h-screen bg-mc-cream flex font-body overflow-hidden relative">
      
      {/* Left Side: Editorial Media */}
      <div className="vt-auth-media relative w-1/2 hidden lg:block overflow-hidden bg-mc-ink">
        <img 
          src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80" 
          alt="Workspace" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-mc-ink via-transparent to-transparent" />
        
        <div className="vt-logo absolute top-16 left-16">
           <div className="flex items-center gap-3">
              <div className="flex -space-x-4">
                <div className="w-10 h-10 rounded-full bg-[#EB001B]/90 blur-[1px]" />
                <div className="w-10 h-10 rounded-full bg-[#F79E1B]/90 blur-[1px]" />
              </div>
              <span className="text-white mc-display text-2xl tracking-tighter">THE REGISTRY</span>
           </div>
        </div>

        <div className="absolute bottom-16 left-16">
          <h2 className="mc-display text-[72px] text-white tracking-[-0.04em] leading-[0.9] mb-8">
            The standard <br/> for global <br/> excellence.
          </h2>
          <p className="mc-body text-[12px] font-bold text-white/30 uppercase tracking-[0.4em]">
            Institutional Grade &bull; EST 2026
          </p>
        </div>
      </div>

      {/* Right Side: Auth Panel */}
      <div className="vt-auth-form w-full lg:w-1/2 h-full flex flex-col items-center justify-center p-8 lg:p-24 bg-white relative overflow-hidden">
        
        {/* Dots */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-full h-full flex items-center justify-center">
            {[...Array(120)].map((_, i) => {
              const angle = (i / 120) * Math.PI * 2;
              const distance = 200 + (i % 15) * 25;
              const size = 1 + (i % 10);
              return (
                <div key={i} className="constellation-dot absolute bg-mc-orange rounded-full"
                  style={{ width: `${size}px`, height: `${size}px`, opacity: 0.05 + (i % 5) * 0.03,
                    left: `calc(50% + ${Math.cos(angle) * distance}px)`,
                    top: `calc(50% + ${Math.sin(angle) * distance}px)` }}
                />
              );
            })}
          </div>
        </div>

        <div className="w-full max-w-sm relative z-10">
          <div className="content-reveal mb-16">
            <h1 className="mc-display text-[48px] text-mc-ink tracking-[-0.03em] mb-4">Access</h1>
            <p className="mc-body text-[18px] text-muted">Authenticate to enter the secure workspace.</p>
          </div>

          <form className="space-y-10">
            <div className="content-reveal">
              <label className="block mc-body text-[11px] font-bold text-mc-ink uppercase tracking-[0.2em] mb-4 flex items-center">
                <span className="w-2 h-2 rounded-full bg-mc-orange mr-2"></span> Registry ID
              </label>
              <input type="email" placeholder="name@institution.com" className="w-full bg-white border border-mc-ink/10 rounded-full px-8 py-5 text-[16px] mc-body text-mc-ink focus:outline-none focus:border-mc-ink shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all" />
            </div>
            <div className="content-reveal">
              <label className="block mc-body text-[11px] font-bold text-mc-ink uppercase tracking-[0.2em] mb-4 flex items-center">
                <span className="w-2 h-2 rounded-full bg-mc-orange mr-2"></span> Access Key
              </label>
              <input type="password" placeholder="••••••••" className="w-full bg-white border border-mc-ink/10 rounded-full px-8 py-5 text-[16px] mc-body text-mc-ink focus:outline-none focus:border-mc-ink shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all" />
            </div>
            <div className="content-reveal pt-6">
              <button type="submit" className="w-full bg-mc-ink text-mc-cream rounded-[20px] py-6 text-[16px] font-medium hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] active:scale-[0.98] transition-all">Authenticate</button>
            </div>
          </form>

          <div className="content-reveal mt-16 text-center">
            <p className="mc-body text-[15px] text-muted">
              New to the Registry?{' '}
              <Link viewTransition to="/register" className="text-mc-ink font-bold hover:underline underline-offset-8 decoration-2 decoration-mc-orange">
                Register Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
