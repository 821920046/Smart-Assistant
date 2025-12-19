
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';
import { askAssistant } from '../services/gemini';

interface ChatAssistantProps {
  contextMemos: string[];
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ contextMemos }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!query.trim() || isLoading) return;
    
    const userQuery = query.trim();
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
    setIsLoading(true);

    try {
      const response = await askAssistant(userQuery, contextMemos);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-10 right-10 w-16 h-16 rounded-full assistant-gradient text-white shadow-2xl z-[150] flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-white"
      >
        {isOpen ? <span className="text-2xl">&times;</span> : <Icons.Sparkles />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-28 right-6 md:right-10 w-[calc(100vw-48px)] md:w-[400px] h-[500px] glass rounded-[40px] shadow-2xl z-[150] flex flex-col overflow-hidden border border-white/60 animate-card">
          <header className="p-6 border-b border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl assistant-gradient flex items-center justify-center text-white">
              <Icons.Sparkles />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">AI 笔记助手</h3>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Semantic Context Active</p>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-slate-50/20">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <p className="text-slate-400 text-xs font-medium px-10 leading-relaxed">
                  我是你的私人笔记管家。你可以问我关于你笔记里的任何事情。
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-[24px] text-sm leading-relaxed ${
                  msg.role === 'user' 
                  ? 'bg-slate-900 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-100 text-slate-800 shadow-sm rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-4 rounded-[24px] rounded-tl-none shadow-sm flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          <footer className="p-4 bg-white border-t border-slate-100">
            <div className="relative">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="询问你的笔记..."
                className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
              />
              <button 
                onClick={handleSend}
                disabled={!query.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-500 hover:text-indigo-600 disabled:text-slate-300 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </footer>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;
