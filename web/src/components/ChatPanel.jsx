import { useEffect, useRef, useState } from 'react';
import { chatStatus, sendChat } from '../api.js';

// Grounded ASCEND assistant - a slide-in panel with a floating launcher. Self-gating: it checks
// /chat/status on mount and renders nothing when the assistant is disabled (no Gemini key), so
// there is never a half-working button. History is kept in local state and the recent turns are
// sent each request (stateless server). Answers are AI-generated - the panel says so.
const GREETING = "Hi! I'm your ASCEND assistant. Ask me what to do next on your path, which courses or targets fit you, or how to use any page. I can chat in English or Bahasa Melayu.";

export default function ChatPanel() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    chatStatus().then((d) => setEnabled(Boolean(d.enabled))).catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  if (!enabled) return null;

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setError(null);
    setDraft('');
    // Send the transcript excluding the static greeting; append the new user turn.
    const history = messages.filter((m, i) => !(i === 0 && m.role === 'assistant'));
    const next = [...history, { role: 'user', content: text }];
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setSending(true);
    try {
      const { reply } = await sendChat(next);
      setMessages((m) => [...m, { role: 'assistant', content: reply || "I'm having trouble responding right now. Please try again in a moment." }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      {!open && (
        <button className="chat-fab" onClick={() => setOpen(true)} title="Ask the ASCEND assistant">
          <span className="chat-fab-dot" />💬 Ask ASCEND
        </button>
      )}

      <div className={`scrim ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`chat-sheet ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="chat-head">
          <div>
            <h3 className="display">ASCEND Assistant</h3>
            <span className="chat-sub">AI helper · can make mistakes, verify important details</span>
          </div>
          <button className="chat-close" onClick={() => setOpen(false)}>✕</button>
        </div>

        <div className="chat-log" ref={scrollRef}>
          {messages.map((m, i) => (
            <div className={`chat-msg ${m.role}`} key={i}>{m.content}</div>
          ))}
          {sending && <div className="chat-msg assistant chat-typing"><span /><span /><span /></div>}
          {error && <p className="chat-err">{error}</p>}
        </div>

        <div className="chat-input">
          <textarea
            rows={1}
            placeholder="Ask about your path, courses, targets… (EN / BM)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button className="chat-send" onClick={send} disabled={sending || !draft.trim()}>
            {sending ? '…' : 'Send'}
          </button>
        </div>
        <p className="chat-foot">Guidance, not official advice. Always verify deadlines and requirements on official sites.</p>
      </aside>
    </>
  );
}
