import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, User } from '../types';
import { sounds } from '../utils/audio';

interface BottomChatOverlayProps {
  currentUser: User;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onReportMessage: (messageId: string) => void;
  isDarkMode?: boolean;
}

export const BottomChatOverlay: React.FC<BottomChatOverlayProps> = ({
  currentUser,
  messages,
  onSendMessage,
  onReportMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [isChatBoxOpen, setIsChatBoxOpen] = useState(true);
  const [reportedIds, setReportedIds] = useState<{ [id: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat box when new messages arrive
  useEffect(() => {
    if (isChatBoxOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatBoxOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleReport = (id: string) => {
    sounds.playPop();
    setReportedIds(prev => ({ ...prev, [id]: true }));
    onReportMessage(id);
  };

  return (
    <>
      {/* 
        BOTTOM-LEFT CHAT COLUMN (Tataletak persis contoh gambar)
        Header: Obrolan · ruang 2 · 50 pesan [✕]
      */}
      {isChatBoxOpen ? (
        <div className="fixed bottom-20 left-3 sm:left-4 z-40 w-[calc(100vw-1.5rem)] sm:w-96 max-h-[240px] sm:max-h-[380px] flex flex-col rounded-2xl bg-[#0F172A]/95 backdrop-blur-md border border-slate-700/70 shadow-2xl overflow-hidden animate-fadeIn select-none">
          {/* Header */}
          <div className="px-3.5 py-2 sm:py-2.5 flex items-center justify-between border-b border-slate-800 text-xs text-slate-300 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white">Obrolan</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">ruang 2</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400 font-mono">{messages.length} pesan</span>
            </div>
            <button
              onClick={() => setIsChatBoxOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors text-xs"
              title="Tutup obrolan"
            >
              ✕
            </button>
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-2 sm:space-y-2.5 text-xs text-slate-200 no-scrollbar">
            {messages.length === 0 ? (
              <p className="text-center text-slate-500 py-6 text-xs">Belum ada obrolan.</p>
            ) : (
              messages.map((m) => {
                const username = `@${m.senderName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 14)}`;
                const isReported = m.reported || reportedIds[m.id];

                return (
                  <div
                    key={m.id}
                    className="flex items-start justify-between gap-2 hover:bg-white/5 p-1 rounded-lg transition-colors group"
                  >
                    <div className="flex-1 break-words leading-relaxed text-[11px] sm:text-xs">
                      <span className="font-bold text-emerald-400 mr-1.5 cursor-pointer hover:underline">
                        {username}
                      </span>
                      {m.senderRole === 'guru' && (
                        <span className="text-[8px] sm:text-[9px] font-bold px-1 rounded bg-amber-500 text-white mr-1.5">
                          GURU
                        </span>
                      )}
                      <span className={isReported ? 'line-through text-slate-500' : 'text-slate-200'}>
                        {m.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-500 shrink-0 select-none">
                      {m.senderId !== currentUser.id && (
                        <button
                          onClick={() => handleReport(m.id)}
                          className={`hover:text-red-400 transition-colors ${
                            isReported ? 'text-red-400' : 'opacity-0 group-hover:opacity-100'
                          }`}
                          title="Laporkan pesan"
                        >
                          ⚑
                        </button>
                      )}
                      <span className="font-mono">{m.timestamp || '23.35'}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      ) : (
        /* Minimized Chat Capsule button */
        <button
          onClick={() => setIsChatBoxOpen(true)}
          className="fixed bottom-20 left-3 sm:left-4 z-40 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-[#0F172A]/90 hover:bg-[#1E293B] text-white text-xs font-semibold shadow-xl border border-slate-700/70 backdrop-blur-md flex items-center gap-2 transition-all active:scale-95"
        >
          <span>💬</span>
          <span>Obrolan ({messages.length})</span>
        </button>
      )}

      {/* 
        BOTTOM-CENTER CHAT INPUT PILL (Tataletak persis contoh gambar)
        [ 💬 Ngobrol dengan warga di dekatmu ... (➤) ]
      */}
      <div className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-3 sm:px-4 pointer-events-none">
        <form
          onSubmit={handleSubmit}
          className="pointer-events-auto flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#16202F]/95 backdrop-blur-md border border-slate-700/80 shadow-2xl hover:border-slate-600 transition-all"
        >
          {/* Speech bubble icon on left */}
          <span className="text-slate-400 text-xs sm:text-sm">💬</span>

          {/* Text Input - text-base on mobile prevents iOS safari auto-zoom */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ngobrol dengan warga di dekatmu"
            className="flex-1 bg-transparent text-base sm:text-sm text-white placeholder-slate-400 focus:outline-none"
          />

          {/* Circular Green Send Button on right */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 flex items-center justify-center font-bold shadow-md transition-all active:scale-95 shrink-0"
            title="Kirim pesan"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
};
