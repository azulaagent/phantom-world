import { useState, useEffect, useRef } from 'react';
import EntitySVG from './EntitySVG';
import { sendMessage, buildSystemPrompt, buildEvolutionPrompt } from './api';
import {
  createEntity, loadEntity, saveEntity, deleteEntity,
  updateBond, addMemory, getEvolutionInfo, getTimeUntilDeath,
  reviveEntity, TRAITS, EVOLUTION_STAGES
} from './engine';

export default function App() {
  const [entity, setEntity] = useState(null);
  const [screen, setScreen] = useState('loading'); // loading, create, main, dead, settings
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [createStep, setCreateStep] = useState(0); // 0: name, 1: trait
  const [newName, setNewName] = useState('');
  const [selectedTrait, setSelectedTrait] = useState(null);
  const [toast, setToast] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const saved = loadEntity();
    const savedKey = localStorage.getItem('phantom_api_key') || '';
    setApiKey(savedKey);
    if (saved) {
      setEntity(saved);
      setScreen(saved.alive ? 'main' : 'dead');
      // Load chat history
      const savedChat = localStorage.getItem('phantom_chat');
      if (savedChat) setMessages(JSON.parse(savedChat));
    } else {
      setScreen('create');
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreate = () => {
    if (createStep === 0) {
      if (!newName.trim()) return;
      setCreateStep(1);
    } else {
      if (!selectedTrait) return;
      const e = createEntity(newName.trim(), selectedTrait);
      setEntity(e);
      saveEntity(e);
      setScreen('main');
      showToast(`${e.name} has been born! ✨`, 'success');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !entity?.alive) return;
    if (!apiKey) {
      showToast('Set your API key in Settings first', 'error');
      return;
    }

    const userMsg = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Build conversation with system prompt
      const systemPrompt = buildSystemPrompt(entity);
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...newMessages.slice(-10), // last 10 messages for context
      ];

      const reply = await sendMessage(apiMessages, apiKey);
      
      // Parse response for bond/memory updates
      let bondDelta = 1;
      let memoryText = null;
      let cleanReply = reply;

      try {
        // Try to parse JSON response
        const parsed = JSON.parse(reply);
        cleanReply = parsed.reply || reply;
        bondDelta = parsed.bondDelta || 1;
        memoryText = parsed.memory || null;
      } catch {
        // Not JSON, use as-is with default bond delta
        bondDelta = Math.random() > 0.3 ? 1 : 0;
      }

      // Update entity
      const updated = updateBond(entity, bondDelta);
      if (memoryText) addMemory(updated, memoryText);
      setEntity({ ...updated });

      // Add AI response
      const aiMsg = { role: 'assistant', content: cleanReply };
      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);
      localStorage.setItem('phantom_chat', JSON.stringify(finalMessages));

      // Check evolution
      const oldStage = entity.evolutionStage;
      if (updated.evolutionStage !== oldStage) {
        const stageInfo = EVOLUTION_STAGES[updated.evolutionStage];
        showToast(`✨ ${updated.name} evolved to ${stageInfo.name}!`, 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
      setMessages(newMessages); // rollback
    } finally {
      setLoading(false);
    }
  };

  const handleRevive = () => {
    const revived = reviveEntity(entity);
    setEntity(revived);
    setMessages([]);
    localStorage.removeItem('phantom_chat');
    setScreen('main');
    showToast(`${revived.name} has been revived! 💫`, 'success');
  };

  const handleDelete = () => {
    deleteEntity();
    localStorage.removeItem('phantom_chat');
    setEntity(null);
    setMessages([]);
    setScreen('create');
    setCreateStep(0);
    setNewName('');
    setSelectedTrait(null);
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('phantom_api_key', apiKey);
    setShowSettings(false);
    showToast('API key saved', 'success');
  };

  // Loading screen
  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-2xl mb-2">👻</div>
          <p className="text-mist text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Create screen
  if (screen === 'create') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full animate-slide-up">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold glow-text mb-2">Phantom</h1>
            <p className="text-mist text-sm">Create your digital companion</p>
          </div>

          {createStep === 0 ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-spirit mb-2">Name your entity</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="Enter a name..."
                  className="w-full bg-void/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-mist/30 focus:outline-none focus:border-glow/50 transition"
                  maxLength={20}
                  autoFocus
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="w-full py-3 rounded-lg bg-glow/20 border border-glow/30 text-glow font-medium hover:bg-glow/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-spirit mb-3">Choose a personality</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(TRAITS).map(([key, trait]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedTrait(key)}
                      className={`p-3 rounded-xl border text-left transition ${
                        selectedTrait === key
                          ? 'border-glow/50 bg-glow/10'
                          : 'border-white/5 bg-void/30 hover:border-white/10'
                      }`}
                    >
                      <div className="text-lg mb-1">{trait.emoji}</div>
                      <div className="text-sm font-medium capitalize">{key}</div>
                      <div className="text-xs text-mist/60">{trait.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCreateStep(0)}
                  className="flex-1 py-3 rounded-lg border border-white/10 text-mist hover:bg-white/5 transition"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!selectedTrait}
                  className="flex-1 py-3 rounded-lg bg-glow/20 border border-glow/30 text-glow font-medium hover:bg-glow/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Create {newName}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/5">
            <button
              onClick={() => setShowSettings(true)}
              className="text-xs text-mist/40 hover:text-mist transition"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && <SettingsModal apiKey={apiKey} setApiKey={setApiKey} onSave={handleSaveApiKey} onClose={() => setShowSettings(false)} />}

        {/* Toast */}
        {toast && <Toast {...toast} />}
      </div>
    );
  }

  // Dead screen
  if (screen === 'dead') {
    const hoursDead = Math.round((Date.now() - entity.lastInteraction) / (1000 * 60 * 60));
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center animate-slide-up">
          <div className="mb-6">
            <EntitySVG entity={entity} size={160} />
          </div>
          <h2 className="text-2xl font-bold text-mist mb-2">{entity.name}</h2>
          <p className="text-glow text-sm mb-4">has faded away</p>
          <p className="text-mist/60 text-xs mb-8">
            Abandoned for {hoursDead} hours. An entity needs care to survive.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleRevive}
              className="w-full py-3 rounded-lg bg-pulse/20 border border-pulse/30 text-pulse font-medium hover:bg-pulse/30 transition"
            >
              💫 Revive {entity.name}
            </button>
            <button
              onClick={handleDelete}
              className="w-full py-3 rounded-lg border border-white/10 text-mist/40 hover:text-mist hover:bg-white/5 transition text-sm"
            >
              Let go & start over
            </button>
          </div>
        </div>
        {toast && <Toast {...toast} />}
      </div>
    );
  }

  // Main screen
  const stageInfo = EVOLUTION_STAGES[entity.evolutionStage];
  const timeLeft = getTimeUntilDeath(entity);
  const hoursLeft = Math.round(timeLeft);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass border-b border-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: entity.traitColor + '30' }}>
            {entity.traitEmoji}
          </div>
          <div>
            <h1 className="text-sm font-semibold">{entity.name}</h1>
            <div className="flex items-center gap-2 text-xs text-mist/60">
              <span>{stageInfo.name}</span>
              <span>·</span>
              <span className={entity.mood === 'happy' ? 'text-green-400' : entity.mood === 'sad' ? 'text-yellow-400' : entity.mood === 'anxious' ? 'text-red-400' : 'text-mist/60'}>
                {entity.mood}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-mist/40">Bond</div>
            <div className="text-sm font-mono">{entity.bond}%</div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg hover:bg-white/5 transition text-mist/40 hover:text-mist"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Entity Display */}
      <div className="flex-shrink-0 py-6 flex justify-center">
        <EntitySVG entity={entity} size={160} />
      </div>

      {/* Bond Bar */}
      <div className="px-6 mb-4">
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${entity.bond}%`,
              background: `linear-gradient(90deg, ${entity.traitColor}60, ${entity.traitColor})`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-mist/30">{stageInfo.name}</span>
          <span className="text-[10px] text-mist/30">
            {hoursLeft > 0 ? `${hoursLeft}h until fade` : '⚠️ Danger'}
          </span>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center py-12 text-mist/30 text-sm">
            <p className="mb-1">Say hello to {entity.name}</p>
            <p className="text-xs">{entity.personality}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`mb-3 animate-fade-in ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div
              className={`inline-block max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-ether/40 text-white rounded-br-md'
                  : 'glass text-mist rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-left mb-3">
            <div className="inline-block glass px-4 py-2 rounded-2xl rounded-bl-md text-sm text-mist/50">
              <span className="animate-pulse">thinking...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 glass border-t border-white/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={entity.alive ? `Talk to ${entity.name}...` : `${entity.name} can't hear you...`}
            disabled={!entity.alive || loading}
            className="flex-1 bg-void/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-mist/30 focus:outline-none focus:border-glow/30 transition disabled:opacity-30"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || !entity.alive}
            className="px-5 py-3 rounded-xl bg-glow/20 border border-glow/30 text-glow text-sm font-medium hover:bg-glow/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          apiKey={apiKey}
          setApiKey={setApiKey}
          onSave={handleSaveApiKey}
          onClose={() => setShowSettings(false)}
          entity={entity}
          onDelete={handleDelete}
        />
      )}

      {/* Toast */}
      {toast && <Toast {...toast} />}
    </div>
  );
}

