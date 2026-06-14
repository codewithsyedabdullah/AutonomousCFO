import { useState, useEffect, FormEvent, useRef } from 'react';
import { Download, MessageSquare, Save, AlertTriangle, CheckCircle, FileText, Bot, User, Loader2, Receipt, Landmark } from 'lucide-react';
import client from '../api/client';

interface TaxSummary {
  taxYear: number;
  country: string;
  grossIncome: number;
  additionalIncome: number;
  totalIncome: number;
  totalDeductions: number;
  extraDeductions: number;
  taxableIncome: number;
  taxLiability: number;
  effectiveRate: number;
  alreadyWithheld: number;
  refundOrOwed: number;
  deductionBreakdown: { category: string; amount: number; deductible: boolean; fbrSection: string }[];
  missedDeductions: string[];
  filingStatus: string | null;
  dependents: number;
}

interface TaxProfile {
  cnic: string;
  filingStatus: string;
  dependents: number;
  additionalIncome: number;
  extraDeductions: number;
  exemptionClaims: string;
  country: string;
}

export default function Tax() {
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [profile, setProfile] = useState<TaxProfile>({
    cnic: '', filingStatus: 'individual', dependents: 0,
    additionalIncome: 0, extraDeductions: 0, exemptionClaims: '', country: 'PK',
  });
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [error, setError] = useState('');

  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: 'I\'m your AI Tax Lawyer. Ask me about deductions, tax slabs, FBR filing, or any Pakistan tax question.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const formatTaxMessage = (content: string) => {
    return content
      .replace(/\[.*?\]/g, '')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-zinc-300">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-black/40 text-primary text-xs px-1 py-0.5 rounded">$1</code>')
      .replace(/^- (.+)$/gm, '<li class="text-zinc-300 ml-4 list-disc">$1</li>')
      .replace(/\n/g, '<br />');
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryRes, profileRes] = await Promise.all([
        client.get('/tax/summary'),
        client.get('/tax/profile'),
      ]);
      setSummary(summaryRes.data);
      if (profileRes.data && profileRes.data.cnic !== undefined) {
        setProfile({
          cnic: profileRes.data.cnic || '',
          filingStatus: profileRes.data.filingStatus || 'individual',
          dependents: profileRes.data.dependents || 0,
          additionalIncome: profileRes.data.additionalIncome || 0,
          extraDeductions: profileRes.data.extraDeductions || 0,
          exemptionClaims: profileRes.data.exemptionClaims || '',
          country: profileRes.data.country || 'PK',
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load tax data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setError('');
    try {
      await client.post('/tax/profile', profile);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    setPdfGenerating(true);
    setError('');
    try {
      const res = await client.post('/tax/generate-pdf', {}, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `autocfo-tax-summary-${summary?.taxYear || 2025}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to generate PDF');
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: chatInput.trim() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await client.post('/tax/chat', { message: userMsg.content });
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I could not process that request. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const formatCurrency = (v: number) => 'PKR ' + Math.round(v).toLocaleString();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Receipt size={18} className="text-amber-400 sm:w-[22px] sm:h-[22px]" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-white">Tax Module</h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-0.5 sm:mt-1">Tax Year {summary?.taxYear || 2025} — FBR Pakistan</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium bg-amber-900/30 text-amber-400 border border-amber-800/50 self-start sm:self-auto">
          <Landmark size={12} /> New
        </span>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <SummaryCard label="Gross Income" value={formatCurrency(summary.grossIncome)} />
            <SummaryCard label="Total Deductions" value={formatCurrency(summary.totalDeductions)} color="text-success" />
            <SummaryCard label="Taxable Income" value={formatCurrency(summary.taxableIncome)} color="text-warning" />
            <SummaryCard label="Tax Liability" value={formatCurrency(summary.taxLiability)} color="text-danger" />
            <SummaryCard label="Effective Rate" value={`${summary.effectiveRate}%`} color="text-primary" />
            <SummaryCard
              label={summary.refundOrOwed >= 0 ? 'Refund' : 'You Owe'}
              value={formatCurrency(Math.abs(summary.refundOrOwed))}
              color={summary.refundOrOwed >= 0 ? 'text-success' : 'text-danger'}
            />
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Deductions Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 text-left">
                    <th className="pb-3 text-xs text-zinc-500 font-medium uppercase tracking-wider px-3">Category</th>
                    <th className="pb-3 text-xs text-zinc-500 font-medium uppercase tracking-wider px-3">Amount (PKR)</th>
                    <th className="pb-3 text-xs text-zinc-500 font-medium uppercase tracking-wider px-3">Deductible</th>
                    <th className="pb-3 text-xs text-zinc-500 font-medium uppercase tracking-wider px-3">FBR Section</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.deductionBreakdown.map((row) => (
                    <tr key={row.category} className="border-b border-zinc-800/50">
                      <td className="py-3 px-3 text-zinc-200">{row.category}</td>
                      <td className="py-3 px-3 text-zinc-200">{Math.round(row.amount).toLocaleString()}</td>
                      <td className="py-3 px-3">
                        {row.deductible ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">
                            <CheckCircle size={12} /> Deductible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                            Non-deductible
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-zinc-400 text-sm">{row.fbrSection}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {summary.missedDeductions.length > 0 && (
              <div className="mt-4 bg-amber-900/20 border border-amber-800/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                  <AlertTriangle size={14} /> Missed Deductions Spotted
                </h4>
                <ul className="space-y-1">
                  {summary.missedDeductions.map((hint, i) => (
                    <li key={i} className="text-sm text-amber-300/80 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {hint}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}

      <div className="card">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Tax Profile</h3>
        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">CNIC / NTN Number</label>
            <input type="text" value={profile.cnic} onChange={(e) => setProfile({ ...profile, cnic: e.target.value })}
              className="input-field" placeholder="XXXXX-XXXXXXX-X" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Filing Status</label>
            <select value={profile.filingStatus} onChange={(e) => setProfile({ ...profile, filingStatus: e.target.value })} className="input-field">
              <option value="individual">Individual</option>
              <option value="salaried">Salaried</option>
              <option value="business">Business / Freelance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Dependents</label>
            <input type="number" min="0" value={profile.dependents}
              onChange={(e) => setProfile({ ...profile, dependents: parseInt(e.target.value) || 0 })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Additional Income (PKR)</label>
            <input type="number" min="0" value={profile.additionalIncome}
              onChange={(e) => setProfile({ ...profile, additionalIncome: parseFloat(e.target.value) || 0 })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Extra Deductions (PKR)</label>
            <input type="number" min="0" value={profile.extraDeductions}
              onChange={(e) => setProfile({ ...profile, extraDeductions: parseFloat(e.target.value) || 0 })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Exemption Claims</label>
            <input type="text" value={profile.exemptionClaims} onChange={(e) => setProfile({ ...profile, exemptionClaims: e.target.value })}
              className="input-field" placeholder="e.g. Agriculture income" />
          </div>
          <div className="md:col-span-2 lg:col-span-3 flex justify-end">
            <button type="submit" disabled={profileSaving} className="btn-primary flex items-center gap-2">
              <Save size={16} /> {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <MessageSquare size={16} className="text-primary" /> AI Tax Lawyer
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {['What deductions am I missing?', 'Which tax slab am I in?', 'How do I file on FBR IRIS?', 'Can I claim my laptop?'].map((q) => (
            <button key={q} onClick={() => { setChatInput(q); }}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-full transition-colors">
              {q}
            </button>
          ))}
        </div>
        <div className="h-48 sm:h-64 overflow-y-auto space-y-2 sm:space-y-3 mb-4 p-2 sm:p-3 bg-black/20 rounded-lg">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2 max-w-[90%] sm:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-primary/20' : 'bg-zinc-800'}`}>
                  {msg.role === 'user' ? <User size={11} className="text-primary" /> : <Bot size={11} className="text-zinc-400" />}
                </div>
                <div className={`rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-primary/10 text-zinc-200 border border-primary/20' : 'bg-zinc-800/50 text-zinc-300 border border-zinc-800'
                }`}>
                  {msg.role === 'user' ? msg.content : <span dangerouslySetInnerHTML={{ __html: formatTaxMessage(msg.content) }} />}
                </div>
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-800/50 border border-zinc-800 rounded-xl px-3 py-2">
                <Loader2 size={14} className="animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
            className="input-field flex-1 resize-none !min-h-[40px] sm:!min-h-[44px] !py-2 sm:!py-3 text-xs sm:text-sm" placeholder="Ask your tax lawyer..." disabled={chatLoading} rows={1} />
          <button onClick={handleChatSend} disabled={!chatInput.trim() || chatLoading}
            className="btn-primary !p-2 sm:!p-2.5 !rounded-lg"><MessageSquare size={16} /></button>
        </div>
      </div>

      <div className="card border-amber-800/30 bg-amber-900/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <FileText size={24} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Download Tax Return Summary</h3>
            <p className="text-sm text-zinc-400 mt-1">A completed tax summary document ready for FBR IRIS filing. Verify with a professional before submitting.</p>
          </div>
          <button onClick={handleGeneratePdf} disabled={pdfGenerating} className="btn-primary flex items-center gap-2 !py-3 !px-6">
            {pdfGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {pdfGenerating ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-zinc-600 py-2">
        AUTO CFO Tax Module — For reference only. Verify all figures with a licensed tax professional before filing.
        This tool does not submit returns to FBR or any tax authority.
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <div className="card text-center">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
