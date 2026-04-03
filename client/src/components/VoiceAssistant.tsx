import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bot, Loader2, Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react';
import { aiChat } from '../services/api';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface ConvoTurn {
  role: 'user' | 'assistant';
  text: string;
}

const SYSTEM_PROMPT = `You are MedAI Voice, a concise voice assistant for medicine information in India.
Rules:
- Keep every answer under 3 sentences because this will be read aloud.
- Answer in plain spoken English with no markdown.
- Focus on generic vs branded medicine, prices in INR, usage, dosage, side effects, and interactions.
- Always end with "Consult your doctor for personal advice."
- If asked something non-medical, politely redirect to medicine topics.`;

const GREETINGS = [
  'MedAI Voice ready. Ask me about any medicine.',
  'Hi. I can help with medicine info, prices, and interactions.',
  'Voice assistant active. What would you like to know?',
];

function WaveformBars({ active }: { active: boolean }) {
  return (
    <div className="flex h-8 items-center gap-[3px]">
      {Array.from({ length: 7 }).map((_, index) => (
        <motion.div
          key={index}
          className="w-[3px] rounded-full bg-[var(--text)]"
          animate={
            active
              ? {
                  height: ['8px', `${14 + Math.random() * 18}px`, '8px'],
                }
              : { height: '4px' }
          }
          transition={{
            repeat: active ? Infinity : 0,
            duration: 0.4 + index * 0.07,
            ease: 'easeInOut',
            delay: index * 0.06,
          }}
        />
      ))}
    </div>
  );
}

