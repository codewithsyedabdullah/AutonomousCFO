import { Link } from 'react-router-dom';
import { ArrowRight, Sun, Box, Star, Feather, Sparkles, Brain, MessageSquare, Wand2, Shield, TrendingUp } from 'lucide-react';

const logos = [
  { icon: Sun, name: 'Nebulon' },
  { icon: Box, name: 'Prismify' },
  { icon: Star, name: 'Nova Labs' },
  { icon: Feather, name: 'Zephyr' },
  { icon: Sparkles, name: 'Ignite' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[hsl(150,20%,5%)] flex flex-col relative overflow-visible" style={{ fontFamily: "'Instrument Serif', serif" }}>
      <video
        autoPlay loop muted playsInline
        className="fixed top-0 left-0 w-full h-full object-cover pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_094440_a3592600-bd1e-49e5-9bce-a73662061d83.mp4" type="video/mp4" />
      </video>

      <div className="relative z-10 flex flex-col min-h-screen overflow-visible">
        <nav className="flex items-center justify-between px-8 md:px-16 py-6 flex-shrink-0">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 10L14 30L20 16L26 30L32 10" stroke="hsl(45,30%,90%)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-lg tracking-wide text-[hsl(45,30%,90%)]" style={{ fontFamily: "'Instrument Serif', serif" }}>AUTO CFO</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              {['Dashboard', 'Transactions', 'Simulator', 'Chat'].map((link) => (
                <a key={link} href="#" className="text-base tracking-wide text-[hsl(45,30%,90%)] hover:opacity-80 transition-opacity">{link}</a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-base tracking-wide text-[hsl(45,30%,90%)] hover:opacity-80 transition-opacity">Sign In</Link>
            <Link to="/register" className="px-6 py-2 rounded-[43px] text-base bg-[hsl(45,70%,75%)] text-[hsl(150,20%,5%)] hover:opacity-90 transition-opacity font-medium">Get Started</Link>
          </div>
        </nav>

        <main className="flex-1 flex flex-col justify-between px-8 md:px-16 pb-10 overflow-visible">
          <div className="my-auto max-w-3xl overflow-visible">
            <h1 className="text-6xl md:text-8xl lg:text-[7rem] leading-[0.95] tracking-tight text-[hsl(45,30%,90%)] mb-12 overflow-visible">
              Own the future of<br />your{' '}
              <span className="relative inline-block overflow-visible">
                assets.
                <span className="absolute inset-0 text-white blur-sm" style={{ color: 'hsl(0,0%,100%)', WebkitMaskImage: 'linear-gradient(to bottom left, white 25%, transparent 55%)', maskImage: 'linear-gradient(to bottom left, white 25%, transparent 55%)' }} aria-hidden="true">assets.</span>
                <span className="absolute inset-0 text-white blur-md opacity-60" style={{ color: 'hsl(0,0%,100%)', WebkitMaskImage: 'linear-gradient(to bottom left, white 20%, transparent 50%)', maskImage: 'linear-gradient(to bottom left, white 20%, transparent 50%)' }} aria-hidden="true">assets.</span>
              </span>
            </h1>

            <Link
              to="/register"
              className="relative inline-flex items-center gap-3 px-10 py-4 rounded-[43px] text-xl font-medium overflow-hidden transition-transform hover:scale-105"
              style={{ backgroundColor: 'hsl(45,70%,75%)', color: 'hsl(150,20%,5%)', boxShadow: '0px 4px 95px 4px hsla(45,70%,50%,0.6)' }}
            >
              <span className="absolute w-48 h-10 rounded-full blur-xl" style={{ backgroundColor: 'hsl(45,60%,95%)', top: '-12px', left: '50%', transform: 'translateX(-50%)' }} />
              <span className="relative z-10">Launch Your Financial Twin</span>
              <ArrowRight size={20} className="relative z-10" />
            </Link>
          </div>

          <div className="mt-auto w-full md:w-1/2 lg:w-1/2">
            <p className="text-[hsl(45,30%,90%/0.5)] text-base mb-5 text-left" style={{ color: 'hsla(45,30%,90%,0.5)' }}>Trusted by top builders</p>
            <div className="overflow-hidden">
              <div className="flex marquee">
                {[...logos, ...logos].map((logo, i) => {
                  const Icon = logo.icon;
                  return (
                    <div key={i} className="flex items-center gap-3 mx-6 flex-shrink-0">
                      <Icon size={24} className="text-[hsl(45,30%,90%/0.6)]" style={{ color: 'hsla(45,30%,90%,0.6)' }} />
                      <span className="text-2xl tracking-wide whitespace-nowrap" style={{ color: 'hsla(45,30%,90%,0.6)' }}>{logo.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>

      <section className="relative z-10 border-t border-zinc-800/50 py-20 px-8 md:px-16" style={{ backgroundColor: 'hsla(150,20%,3%,0.8)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[hsl(45,70%,75%)] uppercase text-sm tracking-widest mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>The Problem</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[hsl(45,30%,90%)] max-w-2xl mx-auto" style={{ fontFamily: "'Instrument Serif', serif" }}>
              80% of people have no financial advisor.
            </h2>
            <p className="text-[hsl(45,30%,90%/0.6)] text-lg mt-4 max-w-xl mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
              CFO-level advice was only for the rich. AUTO CFO changes that.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: 'Financial Twin', desc: 'A living digital replica of your finances. Not a static dashboard — your complete financial DNA.' },
              { icon: MessageSquare, title: 'AI CFO Chat', desc: 'Ask about your money and get answers with YOUR real numbers. Not generic tips — specific insights.' },
              { icon: Wand2, title: 'Scenario Simulator', desc: '"What if I save $200 more?" See the quantified impact on your goals. Make smarter money moves.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center p-8 rounded-2xl border border-zinc-800/50" style={{ backgroundColor: 'hsla(150,20%,8%,0.6)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'hsla(45,70%,75%,0.15)' }}>
                  <Icon size={24} style={{ color: 'hsl(45,70%,75%)' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(45,30%,90%)', fontFamily: "'Instrument Serif', serif" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'hsla(45,30%,90%,0.6)', fontFamily: 'Inter, sans-serif' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-zinc-800/50 py-16 px-8 md:px-16" style={{ backgroundColor: 'hsla(150,20%,3%,0.8)' }}>
        <div className="max-w-7xl mx-auto text-center">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              { value: '3 min', label: 'Setup time' },
              { value: '100%', label: 'Free. No card needed.' },
              { value: 'AI-Powered', label: 'Groq LLM + RAG' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-bold" style={{ color: 'hsl(45,70%,75%)', fontFamily: "'Instrument Serif', serif" }}>{value}</p>
                <p className="text-sm mt-1" style={{ color: 'hsla(45,30%,90%,0.4)', fontFamily: 'Inter, sans-serif' }}>{label}</p>
              </div>
            ))}
          </div>
          <Link to="/register" className="relative inline-flex items-center gap-2 px-10 py-4 rounded-[43px] text-lg font-medium overflow-hidden transition-transform hover:scale-105" style={{ backgroundColor: 'hsl(45,70%,75%)', color: 'hsl(150,20%,5%)', boxShadow: '0px 4px 95px 4px hsla(45,70%,50%,0.6)' }}>
            <span className="absolute w-48 h-10 rounded-full blur-xl" style={{ backgroundColor: 'hsl(45,60%,95%)', top: '-12px', left: '50%', transform: 'translateX(-50%)' }} />
            <span className="relative z-10">Start Your Financial Twin</span>
            <ArrowRight size={20} className="relative z-10" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-zinc-800/50 py-8 px-8 md:px-16" style={{ backgroundColor: 'hsla(150,20%,3%,0.8)' }}>
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm" style={{ color: 'hsla(45,30%,90%,0.3)', fontFamily: 'Inter, sans-serif' }}>Built for Code-Storm 26 — Fintech Track. No bank APIs required. No credit card needed. Ever.</p>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee {
          animation: marquee 20s linear infinite;
          width: fit-content;
        }
      `}</style>
    </div>
  );
}
