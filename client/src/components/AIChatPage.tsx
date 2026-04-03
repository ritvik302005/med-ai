import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowUp,
  BookOpen,
  Bot,
  Brain,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FlaskConical,
  HeartPulse,
  History,
  Pill,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { aiChat } from '../services/api';
import VoiceAssistant from './VoiceAssistant';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type Mode = 'search' | 'research' | 'reason' | 'interact';

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
  mode: Mode;
}

const SESSIONS_KEY = 'medai_chat_sessions';
const MAX_SESSIONS = 20;

const MODE_PROMPTS = {
  search:
    'You are MedAI, a medicine search assistant for India. Answer concisely. Prioritize medicine lookups, branded vs generic comparisons, prices, availability, and key usage. Format responses clearly with short sections and line breaks.',
  research:
    'You are MedAI, a medical research assistant. Include mechanism of action, clinical evidence, safety profile, contraindications, and a brief caution. Use headings like MECHANISM, USES, SIDE EFFECTS, INTERACTIONS, and WARNINGS. Always remind users to consult a doctor before use.',
  reason:
    'You are MedAI, a clinical assistant. Balance clarity, caution, and practical guidance. For drug questions cover uses, dosage overview, side effects, and when to seek care. For symptom questions mention possible causes and next steps. Always remind users to consult a qualified healthcare professional.',
  interact:
    'You are MedAI, a drug interaction checker. When given medicine names, start with SEVERITY: [None/Mild/Moderate/Severe], then explain the interaction, symptoms to watch for, and a practical recommendation. Remind users to verify with a pharmacist.',
} as const;

const MODE_META = {
  search: {
    label: 'Search',
    shortLabel: 'Search',
    icon: Search,
    description: 'Fast medicine lookups and pricing',
  },
  research: {
    label: 'Research',
    shortLabel: 'Research',
    icon: Zap,
    description: 'Deeper medical research answers',
  },
  reason: {
    label: 'Clinical',
    shortLabel: 'Clinical',
    icon: Brain,
    description: 'Clinical reasoning and next steps',
  },
  interact: {
    label: 'Interactions',
    shortLabel: 'Interactions',
    icon: AlertTriangle,
    description: 'Drug interaction focused replies',
  },
} as const;

const MODE_ORDER: Mode[] = ['reason', 'search', 'research', 'interact'];

const QUICK_PROMPTS = [
  {
    icon: Pill,
    label: 'Generic alternatives',
    prompt: 'What are generic alternatives to Paracetamol 500mg and how much do they cost in India?',
  },
  {
    icon: AlertTriangle,
    label: 'Drug interaction',
    prompt: 'Check interaction between Metformin and Ibuprofen.',
  },
  {
    icon: FlaskConical,
    label: 'Composition analysis',
    prompt: 'Analyze the composition and mechanism of Amoxicillin 500mg.',
  },
  {
    icon: HeartPulse,
    label: 'Side effects',
    prompt: 'What are the long-term side effects of Atorvastatin?',
  },
  {
    icon: ShieldCheck,
    label: 'Safe for elderly',
    prompt: 'Which common pain medicines are safest for patients over 70 years old?',
  },
  {
    icon: BookOpen,
    label: 'Diabetes medicines',
    prompt: 'Explain the different classes of type 2 diabetes medicines available in India with prices.',
  },
];

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as ChatSession[];
    return parsed.map((session) => ({
      ...session,
      updatedAt: new Date(session.updatedAt),
      messages: session.messages.map((message) => ({
        ...message,
        timestamp: new Date(message.timestamp),
      })),
    }));
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch {
    // Ignore storage failures and keep chat usable.
  }
}

function getSessionTitle(messages: Message[]) {
  const firstUserMessage = messages.find((message) => message.role === 'user');

  if (!firstUserMessage) {
    return 'New Chat';
  }

  return firstUserMessage.content.length > 40
    ? `${firstUserMessage.content.slice(0, 40)}...`
    : firstUserMessage.content;
}

