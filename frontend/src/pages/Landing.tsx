import { Link } from 'react-router-dom';
import { ArrowRight, Brain, MessageSquare, Wand2 } from 'lucide-react';

export default function Landing() {
  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ backgroundColor: '#F5F3EE', fontFamily: 'Inter, sans-serif' }}>
      <video
        autoPlay loop muted playsInline
        className="fixed top-0 left-0 w-full h-full object-cover pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_102305_3a7cab3b-7a86-46e8-a0f9-6937f035b087.mp4" type="video/mp4" />
      </video>

      <header className="relative px-6 lg:px-12 py-4 lg:py-6 flex-shrink-0" style={{ zIndex: 10 }}>
        <nav className="flex items-center justify-between">
          <Link to="/" className="text-2xl lg:text-3xl font-bold text-black">AUTO CFO</Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 lg:px-6 py-2 text-base lg:text-lg text-black hover:text-black/70 transition">Sign In</Link>
            <Link to="/register" className="px-4 lg:px-6 py-2 bg-black text-white text-base lg:text-lg hover:bg-gray-800 transition rounded-full">Get Started</Link>
          </div>
        </nav>
      </header>

      <main className="relative px-6 lg:px-12 py-6 lg:py-8 flex-1 flex flex-col justify-between" style={{ zIndex: 10 }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div>
            <h1 className="text-5xl sm:text-6xl lg:text-6xl xl:text-7xl font-normal text-black leading-[0.80] tracking-tight mb-4 lg:mb-5" style={{ fontFamily: 'Anton, sans-serif' }}>
              YOUR FINANCIAL
              <br />
              TWIN.
              <br />
              AI-POWERED.
            </h1>
            <p className="text-lg lg:text-xl mb-4 lg:mb-5 max-w-md" style={{ color: '#080808' }}>
              CFO-level insight for everyone. Your real numbers, your personal AI advisor — no generic tips.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-3 pl-8 pr-1.5 py-1.5 bg-black text-white rounded-full hover:bg-gray-800 transition text-base lg:text-lg"
            >
              Start today <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><ArrowRight size={18} className="text-black" /></span>
            </Link>
          </div>
          <div className="text-right">
            <h2 className="text-5xl sm:text-6xl lg:text-6xl xl:text-7xl font-normal text-black leading-[0.80] tracking-tight mb-3" style={{ fontFamily: 'Anton, sans-serif' }}>
              3 MIN SETUP
            </h2>
            <p className="text-base lg:text-lg" style={{ color: '#080808' }}>
              No bank APIs. No credit card. 100% free.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-8">
          <div>
            <p className="text-base lg:text-lg leading-relaxed mb-4" style={{ color: '#080808' }}>
              Built for Code-Storm 26 — your financial twin that tracks spending, predicts scenarios, and gives CFO-level advice through AI chat.
            </p>
            <div className="flex items-center gap-4">
              {['Finance', 'Instagram', 'YouTube'].map((s) => (
                <span key={s} className="text-sm font-medium" style={{ color: '#080808' }}>{s}</span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-5xl sm:text-6xl lg:text-6xl xl:text-7xl font-normal text-black leading-[0.80] tracking-tight mb-3" style={{ fontFamily: 'Anton, sans-serif' }}>
              AI-POWERED
            </h2>
            <p className="text-base lg:text-lg" style={{ color: '#080808' }}>
              Groq LLM • Real-time insights • Tax filing
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 mt-8">
          {[
            { name: 'Dashboard', desc: 'Real-time net worth & health' },
            { name: 'AI Chat', desc: 'Talk to your financial twin' },
            { name: 'Simulator', desc: '"What if" scenario planner' },
            { name: 'Goals', desc: 'Track & hit targets' },
            { name: 'Tax', desc: 'FBR Pakistan filing' },
            { name: 'Upload', desc: 'CSV / PDF / DOCX import' },
          ].map(({ name, desc }) => (
            <div key={name} className="rounded-lg p-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
              <p className="font-semibold text-sm" style={{ color: '#080808' }}>{name}</p>
              <p className="text-xs mt-1" style={{ color: '#666' }}>{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
