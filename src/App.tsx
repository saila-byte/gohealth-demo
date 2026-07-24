import { useCallback, useState } from 'react';
import { createConversation, endConversation, type Conversation } from './api';
import { Conversation as CallUI } from './components/cvi/components/conversation';
import { useRequestPermissions } from './components/cvi/hooks/use-request-permissions';
import type { ChatMessage } from './components/cvi/hooks/use-chat';
import './App.css';

const ROLES = [
  {
    value: 'new grad front desk associate, entry level',
    label: 'New Hire — Front Desk Associate',
  },
  {
    value: 'experienced medical assistant, mid level',
    label: 'Experienced Hire — Medical Assistant',
  },
  {
    value: 'senior physician / clinical lead, senior level',
    label: 'Senior Hire — Clinical Lead / Physician',
  },
] as const;

function Logo() {
  return (
    <img
      className="logo"
      src="/gohealth-logo.png"
      alt="GoHealth Urgent Care"
    />
  );
}

function TranscriptView({
  messages,
  hireName,
  onDone,
}: {
  messages: ChatMessage[];
  hireName: string;
  onDone: () => void;
}) {
  return (
    <main className="transcript">
      <div className="hero">
        <p className="eyebrow">Session complete</p>
        <h1>
          {hireName
            ? `Nice work, ${hireName}`
            : 'Your onboarding session is complete'}
        </h1>
        <p className="sub">
          Here’s a transcript of your conversation with Alex.
        </p>
      </div>

      <div className="transcriptCard">
        {messages.length === 0 ? (
          <p className="transcriptEmpty">
            No transcript was captured for this session.
          </p>
        ) : (
          <ol className="transcriptList">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`transcriptRow ${
                  m.role === 'replica' ? 'transcriptRowAlex' : 'transcriptRowYou'
                }`}
              >
                <span className="transcriptAuthor">
                  {m.role === 'replica' ? 'Alex' : 'You'}
                </span>
                <p className="transcriptText">{m.text}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <button type="button" className="primary transcriptDone" onClick={onDone}>
        Back to start
      </button>
    </main>
  );
}

function App() {
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>(ROLES[2].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [transcript, setTranscript] = useState<ChatMessage[] | null>(null);
  const requestPermissions = useRequestPermissions();

  const leave = useCallback(
    async (messages: ChatMessage[]) => {
      const id = conversation?.conversation_id;
      setTranscript(messages);
      setConversation(null);
      if (id) {
        try {
          await endConversation(id);
        } catch (e) {
          console.warn(e);
        }
      }
    },
    [conversation]
  );

  const reset = useCallback(() => {
    setTranscript(null);
    setError(null);
  }, []);

  const start = async () => {
    setError(null);
    setTranscript(null);
    setLoading(true);
    try {
      const hireName = name.trim();
      const conversational_context = hireName
        ? `The person joining is named ${hireName}. Their role/seniority context is: ${role}. Greet them warmly by name and tailor the depth and pacing of onboarding content to that seniority level.`
        : `The person joining has this role/seniority context: ${role}. Tailor the depth and pacing of onboarding content to that seniority level.`;

      await requestPermissions();
      const created = await createConversation({
        conversational_context,
      });
      setConversation(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start');
    } finally {
      setLoading(false);
    }
  };

  if (conversation) {
    return (
      <div className="app">
        <header className="topbar">
          <Logo />
        </header>
        <main className="call">
          <CallUI
            conversationUrl={conversation.conversation_url}
            conversationId={conversation.conversation_id}
            onLeave={leave}
          />
        </main>
      </div>
    );
  }

  if (transcript) {
    return (
      <div className="app">
        <header className="topbar">
          <Logo />
        </header>
        <TranscriptView
          messages={transcript}
          hireName={name.trim()}
          onDone={reset}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <Logo />
      </header>
      <main className="setup">
        <div className="hero">
          <p className="eyebrow">New hire onboarding</p>
          <h1>Meet your onboarding guide, Alex</h1>
          <p className="sub">
            A live, face-to-face welcome that walks you through day-one
            essentials — tailored to your role at GoHealth Urgent Care.
          </p>
        </div>
        <div className="card">
          <label htmlFor="name">First name</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jordan"
            disabled={loading}
          />

          <label htmlFor="role">Role / seniority</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={loading}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="primary"
            onClick={start}
            disabled={loading}
          >
            {loading ? 'Starting…' : 'Start conversation'}
          </button>
          {error ? <div className="error">{error}</div> : null}
        </div>
      </main>
    </div>
  );
}

export default App;
