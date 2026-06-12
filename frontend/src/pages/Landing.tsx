import { Link } from 'react-router-dom';
import { Briefcase, MessageSquare, Wand2, ArrowRight, Brain, Shield, TrendingUp } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Briefcase size={20} className="text-primary" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">AUTO CFO</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-zinc-400 hover:text-white text-sm font-medium transition-colors">Sign In</Link>
            <Link to="/register" className="btn-primary text-sm !py-2 !px-4">Get Started</Link>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8">
          <span className="text-primary text-xs font-medium uppercase tracking-wider">Code-Storm 26 — Fintech Track</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6 tracking-tight">
          Your Financial Twin.
          <br />
          <span className="text-primary">CFO-Level Insight.</span>
          <br />
          Zero Hassle.
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed">
          AUTO CFO is an AI-powered personal finance advisor that acts as your
          Financial Twin — a real-time digital replica of your financial life.
          No generic tips. Just your real numbers, your AI CFO.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/register" className="btn-primary text-lg !py-3 !px-8 flex items-center gap-2">
            Get Started Free <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <p className="text-zinc-500 uppercase text-sm tracking-widest mb-3">The Problem</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white max-w-2xl mx-auto">
            80% of people have no financial advisor.
          </h2>
          <p className="text-zinc-400 text-lg mt-4 max-w-xl mx-auto">
            CFO-level advice was only for the rich. AUTO CFO changes that.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="card text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Brain size={24} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Financial Twin</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              A living digital replica of your finances. Not a static dashboard — your complete financial DNA.
            </p>
          </div>
          <div className="card text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={24} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">AI CFO Chat</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Ask about your money and get answers with YOUR real numbers. Not generic tips — specific insights.
            </p>
          </div>
          <div className="card text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Wand2 size={24} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Scenario Simulator</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              "What if I save $200 more?" See the quantified impact on your goals. Make smarter money moves.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div>
              <p className="text-3xl font-bold text-primary">3 min</p>
              <p className="text-zinc-500 text-sm mt-1">Setup time</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">100%</p>
              <p className="text-zinc-500 text-sm mt-1">Free. No card needed.</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">AI-Powered</p>
              <p className="text-zinc-500 text-sm mt-1">Claude / GPT-4o</p>
            </div>
          </div>
          <Link to="/register" className="btn-primary text-lg !py-3 !px-10 inline-flex items-center gap-2">
            Start Your Financial Twin <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-zinc-600 text-sm">Built for Code-Storm 26 — Fintech Track. No bank APIs required. No credit card needed. Ever.</p>
        </div>
      </footer>
    </div>
  );
}
