'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Heart } from 'lucide-react';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
}

const initialMessages: Message[] = [
  {
    id: 1,
    role: 'assistant',
    text: "Bonjour ! Je suis Léa, votre assistante mariage. 💍 Comment puis-je vous aider à préparer votre grand jour ?",
  },
];

const suggestions = [
  'Trouver un photographe',
  'Lieux de réception',
  'Conseils budget',
  'Planning mariage',
];

const autoReplies: Record<string, string> = {
  default: "Je comprends votre demande ! Parcourez notre sélection de prestataires ou utilisez la recherche pour trouver exactement ce qu'il vous faut. Notre équipe est aussi disponible pour vous accompagner personnellement.",
  'Trouver un photographe': "Excellent choix ! Nous avons plus de 234 photographes certifiés en France. Rendez-vous sur la page Prestataires et filtrez par catégorie 'Photographes'. Vous pouvez aussi filtrer par région, budget et note.",
  'Lieux de réception': "Nos lieux de réception couvrent toute la France — châteaux, domaines viticoles, jardins, et bien plus. Consultez notre carte des villes pour découvrir les adresses les plus prisées près de chez vous.",
  'Conseils budget': "En général, comptez : 30% pour le lieu et traiteur, 15% pour la photo/vidéo, 10% pour les fleurs, 10% pour la musique et 35% pour le reste. Notre wedding planner peut vous aider à établir un budget personnalisé.",
  'Planning mariage': "Je vous recommande de commencer les réservations 12 à 18 mois à l'avance pour les lieux populaires, et 6 à 9 mois pour les autres prestataires. Notre outil de planification dans votre tableau de bord vous guide étape par étape !",
};

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setHasUnread(false);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) setHasUnread(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText) return;

    const userMsg: Message = { id: Date.now(), role: 'user', text: msgText };
    const reply = autoReplies[msgText] || autoReplies.default;
    const assistantMsg: Message = { id: Date.now() + 1, role: 'assistant', text: reply };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="w-80 sm:w-[360px] bg-white rounded-2xl shadow-[0_20px_70px_rgba(0,0,0,0.18)] overflow-hidden border border-champagne-200 animate-slide-up">
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #9b1b4b 0%, #c2185b 60%, #e91e63 100%)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm leading-none">Léa</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white/80 text-xs">Assistante LeOui · En ligne</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="h-64 overflow-y-auto p-4 space-y-3 bg-ivory-50/80">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 bg-rose-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-rose-600 text-white rounded-br-sm'
                      : 'bg-white text-charcoal-800 shadow-soft border border-charcoal-100 rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="px-4 py-2.5 flex flex-wrap gap-1.5 border-t border-charcoal-100 bg-white">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-3 py-1 bg-champagne-50 text-champagne-800 text-xs rounded-full border border-champagne-200 hover:bg-champagne-100 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="p-3 border-t border-charcoal-100 bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Votre message..."
              className="flex-1 px-4 py-2 bg-charcoal-50 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-rose-200 transition-all"
            />
            <button
              onClick={() => handleSend()}
              className="w-9 h-9 bg-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-700 transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`relative w-14 h-14 rounded-2xl shadow-soft-xl flex items-center justify-center transition-all duration-200 hover:scale-105 ${
          isOpen ? 'bg-charcoal-800 hover:bg-charcoal-900' : 'bg-rose-600 hover:bg-rose-700'
        }`}
      >
        {hasUnread && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-champagne-500 rounded-full border-2 border-white" />
        )}
        {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </button>
    </div>
  );
}