function MessageContent({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCopied(false);
    }
  };

  const formatted = content.split('\n').map((line, index) => {
    if (/^[A-Z][A-Z\s]+:/.test(line)) {
      const colonIndex = line.indexOf(':');
      const heading = line.slice(0, colonIndex);
      const rest = line.slice(colonIndex + 1);

      return (
        <p key={index} className="mb-1 mt-3">
          <span className="text-[var(--accent)] font-black uppercase tracking-[0.15em]">
            {heading}:
          </span>
          <span className="opacity-80">{rest}</span>
        </p>
      );
    }

    if (/^[•*-]\s/.test(line)) {
      return (
        <p key={index} className="my-0.5 pl-4 opacity-80">
          {'-> '}
          {line.slice(2)}
        </p>
      );
    }

    if (line.trim() === '') {
      return <div key={index} className="h-2" />;
    }

    return (
      <p key={index} className="leading-relaxed opacity-80">
        {line}
      </p>
    );
  });

  return (
    <div className="group relative">
      <div className="text-xs font-bold leading-relaxed tracking-[0.05em]">{formatted}</div>
      <button
        onClick={() => void handleCopy()}
        className="absolute -right-2 -top-2 border border-[var(--grid)] bg-[var(--bg)] p-1.5 opacity-0 transition-opacity group-hover:opacity-100 hover:border-[var(--text)]"
      >
        {copied ? (
          <CheckCheck className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3 opacity-50" />
        )}
      </button>
    </div>
  );
}

