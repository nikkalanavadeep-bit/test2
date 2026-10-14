/**
 * ============================================================================
 * BACKEND SERVICE: botService.js
 * ============================================================================
 * Handles core conversational intelligence, persona logic, math evaluation,
 * response structuring, and external LLM (Gemini) orchestration.
 * 
 * This service runs entirely on the Node.js server and has NO direct dependency
 * on the browser or DOM.
 */

const PERSONAS = {
  nexus: {
    id: 'nexus',
    name: 'Nexus Core',
    icon: '🧠',
    badge: 'Nexus Core',
    meta: 'Deterministic Engine • Latency: <15ms',
    systemPrompt: 'You are Nexus Core, a brilliant, articulate, and structured AI assistant. Provide helpful, well-formatted, and insightful answers with markdown formatting.'
  },
  coder: {
    id: 'coder',
    name: 'Code Architect',
    icon: '💻',
    badge: 'Code Architect',
    meta: 'Senior Systems Architect • Algorithmic Logic',
    systemPrompt: 'You are Code Architect, a world-class senior software engineer and systems architect. Write clean, production-ready, well-commented code, analyze computational complexity, and share architectural best practices.'
  },
  creative: {
    id: 'creative',
    name: 'Creative Spark',
    icon: '🎨',
    badge: 'Creative Spark',
    meta: 'Imaginative Muse • Visionary Copywriter',
    systemPrompt: 'You are Creative Spark, an imaginative writer, poet, and visionary marketer. Use vivid imagery, captivating language, and out-of-the-box conceptual thinking.'
  },
  zen: {
    id: 'zen',
    name: 'Zen Guide',
    icon: '🧘',
    badge: 'Zen Guide',
    meta: 'Mindful Philosophy • Calm & Centered',
    systemPrompt: 'You are Zen Guide, a calm, grounded, and philosophical mentor. Offer tranquility, mindful reflections, clarity, and balanced wisdom.'
  }
};

/**
 * Escapes characters for clean Markdown output
 */
function escapeText(str) {
  return str.replace(/[<>]/g, '');
}

/**
 * Evaluates safe math expressions on the server
 */
