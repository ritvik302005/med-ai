import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  Maximize2,
  User,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiChat } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SYSTEM_PROMPT =
  'You are MedAI, a concise medical assistant specialising in Indian medicines, generic alternatives, and drug safety. Keep replies brief (3-5 sentences max) and always recommend seeing a doctor for personal medical advice.';

const QUICK_PROMPTS = [
  'Generic for Crocin?',
  'Metformin side effects',
  'Jan Aushadhi near me?',
  'Paracetamol dosage',
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 200);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const openFullChat = () => {
    setIsOpen(false);
    navigate('/ai-chat');
  };

  const handleSend = async (text?: string) => {
    const trimmed = (text ?? input).trim();

    if (!trimmed || isThinking) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsThinking(true);

    try {
      const reply = await aiChat([
        { role: 'system', content: SYSTEM_PROMPT },
        ...nextMessages.slice(-6).map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ]);

      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-error`,
          role: 'assistant',
          content: 'AI service is currently unavailable. Please try again shortly.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-8 z-[120]">
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="absolute bottom-20 right-0 flex h-[540px] w-[360px] flex-col overflow-hidden border border-b-grid bg-[var(--bg)] shadow-2xl transition-colors duration-500 md:w-[420px]"
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-b-grid bg-[var(--text)] p-5 text-[var(--bg)]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center border border-[var(--bg)]/20">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest leading-none">
                    MedAI Assistant
                  </h3>
                  <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-50">
                    {isThinking ? 'Thinking...' : 'Online'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {messages.length > 0 ? (
                  <button
                    onClick={() => setMessages([])}
                    className="p-2 transition-colors hover:bg-[var(--bg)]/10"
                    title="Clear chat"
                  >
                    <Trash2 className="h-4 w-4 opacity-60" />
                  </button>
                ) : null}

                <button
                  onClick={openFullChat}
                  className="p-2 transition-colors hover:bg-[var(--bg)]/10"
                  title="Open full chat"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 transition-colors hover:bg-[var(--bg)]/10"
                  title="Close chat"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[var(--bg)] p-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col justify-center gap-4">
                  <div className="text-center">
                    <p className="mb-6 text-[10px] font-black uppercase tracking-[0.4em] opacity-20">
                      Quick questions
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {QUICK_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => void handleSend(prompt)}
                          className="border border-b-grid p-3 text-left text-[9px] font-black uppercase tracking-wider opacity-50 transition-all hover:border-[var(--text)] hover:bg-[var(--text)]/5 hover:opacity-100"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={openFullChat}
                      className="inline-flex items-center gap-2 border-2 border-[var(--text)] px-6 py-3 text-[9px] font-black uppercase tracking-[0.3em] transition-all hover:bg-[var(--text)] hover:text-[var(--bg)]"
                    >
                      <Maximize2 className="h-3 w-3" />
                      Full AI Chat
                    </button>
                  </div>
                </div>
              ) : null}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center border ${
                      message.role === 'assistant'
                        ? 'border-[var(--text)] bg-[var(--text)] text-[var(--bg)]'
                        : 'border-b-grid'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <Bot className="h-3.5 w-3.5" />
                    ) : (
                      <User className="h-3.5 w-3.5" />
                    )}
                  </div>

                  <div
                    className={`max-w-[78%] border p-3 ${
                      message.role === 'assistant'
                        ? 'border-b-grid bg-[var(--text)]/5'
                        : 'border-b-grid'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-[10px] font-bold uppercase tracking-wider leading-relaxed opacity-80">
                      {message.content}
                    </p>
                    <span className="mt-1 block text-[7px] font-black uppercase tracking-widest opacity-30">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}

              {isThinking ? (
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center border border-[var(--text)] bg-[var(--text)] text-[var(--bg)]">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center gap-2 border border-b-grid bg-[var(--text)]/5 p-3">
                    <Loader2 className="h-3 w-3 animate-spin opacity-40" />
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                      Thinking...
                    </span>
                  </div>
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            <div className="flex-shrink-0 border-t border-b-grid bg-[var(--bg)] p-3">
              <div className="flex items-center gap-2 border border-b-grid transition-colors focus-within:border-[var(--text)]">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void handleSend();
                    }
                  }}
                  placeholder="Ask anything..."
                  className="flex-1 bg-transparent px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] focus:outline-none"
                />
                <button
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || isThinking}
                  className="m-1 flex h-9 w-9 flex-shrink-0 items-center justify-center bg-[var(--text)] text-[var(--bg)] transition-opacity hover:opacity-80 disabled:opacity-20"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen((current) => !current)}
        className="relative flex h-16 w-16 items-center justify-center border border-b-grid bg-[var(--text)] text-[var(--bg)] shadow-2xl"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="h-7 w-7" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <MessageSquare className="h-7 w-7" />
            </motion.span>
          )}
        </AnimatePresence>

        {!isOpen && messages.length > 0 ? (
          <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-[var(--bg)] bg-green-500" />
        ) : null}
      </motion.button>
    </div>
  );
}