export default function AIChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [activeMode, setActiveMode] = useState<Mode>('reason');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [maxTokens, setMaxTokens] = useState(400);
  const [contextWindow, setContextWindow] = useState(10);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
  }, [input]);

  const persistSessions = (updater: (current: ChatSession[]) => ChatSession[]) => {
    setSessions((current) => {
      const next = updater(current).slice(0, MAX_SESSIONS);
      saveSessions(next);
      return next;
    });
  };

  const saveCurrentSession = (
    nextMessages = messages,
    sessionId = currentSessionId,
    mode = activeMode
  ) => {
    if (nextMessages.length === 0) {
      return sessionId;
    }

    const id = sessionId || Date.now().toString();
    const session: ChatSession = {
      id,
      title: getSessionTitle(nextMessages),
      messages: nextMessages,
      updatedAt: new Date(),
      mode,
    };

    persistSessions((current) => [session, ...current.filter((item) => item.id !== id)]);
    return id;
  };

  const startNewChat = () => {
    if (messages.length > 0) {
      saveCurrentSession();
    }

    setMessages([]);
    setInput('');
    setCurrentSessionId(null);
    setShowHistory(false);
    setShowSettings(false);
    setShowClearConfirm(false);
    window.setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const loadSession = (session: ChatSession) => {
    if (messages.length > 0 && currentSessionId !== session.id) {
      saveCurrentSession();
    }

    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setActiveMode(session.mode);
    setShowHistory(false);
    setShowSettings(false);
    setShowClearConfirm(false);
  };

  const deleteSession = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();

    persistSessions((current) => current.filter((session) => session.id !== id));

    if (currentSessionId === id) {
      setMessages([]);
      setCurrentSessionId(null);
      setShowClearConfirm(false);
    }
  };

  const clearAllSessions = () => {
    setSessions([]);
    saveSessions([]);
    setMessages([]);
    setCurrentSessionId(null);
    setShowHistory(false);
    setShowClearConfirm(false);
  };

  const handleSend = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || isThinking) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setShowClearConfirm(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setIsThinking(true);

    try {
      const reply = await aiChat(
        [
          { role: 'system', content: MODE_PROMPTS[activeMode] },
          ...nextMessages.slice(-contextWindow).map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ],
        { maxTokens }
      );

      const finalMessages = [
        ...nextMessages,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant' as const,
          content: reply,
          timestamp: new Date(),
        },
      ];

      setMessages(finalMessages);
      const savedSessionId = saveCurrentSession(finalMessages, currentSessionId, activeMode);
      if (!currentSessionId && savedSessionId) {
        setCurrentSessionId(savedSessionId);
      }
    } catch (error) {
      const finalMessages = [
        ...nextMessages,
        {
          id: `${Date.now()}-error`,
          role: 'assistant' as const,
          content:
            error instanceof Error
              ? error.message
              : 'AI service unavailable. Check the server configuration and try again.',
          timestamp: new Date(),
        },
      ];

      setMessages(finalMessages);
      const savedSessionId = saveCurrentSession(finalMessages, currentSessionId, activeMode);
      if (!currentSessionId && savedSessionId) {
        setCurrentSessionId(savedSessionId);
      }
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-20 text-[var(--text)] transition-colors duration-500">
      <div className="relative flex min-h-[calc(100vh-5rem)] flex-col">
        <header className="sticky top-20 z-50 flex h-16 items-center justify-between border-b border-[var(--grid)] bg-[var(--bg)]/90 px-4 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 transition-colors hover:bg-[var(--text)]/5">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-[var(--text)] text-[var(--bg)]">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-black uppercase leading-none tracking-[0.15em]">
                MedAI Intelligence
              </p>
              <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.3em] opacity-40">
                Medicine Analysis - Drug Info - Interactions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={startNewChat}
              className="p-2 opacity-40 transition-colors hover:bg-[var(--text)]/5 hover:opacity-100"
              title="New chat"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setShowHistory((current) => !current);
                setShowSettings(false);
              }}
              className={`p-2 transition-colors ${
                showHistory ? 'bg-[var(--text)] text-[var(--bg)]' : 'hover:bg-[var(--text)]/5'
              }`}
              title="Chat history"
            >
              <History className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setShowSettings((current) => !current);
                setShowHistory(false);
              }}
              className={`p-2 transition-colors ${
                showSettings ? 'bg-[var(--text)] text-[var(--bg)]' : 'hover:bg-[var(--text)]/5'
              }`}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            {messages.length > 0 ? (
              showClearConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">
                    Clear all?
                  </span>
                  <button
                    onClick={() => {
                      setMessages([]);
                      setCurrentSessionId(null);
                      setShowClearConfirm(false);
                    }}
                    className="border border-red-500 px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-red-500 transition-all hover:bg-red-500 hover:text-white"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="text-[8px] font-black uppercase tracking-[0.2em] opacity-50"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="p-2 opacity-40 transition-colors hover:bg-[var(--text)]/5 hover:opacity-100"
                  title="Clear chat"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )
            ) : null}
          </div>
        </header>

        <div className="relative flex flex-1 overflow-hidden">
          <AnimatePresence>
            {showHistory ? (
              <motion.aside
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="absolute left-0 top-0 z-40 flex w-72 flex-col overflow-hidden border-r border-b-grid bg-[var(--bg)] shadow-2xl"
                style={{ bottom: 0 }}
              >
                <div className="flex flex-shrink-0 items-center justify-between border-b border-b-grid p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 opacity-40" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">
                      History ({sessions.length})
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {sessions.length > 0 ? (
                      <button
                        onClick={clearAllSessions}
                        className="p-1.5 text-[var(--text)] opacity-40 transition-colors hover:bg-[var(--text)]/5 hover:opacity-80"
                        title="Clear all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    <button
                      onClick={() => setShowHistory(false)}
                      className="p-1.5 transition-colors hover:bg-[var(--text)]/5"
                    >
                      <X className="h-4 w-4 opacity-40" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {sessions.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-20">
                        No history yet
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-1 p-2">
                      {sessions.map((session) => (
                        <li key={session.id}>
                          <button
                            onClick={() => loadSession(session)}
                            className={`group flex w-full items-start justify-between gap-2 p-3 text-left transition-colors hover:bg-[var(--text)]/5 ${
                              currentSessionId === session.id
                                ? 'border-l-2 border-[var(--text)] bg-[var(--text)]/10'
                                : ''
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[10px] font-black uppercase leading-tight tracking-wider">
                                {session.title}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[8px] font-black uppercase tracking-widest opacity-30">
                                  {MODE_META[session.mode].shortLabel}
                                </span>
                                <span className="text-[8px] opacity-20">.</span>
                                <span className="text-[8px] font-black uppercase tracking-widest opacity-30">
                                  {session.updatedAt.toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-1">
                              <ChevronRight className="h-3 w-3 opacity-20 transition-opacity group-hover:opacity-60" />
                              <button
                                onClick={(event) => deleteSession(session.id, event)}
                                className="p-1 opacity-0 transition-opacity group-hover:opacity-40 hover:!opacity-80"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex-shrink-0 border-t border-b-grid p-3">
                  <button
                    onClick={startNewChat}
                    className="flex w-full items-center justify-center gap-2 bg-[var(--text)] py-3 text-[9px] font-black uppercase tracking-[0.3em] text-[var(--bg)] transition-opacity hover:opacity-80"
                  >
                    <Plus className="h-3 w-3" />
                    New Chat
                  </button>
                </div>
              </motion.aside>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {showSettings ? (
              <motion.aside
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="absolute left-0 top-0 z-40 flex w-72 flex-col overflow-hidden border-r border-b-grid bg-[var(--bg)] shadow-2xl"
                style={{ bottom: 0 }}
              >
                <div className="flex flex-shrink-0 items-center justify-between border-b border-b-grid p-4">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 opacity-40" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">
                      Settings
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1.5 transition-colors hover:bg-[var(--text)]/5"
                  >
                    <X className="h-4 w-4 opacity-40" />
                  </button>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto p-4">
                  <div>
                    <p className="mb-3 text-[9px] font-black uppercase tracking-[0.4em] opacity-40">
                      AI Mode
                    </p>
                    <div className="space-y-2">
                      {MODE_ORDER.map((mode) => {
                        const config = MODE_META[mode];
                        return (
                          <button
                            key={mode}
                            onClick={() => setActiveMode(mode)}
                            className={`flex w-full items-center gap-3 border-2 p-3 text-left transition-all ${
                              activeMode === mode
                                ? 'border-[var(--text)] bg-[var(--text)] text-[var(--bg)]'
                                : 'border-transparent hover:border-[var(--text)]/20'
                            }`}
                          >
                            <config.icon className="h-4 w-4 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] font-black uppercase leading-none tracking-widest">
                                {config.label}
                              </p>
                              <p
                                className={`mt-1 text-[8px] uppercase tracking-widest ${
                                  activeMode === mode ? 'opacity-60' : 'opacity-40'
                                }`}
                              >
                                {config.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-[9px] font-black uppercase tracking-[0.4em] opacity-40">
                      Response Length
                    </p>
                    <div className="space-y-2">
                      {[
                        { label: 'Concise', value: 200 },
                        { label: 'Standard', value: 400 },
                        { label: 'Detailed', value: 800 },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setMaxTokens(option.value)}
                          className={`flex w-full items-center justify-between border-2 p-3 transition-all ${
                            maxTokens === option.value
                              ? 'border-[var(--text)] bg-[var(--text)] text-[var(--bg)]'
                              : 'border-transparent hover:border-[var(--text)]/20'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {option.label}
                          </span>
                          <span
                            className={`text-[8px] font-black uppercase tracking-widest ${
                              maxTokens === option.value ? 'opacity-60' : 'opacity-30'
                            }`}
                          >
                            ~{option.value} tokens
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-[9px] font-black uppercase tracking-[0.4em] opacity-40">
                      Memory
                    </p>
                    <div className="space-y-2">
                      {[4, 8, 16].map((value) => (
                        <button
                          key={value}
                          onClick={() => setContextWindow(value)}
                          className={`flex w-full items-center justify-between border-2 p-3 transition-all ${
                            contextWindow === value
                              ? 'border-[var(--text)] bg-[var(--text)] text-[var(--bg)]'
                              : 'border-transparent hover:border-[var(--text)]/20'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            Last {value} messages
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.aside>
            ) : null}
          </AnimatePresence>

          <main className="flex flex-1 flex-col overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
              <AnimatePresence mode="popLayout">
              {messages.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex min-h-[55vh] flex-col items-center justify-center text-center"
                >
                  <div className="relative mb-6 flex h-16 w-16 items-center justify-center border-2 border-[var(--text)]">
                    <Sparkles className="h-8 w-8" />
                    <div className="absolute inset-0 animate-pulse bg-[var(--accent)] opacity-10 blur-3xl" />
                  </div>
                  <h2 className="mb-3 text-3xl font-black uppercase leading-none tracking-tighter md:text-5xl">
                    Ask Me Anything
                  </h2>
                  <p className="mb-3 max-w-xs text-[10px] font-bold uppercase tracking-[0.4em] opacity-40">
                    Medicine info - Drug interactions - Generic alternatives - Side effects
                  </p>
                  <p className="mb-10 text-[9px] font-black uppercase tracking-[0.3em] opacity-30">
                    Mode: {MODE_META[activeMode].label}
                  </p>

                  <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                    {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                      <button
                        key={label}
                        onClick={() => void handleSend(prompt)}
                        className="group flex items-start gap-3 border border-[var(--grid)] p-4 text-left transition-all hover:border-[var(--text)]"
                      >
                        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-40 transition-opacity group-hover:opacity-100" />
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60 transition-opacity group-hover:opacity-100">
                            {label}
                          </p>
                          <p className="mt-1 line-clamp-1 text-[8px] font-bold uppercase tracking-[0.1em] opacity-30 transition-opacity group-hover:opacity-50">
                            {prompt}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-8 pb-4">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-4 ${
                        message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center border ${
                          message.role === 'assistant'
                            ? 'border-[var(--text)] bg-[var(--text)] text-[var(--bg)]'
                            : 'border-[var(--grid)]'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <Bot className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div
                        className={`flex-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                      >
                        <div
                          className={`inline-block max-w-2xl border p-5 ${
                            message.role === 'assistant'
                              ? 'border-[var(--grid)] bg-[var(--text)]/5 text-left'
                              : 'border-[var(--grid)]'
                          }`}
                        >
                          {message.role === 'assistant' ? (
                            <MessageContent content={message.content} />
                          ) : (
                            <p className="text-xs font-bold leading-relaxed tracking-[0.05em]">
                              {message.content}
                            </p>
                          )}
                        </div>
                        <span className="mt-1.5 block text-[8px] font-black uppercase tracking-widest opacity-30">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </motion.div>
                  ))}

                  {isThinking ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-[var(--text)] text-[var(--bg)]">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="border border-[var(--grid)] bg-[var(--text)]/5 p-5">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40">
                            {MODE_META[activeMode].label} mode
                          </span>
                          <div className="flex gap-1">
                            {[0, 0.2, 0.4].map((delay) => (
                              <motion.div
                                key={delay}
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{ repeat: Infinity, duration: 1.2, delay }}
                                className="h-1 w-1 bg-[var(--text)]"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}

                  <div ref={messagesEndRef} />
                </div>
              )}
              </AnimatePresence>
            </div>
          </main>
        </div>

        <div className="sticky bottom-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent px-4 pb-6 pt-2 md:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="overflow-hidden border-2 border-[var(--text)] bg-[var(--bg)]">
              <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--grid)] p-2">
                {MODE_ORDER.map((mode) => {
                  const config = MODE_META[mode];
                  return (
                    <button
                      key={mode}
                      onClick={() => setActiveMode(mode)}
                      className={`whitespace-nowrap px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                        activeMode === mode
                        ? 'bg-[var(--text)] text-[var(--bg)]'
                        : 'hover:bg-[var(--text)]/5'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <config.icon className="h-3 w-3" />
                        {config.shortLabel}
                      </span>
                    </button>
                  );
                })}
                {messages.length > 0 ? (
                  <button
                    onClick={startNewChat}
                    className="ml-auto flex flex-shrink-0 items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest opacity-40 transition-opacity hover:opacity-100"
                  >
                    <Plus className="h-3 w-3" />
                    New
                  </button>
                ) : null}
              </div>

              <div className="flex items-end gap-2 p-3">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about any medicine, interaction, or symptom..."
                  rows={1}
                  className="max-h-32 min-h-[40px] flex-1 resize-none overflow-y-auto bg-transparent text-xs font-bold leading-relaxed tracking-[0.1em] placeholder:opacity-20 focus:outline-none"
                />
                <button
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || isThinking}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center bg-[var(--text)] text-[var(--bg)] transition-opacity hover:opacity-80 disabled:opacity-20"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[7px] font-black uppercase tracking-[0.3em] opacity-25">
              For informational purposes only - always consult a qualified doctor
            </p>
          </div>
        </div>
      </div>
      <VoiceAssistant />
    </div>
  );
}