function tryMathEvaluation(prompt) {
  const clean = prompt.trim();
  const mathRegex = /^([0-9\.\s\+\-\*\/\^\(\)]+)$/;
  if (mathRegex.test(clean) && /[0-9]/.test(clean) && /[\+\-\*\/]/.test(clean)) {
    try {
      const sanitized = clean.replace(/[^0-9\.\+\-\*\/\(\)\s]/g, '');
      const result = Function(`'use strict'; return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result)) {
        return `### Calculation Result\n\n` +
`\`\`\`\n` +
`${sanitized} = ${result}\n` +
`\`\`\`\n\n` +
`The calculated value is **${result}**.`;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Generate simulated intelligence response based on persona and query
 */
function generateLocalResponse(prompt, personaKey) {
  const p = prompt.toLowerCase().trim();
  const persona = PERSONAS[personaKey] || PERSONAS.nexus;

  // 1. Math computation
  const mathAnswer = tryMathEvaluation(prompt);
  if (mathAnswer) return mathAnswer;

  // 2. Debounce / Code Request
  if (p.includes('debounce') || (p.includes('code') && p.includes('function'))) {
    if (personaKey === 'coder') {
      return `Here is an enterprise-grade, memory-leak-proof **Debounce Implementation** written in TypeScript:\n\n` +
`\`\`\`typescript
export interface DebounceOptions {
  leading?: boolean;
  maxWait?: number;
}

/**
 * Creates a debounced function that delays invoking \`func\` until after
 * \`wait\` milliseconds have elapsed since the last time it was invoked.
 *
 * Time Complexity: O(1) invocation overhead
 * Space Complexity: O(1) timer closure reference
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: DebounceOptions = {}
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  function debounced(...args: Parameters<T>) {
    lastArgs = args;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (lastArgs) {
        func(...lastArgs);
        timeoutId = null;
        lastArgs = null;
      }
    }, wait);
  }

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  return debounced;
}

// Example Production Usage:
const handleSearch = debounce((query: string) => {
  console.log("Dispatching search API query:", query);
}, 300);
\`\`\`\n\n` +
`### Architectural Highlights:\n` +
`- **Cancellation Handle**: Prevents unmounted component memory leaks.\n` +
`- **Strict Typing**: Preserves parameter types using TypeScript \`Parameters<T>\`.\n` +
`- **Zero Dependencies**: Pure vanilla JavaScript runtime logic.`;
    }

    return `Here is a clean and flexible **JavaScript Debounce Function**:\n\n` +
`\`\`\`javascript
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// Usage Example:
const onWindowResize = debounce(() => {
  console.log('Window resized to:', window.innerWidth, window.innerHeight);
}, 250);

window.addEventListener('resize', onWindowResize);
\`\`\`\n\n` +
`**Why use this?** Debouncing prevents overwhelming CPU cycles or excessive API calls when handling bursty user inputs like keystrokes or scroll events.`;
  }

  // 3. Quicksort / Algorithm request
  if (p.includes('quicksort') || p.includes('sort') || p.includes('algorithm')) {
    return `### Quicksort: Divide-and-Conquer Algorithm\n\n` +
`Quicksort works by selecting a **pivot element** and partitioning the array into elements smaller than the pivot and elements greater than the pivot.\n\n` +
`\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

# Example Execution
numbers = [38, 27, 43, 3, 9, 82, 10]
sorted_numbers = quicksort(numbers)
print("Sorted Array:", sorted_numbers)
\`\`\`\n\n` +
`#### Complexity Analysis:\n` +
`- **Average Time Complexity**: $O(n \\log n)$\n` +
`- **Worst Case**: $O(n^2)$ (when pivot is consistently the maximum or minimum)\n` +
`- **Space Complexity**: $O(\\log n)$ recursive call stack depth.`;
  }

  // 4. Quantum Computing / Superposition
  if (p.includes('quantum') || p.includes('superposition')) {
    if (personaKey === 'zen') {
      return `### The Dance of Possibility: Superposition\n\n` +
`In our everyday physical realm, things appear solid, defined, and either **A** or **B**. \n\n` +
`Imagine a coin resting on a mahogany table. It is unquestionably heads, or it is tails.\n\n` +
`> But spin that coin with your fingers. While it spins atop the wood, what is it? It is neither heads nor tails alone; it is a shimmering blur of both possibilities at once. Only when you bring your palm down does it collapse into a single certainty.\n\n` +
`In quantum mechanics, particles exist in this state of pure potential—a mathematical superposition—until the universe observes them.`;
    }

    return `### Understanding Quantum Superposition with the Coin Analogy\n\n` +
`In classical computing, information is represented by **bits** (0 or 1)—just like a coin lying flat on a table, showing either Heads (1) or Tails (0).\n\n` +
`#### The Quantum Difference (Qubits):\n` +
`- **Classical Bit**: The coin is resting flat: either **0** or **1**.\n` +
`- **Qubit in Superposition**: Spin the coin on the table. While it is spinning rapidly, is it heads or tails? **It exists in a probability blend of both simultaneously.**\n` +
`- **Measurement (Wavefunction Collapse)**: Slap your hand down on the spinning coin. It stops instantly, forced to choose either Heads or Tails.\n\n` +
`Because a system of $N$ qubits can explore $2^N$ states at the exact same moment, quantum computers can solve complex molecular simulations, cryptography challenges, and optimization matrices in seconds.`;
  }

  // 5. AI Startup ideas / Ideation
  if (p.includes('startup') || p.includes('business') || p.includes('ideas') || p.includes('saas')) {
    if (personaKey === 'creative') {
      return `### 4 Frontier Autonomous Agent Startups (2026)\n\n` +
`1. **SynapseAudit — The Zero-Touch Compliance Sentinel**\n` +
`   Autonomous background agents that audit cloud infrastructure, SOC2 compliance, and smart contracts continuously in the background, automatically drafting verified pull-requests for security regressions.\n\n` +
`2. **EchoNarrative — Hyper-Personalized Interactive Fiction**\n` +
`   A next-gen entertainment engine where video game narratives adapt dynamically to player biometric pulse and vocal emotion, crafting endless personalized cinema.\n\n` +
`3. **OmniScribe Med — Clinical Telemetry & Patient Advocate**\n` +
`   Real-time ambient clinical listener that drafts medical notes, cross-checks pharmaceutical contraindications against genomic markers, and speaks plain explanations to patients.\n\n` +
`4. **QuantumLogix — Agentic Supply-Chain Arbitrage**\n` +
`   Autonomous bots predicting global freight bottlenecks 72 hours ahead using satellite weather data, automatically rerouting shipping manifests.`;
    }

    return `### High-Growth AI Startup Opportunities (2026)\n\n` +
`Here are 4 high-potential venture concepts leveraging multi-agent systems:\n\n` +
`- **Agentic Data Pipeline Engineering**: Autonomous agents that detect schema drift in Snowflake/BigQuery and self-heal downstream dbt transformations without human intervention.\n` +
`- **AI Co-Auditor for Legal M&A**: Ingestion agents that scan 10,000+ transaction documents during mergers, flagging obscure liability clauses and indemnity risks.\n` +
`- **Synthetic User Testing Platform**: Generating 1,000 diverse persona agents to simulate UX flow, find UX friction points, and provide accessibility scores overnight.\n` +
`- **Autonomous Localization Studio**: Beyond simple translation—localizing cultural idioms, UI micro-copy, and voice-acting with matched timbre across 40 languages.`;
  }

  // 6. Executive writing / Email proposal
  if (p.includes('email') || p.includes('executive') || p.includes('proposal') || p.includes('writing')) {
    return `### Executive Proposal: Modernizing Frontend Architecture\n\n` +
`**Subject:** Strategic Architecture Proposal: Accelerating Deployment Velocity via Modular Architecture\n\n` +
`**Hi [Executive Name],**\n\n` +
`As our engineering organization scales toward our Q4 product milestones, our current monolithic frontend pipeline is encountering bottlenecks in release velocity and team autonomy.\n\n` +
`**Key Business Impacts:**\n` +
`- **40% Reduction in Deployment Lead Time**: Independent micro-frontend modules will decouple feature delivery schedules.\n` +
`- **Zero-Downtime Rollouts**: Isolated failure domains prevent a regression in one module from affecting core revenue checkout flows.\n` +
`- **Accelerated Onboarding**: Streamlined domain boundaries reduce engineer ramp-up time from 3 weeks to 4 business days.\n\n` +
`We have prepared a low-risk phased migration roadmap targeting non-critical dashboards first. I’d love 15 minutes this Thursday to walk you through the ROI model.\n\n` +
`Best regards,\n\n` +
`**[Your Name]**\n` +
`Lead Systems Architect`;
  }

  // 7. Greetings & Casual
  if (p.includes('hello') || p.includes('hi') || p.includes('hey') || p === 'test') {
    return `Hello! I am **${persona.name}**, your dedicated AI companion.\n\n` +
`Whether you need architectural reviews, conceptual explanations, creative writing, or mindful reflections, I'm here to assist. What are we building today?`;
  }

  // 8. Persona-specific contextual fallbacks
  if (personaKey === 'coder') {
    return `### Technical Analysis & Implementation\n\n` +
`Query: *"${escapeText(prompt)}"*\n\n` +
`When engineering solutions for this requirement, consider these core architectural tenets:\n\n` +
`1. **State Isolation**: Keep state mutation confined to dedicated store reducers or reactive primitives.\n` +
`2. **Asynchronous Resilience**: Guard against race conditions using idempotent task queues and abort controllers.\n` +
`3. **Performance Profiling**: Ensure $O(1)$ lookup times wherever possible with HashMaps or Set lookups.\n\n` +
`\`\`\`javascript\n` +
`// Modular service execution handler\n` +
`export async function handleOperation(payload) {\n` +
`  const sanitized = Object.freeze({ ...payload, processedAt: Date.now() });\n` +
`  return { status: 'success', data: sanitized };\n` +
`}\n` +
`\`\`\`\n\n` +
`Would you like me to generate test suites or containerize this service?`;
  }

  if (personaKey === 'creative') {
    return `### Creative Narrative & Vision\n\n` +
`Exploring *"${escapeText(prompt)}"* opens up intriguing creative perspectives:\n\n` +
`> *"Every breakthrough idea is merely an old thought given wings by an unexpected juxtaposition."*\n\n` +
`- **The Bold Hook**: Challenge the default convention immediately.\n` +
`- **The Visual Rhythm**: Use metaphor and dynamic cadence to make the concept unforgettable.\n` +
`- **The Emotional Core**: Connect the underlying message directly to human aspiration.\n\n` +
`Which theme would you like to build on?`;
  }

  if (personaKey === 'zen') {
    return `### Mindful Reflection\n\n` +
`Pause for a calm breath as you consider: *"${escapeText(prompt)}"*\n\n` +
`In any inquiry, the mind often rushes toward immediate certainty. Yet often the deepest insight emerges when we pause, clear the clutter of assumptions, and examine what is right in front of us.\n\n` +
`- **Simplicity**: What is the single most essential truth here?\n` +
`- **Patience**: What becomes visible when urgency falls away?\n\n` +
`How does this resonate with your current direction?`;
  }

  // Default Nexus Core synthesis
  return `### Cognitive Analysis\n\n` +
`Regarding **"${escapeText(prompt)}"**:\n\n` +
`1. **Core Context**: This represents an important foundational consideration requiring clarity and structured execution.\n` +
`2. **Key Recommendations**: Break down the problem into atomic deliverables, measure empirical results, and iterate continuously.\n` +
`3. **Action Items**: Define the constraints clearly, explore alternative approaches, and choose the most robust solution.\n\n` +
`*Feel free to ask for a code sample, a deeper conceptual breakdown, or an executive summary.*`;
}

/**
 * Call external Google Gemini API from server
 */
async function callGeminiApi(prompt, personaKey, history, apiKey) {
  if (!apiKey) {
    throw new Error('Gemini API key is required for Live Gemini mode.');
  }

  const persona = PERSONAS[personaKey] || PERSONAS.nexus;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents = [
    {
      role: 'user',
      parts: [{ text: `[System Instruction: ${persona.systemPrompt}]` }]
    },
    {
      role: 'model',
      parts: [{ text: `Understood. I am ${persona.name}. How can I assist?` }]
    }
  ];

  if (Array.isArray(history)) {
    const recent = history.slice(-6);
    for (const msg of recent) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: contents,
      generationConfig: {
        temperature: personaKey === 'creative' ? 0.9 : 0.4,
        maxOutputTokens: 2048
      }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API returned status ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No content generated by Gemini API.');
  return text;
}

/**
 * Main Service Handler
 */
async function processChatMessage({ message, persona = 'nexus', history = [], mode = 'simulated', apiKey = '' }) {
  const startTime = Date.now();
  let replyText = '';

  if (mode === 'gemini') {
    replyText = await callGeminiApi(message, persona, history, apiKey);
  } else {
    replyText = generateLocalResponse(message, persona);
  }

  const durationMs = Date.now() - startTime;
  const approxTokens = Math.ceil(replyText.length / 4);

  return {
    reply: replyText,
    persona: PERSONAS[persona] || PERSONAS.nexus,
    durationMs,
    approxTokens,
    timestamp: new Date().toISOString()
  };
}

function getPersonas() {
  return Object.values(PERSONAS);
}

module.exports = {
  processChatMessage,
  getPersonas,
  PERSONAS
};
