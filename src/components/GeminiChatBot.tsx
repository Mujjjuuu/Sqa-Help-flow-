import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Trash2,
  Minimize2,
  Maximize2,
  Bot,
  User,
  Zap,
  Target,
  Cpu,
  CornerDownLeft,
  Copy,
  Check,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  modelUsed?: string;
}

export type AssistantRole = 'agile_coach' | 'fast_assistant' | 'code_architect';

interface RoleOption {
  id: AssistantRole;
  label: string;
  model: string;
  taskType: 'general' | 'fast' | 'complex';
  icon: React.ReactNode;
  description: string;
}

const ROLES: RoleOption[] = [
  {
    id: 'agile_coach',
    label: 'Ticket Architect',
    model: 'gemini-3.5-flash',
    taskType: 'general',
    icon: <Target className="w-3.5 h-3.5 text-indigo-500" />,
    description: 'Break down features into 4-stage tickets with descriptions & notes.',
  },
  {
    id: 'fast_assistant',
    label: 'Fast Assist',
    model: 'gemini-3.1-flash-lite',
    taskType: 'fast',
    icon: <Zap className="w-3.5 h-3.5 text-amber-500" />,
    description: 'Lightning-fast ticket checklists, summaries, and title generation.',
  },
  {
    id: 'code_architect',
    label: 'System Architect',
    model: 'gemini-3.1-pro-preview',
    taskType: 'complex',
    icon: <Cpu className="w-3.5 h-3.5 text-purple-500" />,
    description: 'Deep technical specs, architecture caveats & debugging notes.',
  },
];

const PROMPT_SUGGESTIONS = [
  'Break down OAuth authentication into 3 tickets',
  'Write description & notes for payment gateway retry logic',
  'Help me formulate acceptance criteria for mobile card freeze',
];

export const GeminiChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AssistantRole>('agile_coach');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-001',
      role: 'model',
      text: "👋 Hi, I'm your **KRUM AI Assistant**. I can help you plan features, draft ticket descriptions, write separate technical notes, or audit your 4-stage pipeline (Just Written → Under Review → Verified → Verified by QA). How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.5-flash',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of thread
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const activeRoleOption = ROLES.find((r) => r.id === selectedRole) || ROLES[0];

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage.trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation history for multi-turn chat (excluding the immediate new user message)
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          role: selectedRole,
          taskType: activeRoleOption.taskType,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: data.text || 'No response received.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.model || activeRoleOption.model,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `⚠️ **Unable to complete response:** ${err.message || 'Intermittent service error. Please try again.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        text: 'Thread cleared. Ask me anything about your projects, tickets, or software architecture!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: activeRoleOption.model,
      },
    ]);
  };

  return (
    <>
      {/* ---------------------------------------------------- */}
      {/* FLOATING HOVER ICON ON THE BOTTOM RIGHT SIDE         */}
      {/* ---------------------------------------------------- */}
      <div className="fixed bottom-5 right-5 z-50 group">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open Gemini Chatbot"
            className="relative flex items-center gap-2 px-3.5 py-2 bg-slate-900/95 hover:bg-slate-800 text-white rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 border border-slate-700/80 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            {/* Sparkle Icon with animated pulse */}
            <div className="relative">
              <Sparkles className="w-4 h-4 text-indigo-400 group-hover:rotate-12 transition-transform duration-300" />
              <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500" />
              </span>
            </div>

            <span className="font-semibold text-xs tracking-tight">
              Ask AI
            </span>

            {/* Quick model badge on hover */}
            <span className="hidden sm:inline-block text-[9px] font-mono font-medium bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded-full border border-slate-700">
              {activeRoleOption.model.replace('gemini-', '')}
            </span>
          </button>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* MULTI-TURN GEMINI CHAT MODAL / DRAWER (BOTTOM RIGHT)  */}
      {/* ---------------------------------------------------- */}
      {isOpen && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-200 ${
            isExpanded
              ? 'w-[92vw] sm:w-[520px] h-[80vh] max-h-[700px]'
              : 'w-[92vw] sm:w-[380px] h-[510px] max-h-[78vh]'
          }`}
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs tracking-tight text-white leading-none">
                    KRUM Assistant
                  </h3>
                  <span className="text-[9px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800/60 px-1 py-0.2 rounded">
                    {activeRoleOption.model.replace('gemini-', '')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate max-w-[200px]">
                  {activeRoleOption.description}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Clear conversation history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:inline-flex p-1.5 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title={isExpanded ? 'Minimize width' : 'Expand window'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Role Selector Tabs */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto shrink-0">
            {ROLES.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedRole === role.id
                    ? 'bg-white text-slate-900 border border-slate-300 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {role.icon}
                <span>{role.label}</span>
              </button>
            ))}
          </div>

          {/* Message Thread (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-slate-50/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 items-start ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs relative group ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none'
                  }`}
                >
                  {/* Markdown-style content display */}
                  <div className="whitespace-pre-wrap font-sans">{msg.text}</div>

                  {/* Bubble footer with time & copy button */}
                  <div
                    className={`flex items-center justify-between gap-3 mt-1.5 pt-1 text-[10px] ${
                      msg.role === 'user'
                        ? 'text-slate-400 border-t border-slate-800'
                        : 'text-slate-400 border-t border-slate-100'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.role === 'model' && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.text, msg.id)}
                        className="inline-flex items-center gap-1 hover:text-slate-700 cursor-pointer"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing / Generating Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 items-start">
                <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-3.5 py-2 text-xs text-slate-600 flex items-center gap-2 shadow-2xs">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Thinking with {activeRoleOption.model}...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions (Shown if conversation has <= 2 messages) */}
          {messages.length <= 2 && (
            <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto shrink-0">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">
                Try:
              </span>
              {PROMPT_SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(suggestion)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] whitespace-nowrap transition-colors cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Input Box Footer */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <div className="flex items-end gap-2 bg-slate-50 border border-slate-300 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${activeRoleOption.label} (${activeRoleOption.model})...`}
                rows={1}
                className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 resize-none outline-none max-h-24 min-h-[28px] py-1"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
                title="Send message (Enter)"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-slate-400">
              <span>Shift + Enter for new line</span>
              <span className="font-mono">{activeRoleOption.model}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
