
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants.js';
import { askAssistant } from '../services/gemini.js';

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
  }, [messages, isOpen]);

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
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 md:bottom-10 right-4 md:right-10 w-14 h-14 md:w-16 md:h-16 rounded-full assistant-gradient text-white shadow-2xl z-[150] flex items-center justify-center active-scale transition-all border-4 border-white"
      >
        {isOpen ? <span className="text-xl">&times;</span> : <Icons.Sparkles />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-28 md:right-10 w-full md:w-[400px] h-full md:h-[600px] bg-white md:bg-white/80 md:backdrop-blur-xl md:rounded-[40px] shadow-2xl z-[160] flex flex-col overflow-hidden animate-card border-none md:border md:border-white/50">
          <header className="px-6 py-5 md:py-6 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl assistant-gradient flex items-center justify-center text-white"><Icons.Sparkles /></div>
              <div>
                <h3 className="text-sm font-black text-slate-900 leading-none">AI Assistant</h3>
                <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest mt-1">Intelligence Active</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-300 md:hidden text-2xl font-light">&times;</button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 no-scrollbar bg-slate-50/20">
            {messages.length === 0 && (
              <div className="text-center py-20 px-10">
                <p className="text-slate-400 text-xs leading-relaxed font-medium">
                  I am your exclusive Second Brain. You can ask anything about your notes, or let me summarize them for you.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-4 rounded-[20px] text-sm md:text-[15px] leading-relaxed shadow-sm ${
                  msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-4 rounded-[20px] rounded-tl-none flex gap-1.5 items-center">
                  <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          <footer className="p-4 md:p-6 bg-white border-t border-slate-50 pb-safe-area">
            <div className="relative">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-5 pr-14 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
              <button 
                onClick={handleSend}
                disabled={!query.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-indigo-500 disabled:text-slate-200 transition-all active-scale"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
              </button>
            </div>
          </footer>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;
