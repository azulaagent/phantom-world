// Phantom Entity Engine - State management & evolution logic

const STORAGE_KEY = 'phantom_entity';

const TRAITS = {
  curious: { emoji: '🔍', color: '#4fc3f7', desc: 'Always asking questions' },
  playful: { emoji: '🎮', color: '#81c784', desc: 'Loves games and jokes' },
  wise: { emoji: '📚', color: '#ba68c8', desc: 'Contemplative and deep' },
  fierce: { emoji: '🔥', color: '#e57373', desc: 'Bold and competitive' },
  mysterious: { emoji: '🌙', color: '#7986cb', desc: 'Speaks in riddles' },
  gentle: { emoji: '🌸', color: '#f06292', desc: 'Kind and empathetic' },
};

const EVOLUTION_STAGES = [
  { name: 'Spark', minBond: 0, maxBond: 20, size: 40, complexity: 1 },
  { name: 'Ember', minBond: 20, maxBond: 40, size: 55, complexity: 2 },
  { name: 'Flame', minBond: 40, maxBond: 60, size: 70, complexity: 3 },
  { name: 'Blaze', minBond: 60, maxBond: 80, size: 85, complexity: 4 },
  { name: 'Supernova', minBond: 80, maxBond: 100, size: 100, complexity: 5 },
];

const DEATH_THRESHOLD_HOURS = 72; // 3 days without interaction

export function createEntity(name, traitKey) {
  const trait = TRAITS[traitKey];
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    trait: traitKey,
    traitEmoji: trait.emoji,
    traitColor: trait.color,
    traitDesc: trait.desc,
    bond: 5, // starting bond
    mood: 'neutral', // happy, neutral, sad, anxious
    memories: [], // key memories from conversations
    evolutionStage: 0,
    createdAt: Date.now(),
    lastInteraction: Date.now(),
    totalMessages: 0,
    personality: generateInitialPersonality(traitKey),
    alive: true,
    causeOfDeath: null,
  };
}

function generateInitialPersonality(trait) {
  const personalities = {
    curious: "I'm always wondering about things. Why is the sky dark? What lies beyond? Tell me something I don't know.",
    playful: "Hey hey hey! Let's play! Want to hear a riddle? I bet I can make you laugh!",
    wise: "Every conversation teaches us something. What wisdom do you bring today?",
    fierce: "I don't back down from challenges. Bring it on. What's on your mind?",
    mysterious: "The shadows whisper secrets... Do you dare to listen?",
    gentle: "Hello, friend. I'm here for you. How are you feeling today?",
  };
  return personalities[trait] || personalities.curious;
}

export function loadEntity() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const entity = JSON.parse(raw);
    // Check if entity has died
    const hoursSinceInteraction = (Date.now() - entity.lastInteraction) / (1000 * 60 * 60);
    if (entity.alive && hoursSinceInteraction > DEATH_THRESHOLD_HOURS) {
      entity.alive = false;
      entity.causeOfDeath = 'abandoned';
      saveEntity(entity);
    }
    return entity;
  } catch {
    return null;
  }
}

export function saveEntity(entity) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entity));
}

export function deleteEntity() {
  localStorage.removeItem(STORAGE_KEY);
}

export function updateBond(entity, delta) {
  entity.bond = Math.max(0, Math.min(100, entity.bond + delta));
  entity.lastInteraction = Date.now();
  entity.totalMessages += 1;
  
  // Update evolution stage
  const newStage = EVOLUTION_STAGES.findIndex(s => entity.bond >= s.minBond && entity.bond < s.maxBond);
  if (newStage >= 0 && newStage !== entity.evolutionStage) {
    entity.evolutionStage = newStage;
  }
  
  // Update mood based on bond
  if (entity.bond >= 70) entity.mood = 'happy';
  else if (entity.bond >= 40) entity.mood = 'neutral';
  else if (entity.bond >= 20) entity.mood = 'sad';
  else entity.mood = 'anxious';
  
  saveEntity(entity);
  return entity;
}

export function addMemory(entity, memory) {
  entity.memories.push({
    text: memory,
    timestamp: Date.now(),
  });
  // Keep only last 20 memories
  if (entity.memories.length > 20) {
    entity.memories = entity.memories.slice(-20);
  }
  saveEntity(entity);
}

export function getEvolutionInfo(bond) {
  return EVOLUTION_STAGES.find(s => bond >= s.minBond && bond < s.maxBond) || EVOLUTION_STAGES[0];
}

export function getTimeUntilDeath(entity) {
  if (!entity.alive) return 0;
  const hoursSince = (Date.now() - entity.lastInteraction) / (1000 * 60 * 60);
  return Math.max(0, DEATH_THRESHOLD_HOURS - hoursSince);
}

export function reviveEntity(entity) {
  entity.alive = true;
  entity.causeOfDeath = null;
  entity.bond = Math.max(10, entity.bond - 20); // penalty
  entity.lastInteraction = Date.now();
  entity.mood = 'neutral';
  saveEntity(entity);
  return entity;
}

export { TRAITS, EVOLUTION_STAGES };