export default function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AssistantState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [history, setHistory] = useState<ConvoTurn[]>([]);
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setSupported(false);
      return;
    }

    synthRef.current = window.speechSynthesis;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = '';
      let finalText = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (interimText) {
        setInterim(interimText);
      }

      if (finalText) {
        setInterim('');
        setTranscript(finalText.trim());
      }
    };

    recognition.onend = () => {
      setState((current) => (current === 'listening' ? 'idle' : current));
    };

    recognition.onerror = () => {
      setState('error');
      setErrorMsg('Microphone access denied or not available.');
      window.setTimeout(() => setState('idle'), 3000);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      synthRef.current?.cancel();
      if (greetingTimeoutRef.current) {
        window.clearTimeout(greetingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [history]);

  useEffect(() => {
    if (!transcript) {
      return;
    }

    void handleAsk(transcript);
    setTranscript('');
  }, [transcript]);

  const speak = useCallback(
    (text: string) => {
      if (!speakEnabled || !synthRef.current) {
        return;
      }

      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = synthRef.current.getVoices();
      const preferredVoice =
        voices.find(
          (voice) => voice.lang.startsWith('en-IN') || voice.name.toLowerCase().includes('india')
        ) || voices.find((voice) => voice.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setState('speaking');
      utterance.onend = () => setState('idle');
      utterance.onerror = () => setState('idle');

      synthRef.current.speak(utterance);
    },
    [speakEnabled]
  );

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }

    synthRef.current?.cancel();
    setInterim('');
    setTranscript('');
    setState('listening');

    try {
      recognitionRef.current.start();
    } catch (error) {
      // Recognition can throw if start is called before a prior session fully ends.
    }
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setState((current) => (current === 'listening' ? 'idle' : current));
  }, []);

  const handleAsk = async (question: string) => {
    setState('thinking');
    const userTurn: ConvoTurn = { role: 'user', text: question };
    const nextHistory = [...history, userTurn];
    setHistory(nextHistory);

    try {
      const reply = await aiChat([
        { role: 'system', content: SYSTEM_PROMPT },
        ...nextHistory.slice(-6).map((turn) => ({
          role: turn.role,
          content: turn.text,
        })),
      ]);

      const assistantTurn: ConvoTurn = { role: 'assistant', text: reply };
      setHistory((current) => [...current, assistantTurn]);
      speak(reply);
    } catch (error) {
      const fallback = 'Sorry, the AI service is unavailable right now.';
      setHistory((current) => [...current, { role: 'assistant', text: fallback }]);
      setState('error');
      setErrorMsg(fallback);
      window.setTimeout(() => setState('idle'), 3000);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (greetingTimeoutRef.current) {
      window.clearTimeout(greetingTimeoutRef.current);
    }
    greetingTimeoutRef.current = window.setTimeout(() => {
      const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      speak(greeting);
    }, 400);
  };

  const handleClose = () => {
    if (greetingTimeoutRef.current) {
      window.clearTimeout(greetingTimeoutRef.current);
      greetingTimeoutRef.current = null;
    }
    synthRef.current?.cancel();
    recognitionRef.current?.abort();
    setState('idle');
    setOpen(false);
  };

  const stateLabel: Record<AssistantState, string> = {
    idle: 'Tap mic to speak',
    listening: 'Listening...',
    thinking: 'Thinking...',
    speaking: 'Speaking...',
    error: errorMsg || 'Error',
  };

  const stateColor: Record<AssistantState, string> = {
    idle: 'opacity-40',
    listening: 'text-red-500',
    thinking: 'text-[var(--accent)]',
    speaking: 'text-green-500',
    error: 'text-red-500',
  };

  return (
    <div className="fixed bottom-24 right-8 z-[130]" style={{ marginRight: '4.5rem' }}>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            className="absolute bottom-20 right-0 flex max-h-[520px] w-[320px] flex-col overflow-hidden border-2 border-[var(--text)] bg-[var(--bg)] shadow-[6px_6px_0px_0px_var(--text)] md:w-[380px]"
          >
            <div className="flex flex-shrink-0 items-center justify-between bg-[var(--text)] p-4 text-[var(--bg)]">
              <div className="flex items-center gap-3">
                <Bot className="h-5 w-5" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                    Voice Assistant
                  </p>
                  <p
                    className={`text-[8px] font-bold uppercase tracking-[0.2em] ${
                      state === 'idle' ? 'opacity-50' : 'opacity-100'
                    }`}
                  >
                    {stateLabel[state]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    synthRef.current?.cancel();
                    setSpeakEnabled((current) => !current);
                  }}
                  className="p-1.5 transition-colors hover:bg-[var(--bg)]/10"
                  title={speakEnabled ? 'Mute voice' : 'Enable voice'}
                >
                  {speakEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4 opacity-50" />
                  )}
                </button>
                <button
                  onClick={handleClose}
                  className="p-1.5 transition-colors hover:bg-[var(--bg)]/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!supported ? (
              <div className="p-6 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">
                  Voice not supported in this browser.
                </p>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.2em] opacity-50">
                  Try Chrome or Edge on desktop.
                </p>
              </div>
            ) : (
              <>
                <div
                  ref={scrollRef}
                  className="min-h-[180px] max-h-[260px] flex-1 space-y-4 overflow-y-auto p-4"
                >
                  {history.length === 0 ? (
                    <div className="pt-4 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-30">
                        Ask about medicine prices, interactions, side effects...
                      </p>
                    </div>
                  ) : null}

                  {history.map((turn, index) => (
                    <div
                      key={`${turn.role}-${index}`}
                      className={`flex gap-3 ${
                        turn.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div
                        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center border text-[8px] font-black ${
                          turn.role === 'user'
                            ? 'border-[var(--text)]'
                            : 'border-[var(--text)] bg-[var(--text)] text-[var(--bg)]'
                        }`}
                      >
                        {turn.role === 'user' ? 'U' : <Bot className="h-3 w-3" />}
                      </div>
                      <div
                        className={`flex-1 border border-[var(--grid)] p-3 text-[10px] font-bold leading-relaxed tracking-[0.05em] ${
                          turn.role === 'user' ? 'text-right' : ''
                        }`}
                      >
                        {turn.text}
                      </div>
                    </div>
                  ))}

                  {state === 'thinking' ? (
                    <div className="flex gap-3">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center border border-[var(--text)] bg-[var(--text)] text-[var(--bg)]">
                        <Bot className="h-3 w-3" />
                      </div>
                      <div className="flex items-center gap-2 border border-[var(--grid)] p-3">
                        <Loader2 className="h-3 w-3 animate-spin opacity-50" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">
                          Analyzing...
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {interim || state === 'listening' ? (
                  <div className="px-4 pb-2">
                    <p className="min-h-[28px] border border-dashed border-[var(--grid)] p-2 text-[9px] font-bold uppercase tracking-[0.2em] opacity-40">
                      {interim || '...'}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-shrink-0 items-center justify-between border-t border-[var(--grid)] p-4">
                  <WaveformBars active={state === 'listening' || state === 'speaking'} />

                  <button
                    onPointerDown={startListening}
                    onPointerUp={stopListening}
                    onPointerLeave={stopListening}
                    disabled={state === 'thinking'}
                    className={`select-none border-2 transition-all ${
                      state === 'listening'
                        ? 'scale-110 border-red-500 bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                        : state === 'thinking'
                          ? 'border-[var(--grid)] opacity-30'
                          : 'border-[var(--text)] bg-[var(--text)] text-[var(--bg)] hover:opacity-80'
                    } flex h-14 w-14 items-center justify-center`}
                    title="Hold to speak"
                  >
                    {state === 'thinking' ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : state === 'listening' ? (
                      <MicOff className="h-6 w-6" />
                    ) : (
                      <Mic className="h-6 w-6" />
                    )}
                  </button>

                  <div className="text-right">
                    <p className={`text-[8px] font-black uppercase tracking-[0.3em] ${stateColor[state]}`}>
                      {stateLabel[state]}
                    </p>
                    <p className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.2em] opacity-30">
                      Hold mic to speak
                    </p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={open ? handleClose : handleOpen}
        className={`relative flex h-14 w-14 items-center justify-center border-2 shadow-[4px_4px_0px_0px_var(--text)] transition-all ${
          open
            ? 'border-[var(--text)] bg-[var(--text)] text-[var(--bg)]'
            : state === 'listening'
              ? 'border-red-500 bg-red-500 text-white'
              : 'border-[var(--text)] bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--text)] hover:text-[var(--bg)]'
        }`}
        title="Voice Assistant"
      >
        {state === 'listening' ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
      </motion.button>
    </div>
  );
}
