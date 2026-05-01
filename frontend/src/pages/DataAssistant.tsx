import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Bot, User, Send, Loader2, ShieldAlert } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const DataAssistant: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('ai_assistant_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [{ role: 'assistant', content: "Salom! Men Prodeklarant biznes tahlilchisiman. Qanday ma'lumotlarni bilmoqchisiz?" }];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('ai_assistant_history', JSON.stringify(messages));
  }, [messages]);

  const clearHistory = () => {
    setMessages([{ role: 'assistant', content: "Salom! Men Prodeklarant biznes tahlilchisiman. Qanday ma'lumotlarni bilmoqchisiz?" }]);
    localStorage.removeItem('ai_assistant_history');
  };

  // Faqatgina dastur egasi/admin kirishiga ruxsat beramiz.
  if (user?.role !== 'ADMIN' && user?.role !== 'OWNER') {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">Kirish taqiqlangan</h2>
        <p className="text-gray-500 mt-2">Bu sahifa faqatgina tizim egasi uchun mo'ljallangan.</p>
      </div>
    );
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/ai/data-assistant', {
        question: userMessage.content,
        // Biz tarix sifatida faqat so'nggi 5-6 ta xabarni jo'natamiz
        history: messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.data.answer }
      ]);
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Xatolik yuz berdi: ${error.response?.data?.error || error.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bot className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-bold">AI Biznes Tahlilchisi</h1>
            <p className="text-sm text-blue-100">Faqat tizim rahbari uchun maxsus</p>
          </div>
        </div>
        <button
          onClick={clearHistory}
          className="text-sm bg-indigo-800 hover:bg-indigo-900 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          title="Chatni tozalash"
        >
          Tozalash
        </button>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[80%] ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-blue-100 ml-3' : 'bg-indigo-100 mr-3'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-6 h-6 text-blue-600" />
                ) : (
                  <Bot className="w-6 h-6 text-indigo-600" />
                )}
              </div>
              <div
                className={`p-4 rounded-2xl shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none whitespace-pre-wrap'
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex max-w-[80%] flex-row">
              <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-indigo-100 mr-3">
                <Bot className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="p-4 rounded-2xl bg-white border border-gray-200 rounded-tl-none flex items-center space-x-2 shadow-sm">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                <span className="text-gray-500">Tahlil qilinmoqda...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Menga savol bering (masalan: Bugun eng ko'p daromad qilgan xodim kim?)..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center w-12 h-12"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
