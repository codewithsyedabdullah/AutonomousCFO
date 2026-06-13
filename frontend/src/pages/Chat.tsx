import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, AlertCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m your AI CFO. Ask me anything about your finances — spending, savings, goals, or what-if scenarios.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: userMsg.content })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Chat request failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const assistantMsg: Message = { role: 'assistant', content: '' };
      setMessages((prev) => [...prev, assistantMsg]);

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || parsed.content || '';
              if (content) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === 'assistant') {
                    last.content += content;
                  }
                  return updated;
                });
              }
            } catch {
              if (data) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last.role === 'assistant') {
                    last.content += data;
                  }
                  return updated;
                });
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get response');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessage = (content: string) => {
    const formatted = content
      .replace(/\[⚠ ALERT\]/g, '')
      .replace(/\[SAVE MONEY\]/g, '')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-zinc-300">$1</em>')
      .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-black/40 text-zinc-300 p-3 rounded-lg my-2 text-xs overflow-x-auto font-mono">$2</pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-black/40 text-primary text-xs px-1 py-0.5 rounded">$1</code>')
      .replace(/^- (.+)$/gm, '<li class="text-zinc-300 ml-4 list-disc">$1</li>')
      .replace(/\n/g, '<br />');
    return formatted;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div>
        <h1 className="text-2xl font-bold text-white">AI CFO Chat</h1>
        <p className="text-zinc-400 text-sm mt-1">Ask your Financial Twin anything</p>
      </div>

      <div className="flex-1 card mt-6 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scroll-smooth">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-primary/20' : 'bg-zinc-800'
                }`}>
                  {msg.role === 'user' ? (
                    <User size={16} className="text-primary" />
                  ) : (
                    <Bot size={16} className="text-zinc-400" />
                  )}
                </div>
                <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary/10 text-zinc-200 border border-primary/20'
                    : 'bg-zinc-800/50 text-zinc-300 border border-zinc-800'
                }`}>
                  <span dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Bot size={16} className="text-zinc-400" />
                </div>
                <div className="bg-zinc-800/50 border border-zinc-800 rounded-xl px-4 py-3">
                  <Loader2 size={18} className="animate-spin text-primary" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-2">
                <AlertCircle size={16} /> {error}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-zinc-800">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="input-field flex-1"
            placeholder="Ask about your finances..."
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="btn-primary !p-3 !rounded-xl"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