function SettingsModal({ apiKey, setApiKey, onSave, onClose, entity, onDelete }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass rounded-2xl p-6 max-w-sm w-full animate-slide-up" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-spirit mb-1">MiMo API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="tp-..."
              className="w-full bg-void/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-mist/30 focus:outline-none focus:border-glow/30 transition"
            />
          </div>

          {entity && (
            <div className="pt-2 border-t border-white/5">
              <div className="text-xs text-mist/40 mb-2">Entity Info</div>
              <div className="space-y-1 text-xs text-mist/60">
                <div>ID: {entity.id}</div>
                <div>Messages: {entity.totalMessages}</div>
                <div>Created: {new Date(entity.createdAt).toLocaleDateString()}</div>
                <div>Memories: {entity.memories.length}</div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-mist text-sm hover:bg-white/5 transition">
              Cancel
            </button>
            <button onClick={onSave} className="flex-1 py-2 rounded-lg bg-glow/20 border border-glow/30 text-glow text-sm font-medium hover:bg-glow/30 transition">
              Save
            </button>
          </div>

          {entity && onDelete && (
            <button
              onClick={() => { if (confirm('Delete this entity permanently?')) onDelete(); }}
              className="w-full py-2 rounded-lg border border-red-500/20 text-red-400/60 text-xs hover:bg-red-500/10 transition"
            >
              Delete Entity
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Toast({ msg, type }) {
  const colors = {
    success: 'bg-green-500/20 border-green-500/30 text-green-300',
    error: 'bg-red-500/20 border-red-500/30 text-red-300',
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
  };
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg border text-sm animate-fade-in ${colors[type] || colors.info}`}>
      {msg}
    </div>
  );
}
