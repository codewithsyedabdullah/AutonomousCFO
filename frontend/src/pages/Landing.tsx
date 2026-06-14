import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-visible" style={{ backgroundColor: 'hsl(150,20%,5%)', fontFamily: "'Inter', sans-serif" }}>
      <video
        autoPlay loop muted playsInline
        className="fixed top-0 left-0 w-full h-full object-cover pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_094440_a3592600-bd1e-49e5-9bce-a73662061d83.mp4" type="video/mp4" />
      </video>

      <div className="relative z-10 flex flex-col min-h-screen overflow-visible">
        <nav className="flex items-center justify-between px-4 sm:px-8 md:px-16 py-4 sm:py-6 flex-shrink-0">
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2">
            <svg width="clamp(28px,5vw,40px)" height="clamp(28px,5vw,40px)" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 10L14 30L20 16L26 30L32 10" stroke="hsl(45,30%,90%)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm sm:text-base md:text-lg tracking-wide" style={{ color: 'hsl(45,30%,90%)', fontFamily: "'Inter', sans-serif" }}>AUTO CFO</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/login" className="text-xs sm:text-sm md:text-base tracking-wide transition-opacity hover:opacity-80" style={{ color: 'hsl(45,30%,90%)' }}>Sign In</Link>
            <Link to="/register" className="px-3 sm:px-5 md:px-6 py-1.5 sm:py-2 rounded-[43px] text-xs sm:text-sm md:text-base font-medium transition-transform hover:scale-105" style={{ backgroundColor: 'hsl(45,70%,75%)', color: 'hsl(150,20%,5%)' }}>Get Started</Link>
          </div>
        </nav>

        <main className="flex-1 flex flex-col justify-center px-4 sm:px-8 md:px-16 pb-6 sm:pb-10 overflow-visible">
          <div className="max-w-3xl overflow-visible">
            <h1 className="text-[clamp(2.2rem,8vw,7rem)] leading-[0.95] tracking-tight mb-6 sm:mb-8 md:mb-12 overflow-visible" style={{ color: 'hsl(45,30%,90%)', fontFamily: "'Anton', sans-serif" }}>
              OWN THE FUTURE<br />OF YOUR{' '}
              <span className="relative inline-block overflow-visible">
                ASSETS.
                <span className="absolute inset-0 blur-sm" style={{ color: 'hsl(0,0%,100%)', WebkitMaskImage: 'linear-gradient(to bottom left, white 25%, transparent 55%)', maskImage: 'linear-gradient(to bottom left, white 25%, transparent 55%)' }} aria-hidden="true">ASSETS.</span>
                <span className="absolute inset-0 blur-md opacity-60" style={{ color: 'hsl(0,0%,100%)', WebkitMaskImage: 'linear-gradient(to bottom left, white 20%, transparent 50%)', maskImage: 'linear-gradient(to bottom left, white 20%, transparent 50%)' }} aria-hidden="true">ASSETS.</span>
              </span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg xl:text-xl max-w-xl mb-4 sm:mb-6 md:mb-8" style={{ color: 'hsla(45,30%,90%,0.7)' }}>
              CFO-level insight for everyone. Your real numbers, your personal AI advisor — no generic tips.
            </p>
            <Link
              to="/register"
              className="relative inline-flex items-center gap-2 sm:gap-3 px-5 sm:px-8 md:px-10 py-2.5 sm:py-3 md:py-4 rounded-[43px] text-sm sm:text-base md:text-lg xl:text-xl font-medium overflow-hidden transition-transform hover:scale-105"
              style={{ backgroundColor: 'hsl(45,70%,75%)', color: 'hsl(150,20%,5%)', boxShadow: '0px 4px 95px 4px hsla(45,70%,50%,0.6)' }}
            >
              <span className="absolute w-48 h-10 rounded-full blur-xl" style={{ backgroundColor: 'hsl(45,60%,95%)', top: '-12px', left: '50%', transform: 'translateX(-50%)' }} />
              <span className="relative z-10">Launch Your Financial Twin</span>
              <ArrowRight size={20} className="relative z-10 w-4 sm:w-5" />
            </Link>
          </div>
        </main>
      </div>

      <section className="relative z-10 py-10 sm:py-16 md:py-20 px-4 sm:px-8 md:px-16" style={{ backgroundColor: 'hsla(150,20%,3%,0.9)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
            {[
              { value: '3 min', label: 'Setup time' },
              { value: '100%', label: 'Free. No card needed.' },
              { value: 'AI-Powered', label: 'Groq LLM + RAG' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center p-4 sm:p-6 md:p-8 rounded-2xl border" style={{ borderColor: 'hsla(45,30%,90%,0.06)', backgroundColor: 'hsla(150,20%,10%,0.6)' }}>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2" style={{ color: 'hsl(45,70%,75%)', fontFamily: "'Anton', sans-serif" }}>{value}</p>
                <p className="text-xs sm:text-sm" style={{ color: 'hsla(45,30%,90%,0.5)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t py-4 sm:py-6 md:py-8 px-4 sm:px-8 md:px-16" style={{ borderColor: 'hsla(45,30%,90%,0.06)', backgroundColor: 'hsla(150,20%,3%,0.9)' }}>
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[10px] sm:text-xs md:text-sm" style={{ color: 'hsla(45,30%,90%,0.3)' }}>Built for Code-Storm 26 — Fintech Track. No bank APIs required. No credit card needed. Ever.</p>
        </div>
      </footer>
    </div>
  );
}
