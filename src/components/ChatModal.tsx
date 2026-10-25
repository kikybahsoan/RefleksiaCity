import React, { useState, useEffect } from 'react';
import { User, ChatMessage } from '../types';
import { api } from '../services/api';
import { sounds } from '../utils/audio';
import { filterProfanity } from '../utils/filter';

interface ChatModalProps {
  currentUser: User;
  onClose: () => void;
  isDarkMode: boolean;
}

export const ChatModal: React.FC<ChatModalProps> = ({ currentUser, onClose, isDarkMode }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<'kafe' | 'alunalun'>('kafe');
  const [reportedId, setReportedId] = useState<string | null>(null);

  const loadChat = async () => {
    const msgs = await api.getChatMessages(selectedRoom);
    setMessages(msgs);
  };

  useEffect(() => {
    loadChat();
    // 5-second polling interval as requested in prompt
    const interval = setInterval(loadChat, 5000);
    return () => clearInterval(interval);
  }, [selectedRoom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const { cleanText } = filterProfanity(inputVal);
    const newMsg = await api.sendChatMessage({
      room: selectedRoom,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text: cleanText,
    });

    sounds.playPop();
    setMessages(prev => [...prev, newMsg]);
    setInputVal('');
  };

  const handleReport = async (msgId: string) => {
    await api.reportChatMessage(msgId);
    setReportedId(msgId);
    sounds.playPop();
    setTimeout(() => setReportedId(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-lg h-[80vh] sm:h-[650px] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden border ${
          isDarkMode
            ? 'bg-slate-900 text-slate-100 border-slate-800'
            : 'bg-[#FAF8F5] text-slate-800 border-stone-200'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-amber-500/10">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">💬</span>
            <div>
              <h2 className="text-sm font-bold">Obrolan Kota Refleksia</h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>Polling otomatis tiap 5s</span>
                <span>·</span>
                <span className="text-emerald-600 font-medium">Santun & Teredukasi</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-semibold"
          >
            ✕ Tutup
          </button>
        </div>

        {/* Room Switcher Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 p-2 gap-2">
          <button
            onClick={() => setSelectedRoom('kafe')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedRoom === 'kafe'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            ☕ Kafe Kopi Refleksi
          </button>
          <button
            onClick={() => setSelectedRoom('alunalun')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedRoom === 'alunalun'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            🌳 Alun-alun Refleksia
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">
              Belum ada pesan di ruang ini. Mulai percakapan sekarang!
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.senderId === currentUser.id ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {m.senderName}
                  </span>
                  {m.senderRole === 'guru' && (
                    <span className="text-[9px] px-1 rounded bg-amber-100 text-amber-800 font-bold">
                      GURU
                    </span>
                  )}
                  <span>·</span>
                  <span>{m.timestamp}</span>
                  {m.senderId !== currentUser.id && (
                    <button
                      onClick={() => handleReport(m.id)}
                      className="text-[10px] text-slate-400 hover:text-red-500 underline ml-1"
                      title="Laporkan pesan ini"
                    >
                      {reportedId === m.id ? 'Dilaporkan!' : 'Laporkan'}
                    </button>
                  )}
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl text-xs max-w-xs break-words ${
                    m.senderId === currentUser.id
                      ? 'bg-amber-500 text-white rounded-br-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                  } ${m.reported ? 'opacity-60 line-through' : ''}`}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Send message form */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Tulis pesan santun ke teman sekelas..."
            className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition-all"
          >
            Kirim
          </button>
        </form>
      </div>
    </div>
  );
};
