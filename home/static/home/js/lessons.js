// ══════════════════════════════════════════════
//  lessons.js — BitBot Interactive Lesson System
// ══════════════════════════════════════════════

// ── State ──────────────────────────────────────
let currentLesson = null;
let currentQ = 0;
let hearts = window.BITBOT_DATA?.usuario?.vidas ?? 5;   // sincronizado con servidor
let score = 0;
let answers = [];
let matchState = { pairs: [], selected: null, matched: [] };
let awaitingNext = false;

// ── Lesson Data ────────────────────────────────
const LESSONS_DATA = [

  // ══ MODULE 1.1 — What Is Money? ══

  {
    id: 'l1_1_1',
    module: '1.1',
    moduleTitle: 'What Is Money?',
    title: 'The Problem Without Money',
    intro: 'Before money existed, people traded goods directly — a farmer might trade wheat for a blacksmith\'s tools. This system, called barter, seems simple but creates a fundamental economic problem.',
    insightLabel: 'Key Insight',
    insight: 'Barter requires a "double coincidence of wants": both parties must have exactly what the other needs, at the same time.',
    xp: 20,
    questions: [
      {
        type: 'multiple',
        q: 'What is the main problem with barter economies?',
        options: ['Goods are too heavy to carry', 'Both parties must want what the other has', 'There is no way to set prices'],
        correct: 1,
        explanation: 'This is called the "double coincidence of wants" — finding someone who has what you need AND wants what you have is extremely difficult.'
      },
      {
        type: 'truefalse',
        q: 'Barter is more efficient than using money for complex economies.',
        correct: false,
        explanation: 'Barter breaks down in complex economies. Money solves this by acting as a universal medium everyone accepts.'
      },
      {
        type: 'fillin',
        q: 'Barter requires a double coincidence of ___.',
        answer: 'wants',
        hints: ['needs', 'wants', 'goods'],
        explanation: 'Both parties must simultaneously want what the other offers — called the double coincidence of wants.'
      },
      {
        type: 'match',
        q: 'Match each concept to its definition.',
        pairs: [
          { left: 'Barter', right: 'Direct trade of goods' },
          { left: 'Double coincidence', right: 'Both parties need what the other has' },
          { left: 'Medium of exchange', right: 'Something accepted by all parties' }
        ],
        explanation: 'Money solves barter\'s limitations by being a universal medium of exchange everyone accepts.'
      }
    ]
  },

  {
    id: 'l1_1_2',
    module: '1.1',
    moduleTitle: 'What Is Money?',
    title: 'What Money Does',
    intro: 'Money is a technology — an invention that solves the problems of barter. It performs three critical functions that make complex economies possible.',
    insightLabel: 'Three Functions',
    insight: 'Money stores value over time, enables exchange between parties, and provides a common unit to measure the worth of anything.',
    xp: 20,
    questions: [
      {
        type: 'multiple',
        q: 'Which of the following is NOT a function of money?',
        options: ['Store of value', 'Unit of account', 'Source of happiness'],
        correct: 2,
        explanation: 'Money\'s three core functions are: store of value, medium of exchange, and unit of account (measure of value).'
      },
      {
        type: 'truefalse',
        q: 'A "unit of account" means money can be used to measure the value of goods and services.',
        correct: true,
        explanation: 'When everything is priced in the same currency, comparing values becomes straightforward — that\'s money as a unit of account.'
      },
      {
        type: 'match',
        q: 'Match each function of money to its example.',
        pairs: [
          { left: 'Store of value', right: 'Saving $100 for next month' },
          { left: 'Medium of exchange', right: 'Paying for coffee' },
          { left: 'Unit of account', right: 'Comparing prices at two stores' }
        ],
        explanation: 'These three functions work together to make money a powerful economic tool.'
      },
      {
        type: 'fillin',
        q: 'Money acts as a ___ of value, allowing people to save purchasing power over time.',
        answer: 'store',
        hints: ['store', 'source', 'unit'],
        explanation: 'As a store of value, money preserves purchasing power across time — unlike perishable goods.'
      }
    ]
  },

  {
    id: 'l1_1_3',
    module: '1.1',
    moduleTitle: 'What Is Money?',
    title: 'Properties of Good Money',
    intro: 'Not everything can serve as money. History is full of failed experiments — from shells to cigarettes to iron bars. Good money must have specific properties to function reliably across time and space.',
    insightLabel: 'Key Properties',
    insight: 'Good money is scarce, durable, portable, divisible, and verifiable. Fail any one of these and it breaks down as a monetary good.',
    xp: 20,
    questions: [
      {
        type: 'multiple',
        q: 'Why must good money be scarce?',
        options: ['So governments can control it', 'So its supply cannot be inflated away', 'So it is harder to counterfeit'],
        correct: 1,
        explanation: 'Scarcity ensures value is preserved. If money can be created without limit, its purchasing power collapses — like historical hyperinflations.'
      },
      {
        type: 'truefalse',
        q: 'Bananas would make great money because they are widely available and everyone wants them.',
        correct: false,
        explanation: 'Bananas rot (not durable), are bulky (not portable), and grow abundantly (not scarce). Good money requires all five properties simultaneously.'
      },
      {
        type: 'match',
        q: 'Match each property to why it matters.',
        pairs: [
          { left: 'Divisible', right: 'Can make exact change' },
          { left: 'Durable', right: 'Lasts over time without degrading' },
          { left: 'Verifiable', right: 'Easy to confirm it is genuine' }
        ],
        explanation: 'Each property solves a specific practical problem in using something as money across a society.'
      },
      {
        type: 'fillin',
        q: 'Gold was used as money for centuries because it is scarce, durable, portable, divisible, and ___.',
        answer: 'verifiable',
        hints: ['verifiable', 'beautiful', 'valuable'],
        explanation: 'Verifiability means anyone can confirm the authenticity of the money without complex tools — gold\'s chemical properties make this easy.'
      }
    ]
  },

  {
    id: 'l1_1_4',
    module: '1.1',
    moduleTitle: 'What Is Money?',
    title: 'Why Money Fails',
    intro: 'Even well-designed money systems eventually fail. The core vulnerability: when the supply of money grows faster than the production of goods and services, each unit of money buys less over time.',
    insightLabel: 'Root Cause',
    insight: 'Money fails when its supply can be increased arbitrarily. More money chasing the same goods means higher prices — this is inflation.',
    xp: 20,
    questions: [
      {
        type: 'multiple',
        q: 'What happens when the money supply increases faster than economic output?',
        options: ['Prices fall and people get richer', 'Prices rise and purchasing power falls', 'Nothing — supply and demand balance automatically'],
        correct: 1,
        explanation: 'More money competing for the same goods drives prices up. Each unit of currency buys less — this is inflation eroding purchasing power.'
      },
      {
        type: 'truefalse',
        q: 'Inflation means your money buys more things over time.',
        correct: false,
        explanation: 'Inflation means prices rise — so the same amount of money buys LESS over time. Deflation would mean prices fall and money buys more.'
      },
      {
        type: 'fillin',
        q: 'When governments print too much money, the result is ___, which reduces purchasing power.',
        answer: 'inflation',
        hints: ['inflation', 'deflation', 'recession'],
        explanation: 'Inflation is the direct result of money supply growth outpacing production. It acts as a hidden tax on savings.'
      },
      {
        type: 'match',
        q: 'Match the historical example to the monetary lesson.',
        pairs: [
          { left: 'Roman coin debasement', right: 'Adding cheap metals to reduce gold content' },
          { left: 'Weimar Germany 1923', right: 'Hyperinflation from printing too much currency' },
          { left: 'Gold standard', right: 'Limits money supply to available gold reserves' }
        ],
        explanation: 'History shows that every monetary system without hard supply limits eventually collapses under the temptation to create more money.'
      }
    ]
  },

  // ══ MODULE 1.2 — The Modern Money System ══

  {
    id: 'l1_2_1',
    module: '1.2',
    moduleTitle: 'The Modern Money System',
    title: 'Fiat Money',
    intro: 'Today\'s currencies — dollars, euros, pesos — are called "fiat" money. They are not backed by gold or any physical commodity. Their value comes entirely from government decree and social trust.',
    insightLabel: 'What "Fiat" Means',
    insight: '"Fiat" is Latin for "let it be done" — a government declaration. Fiat money has value because the state says it does and people collectively believe it.',
    xp: 20,
    questions: [
      {
        type: 'multiple',
        q: 'What backs the value of fiat money?',
        options: ['Gold reserves in government vaults', 'Government decree and collective trust', 'The country\'s GDP output'],
        correct: 1,
        explanation: 'Since 1971 when the US abandoned the gold standard, fiat currencies are backed only by government authority and social trust — not physical assets.'
      },
      {
        type: 'truefalse',
        q: 'The US dollar is currently backed by gold stored at Fort Knox.',
        correct: false,
        explanation: 'The US abandoned the gold standard in 1971 under Nixon. The dollar\'s value today rests on government authority, legal tender laws, and trust.'
      },
      {
        type: 'fillin',
        q: 'The word "fiat" comes from Latin and means "let it ___".',
        answer: 'be done',
        hints: ['be done', 'be gold', 'be traded'],
        explanation: 'Fiat is a government decree — an order that something shall be so. Fiat money is money because the government declares it to be.'
      },
      {
        type: 'match',
        q: 'Match the monetary system to its backing.',
        pairs: [
          { left: 'Gold standard', right: 'Currency redeemable for gold' },
          { left: 'Fiat system', right: 'Backed by government authority' },
          { left: 'Commodity money', right: 'The money itself has intrinsic value' }
        ],
        explanation: 'Understanding what backs a currency helps evaluate its long-term trustworthiness and vulnerability to inflation.'
      }
    ]
  },

  {
    id: 'l1_2_2',
    module: '1.2',
    moduleTitle: 'The Modern Money System',
    title: 'Money Creation',
    intro: 'Most people think money is printed by governments and distributed. The reality is more complex: most money in existence was created by commercial banks through the act of lending.',
    insightLabel: 'Fractional Reserve Banking',
    insight: 'Banks lend out more money than they hold in deposits. When you take a loan, the bank creates new money — digital entries that didn\'t exist before.',
    xp: 20,
    questions: [
      {
        type: 'multiple',
        q: 'Who creates most of the money in circulation in modern economies?',
        options: ['The government\'s printing press', 'Commercial banks through lending', 'Central banks through open market operations'],
        correct: 1,
        explanation: 'Commercial banks create money through loans. When a bank issues a mortgage, it credits your account — creating new deposits that didn\'t exist before.'
      },
      {
        type: 'truefalse',
        q: 'In fractional reserve banking, banks must keep 100% of deposits in reserve.',
        correct: false,
        explanation: 'In fractional reserve banking, banks only keep a fraction of deposits as reserves and can lend out the rest — effectively creating new money.'
      },
      {
        type: 'match',
        q: 'Match each institution to its role in money creation.',
        pairs: [
          { left: 'Central bank', right: 'Sets interest rates, issues base money' },
          { left: 'Commercial bank', right: 'Creates money through loans to customers' },
          { left: 'Reserve requirement', right: 'Minimum fraction of deposits banks must hold' }
        ],
        explanation: 'The modern monetary system is a layered hierarchy: central banks control base money, commercial banks multiply it through credit.'
      },
      {
        type: 'fillin',
        q: 'When a bank issues a loan, it creates new money as a ___ entry in its ledger.',
        answer: 'digital',
        hints: ['digital', 'physical', 'paper'],
        explanation: 'Over 90% of money today exists only as digital ledger entries — not physical cash. Banks create it with a keystroke when approving loans.'
      }
    ]
  },

  {
    id: 'l1_2_3',
    module: '1.2',
    moduleTitle: 'The Modern Money System',
    title: 'Inflation',
    intro: 'Inflation is not just rising prices — it\'s the consequence of monetary expansion. When more money is created than economic output grows, each existing unit of money loses purchasing power.',
    insightLabel: 'Inflation Is a Tax',
    insight: 'Inflation silently redistributes wealth. Those who receive new money first (banks, governments) benefit. Those who save in cash lose purchasing power — a hidden tax on savers.',
    xp: 20,
    questions: [
      {
        type: 'multiple',
        q: 'Who benefits most from inflation?',
        options: ['People who hold cash savings', 'Debtors and those who receive new money first', 'Retirees on fixed incomes'],
        correct: 1,
        explanation: 'Debtors benefit because they repay with cheaper future money. Those who receive newly created money first (like banks) spend it before prices adjust.'
      },
      {
        type: 'truefalse',
        q: 'A 2% annual inflation rate means prices double roughly every 36 years.',
        correct: true,
        explanation: 'Using the "Rule of 72": 72 ÷ 2% = 36 years for prices to double. This is why long-term savers in fiat lose significant purchasing power.'
      },
      {
        type: 'fillin',
        q: 'Inflation acts as a hidden ___ on savings, since cash loses purchasing power over time.',
        answer: 'tax',
        hints: ['tax', 'fee', 'gain'],
        explanation: 'No legislation is needed — inflation quietly erodes the value of savings, effectively transferring wealth from savers to those who control money creation.'
      },
      {
        type: 'match',
        q: 'Match the inflation rate to its consequence.',
        pairs: [
          { left: '2% annual inflation', right: 'Purchasing power halves in ~36 years' },
          { left: '10% annual inflation', right: 'Savings lose half value in ~7 years' },
          { left: 'Hyperinflation', right: 'Currency becomes worthless within months' }
        ],
        explanation: 'Even "low" inflation compounds dramatically over time, making it one of the greatest threats to long-term savings.'
      }
    ]
  },

  {
    id: 'l1_2_4',
    module: '1.2',
    moduleTitle: 'The Modern Money System',
    title: 'The Trust Problem',
    intro: 'The entire modern monetary system runs on trust — trust that central banks will be responsible, that governments won\'t debase the currency, that the system will function tomorrow as it does today. But trust can be violated.',
    insightLabel: 'Institutional Risk',
    insight: 'When monetary policy is controlled by humans, it can be corrupted by politics, war, debt, or incompetence. History shows no fiat currency has survived indefinitely.',
    xp: 20,
    questions: [
      {
        type: 'multiple',
        q: 'What is the fundamental weakness of a trust-based monetary system?',
        options: ['Digital transactions are vulnerable to hacking', 'Those controlling supply can mismanage or abuse it', 'International exchange rates fluctuate'],
        correct: 1,
        explanation: 'Any system requiring trust in human institutions is vulnerable to mismanagement, political pressure, corruption, or crisis — regardless of good intentions.'
      },
      {
        type: 'truefalse',
        q: 'Every major fiat currency in history has maintained its value over centuries.',
        correct: false,
        explanation: 'No fiat currency has survived indefinitely. The average lifespan of a fiat currency is around 27 years. Many have ended in hyperinflation or collapse.'
      },
      {
        type: 'fillin',
        q: 'Fiat money systems require ___ in governments and central banks to function.',
        answer: 'trust',
        hints: ['trust', 'gold', 'laws'],
        explanation: 'Trust is the foundation — and the vulnerability — of fiat money. Bitcoin was designed to remove this requirement.'
      },
      {
        type: 'match',
        q: 'Match each event to the trust failure it represents.',
        pairs: [
          { left: 'Government freezes bank accounts', right: 'Custodial risk — your money isn\'t yours' },
          { left: 'Central bank prints to fund war', right: 'Supply can be inflated for political reasons' },
          { left: 'Bank run collapse', right: 'Fractional reserves mean deposits don\'t fully exist' }
        ],
        explanation: 'Bitcoin was created specifically to address these trust failures — replacing institutional trust with mathematical certainty.'
      }
    ]
  },

  // ══ MODULE 1.3 — Bitcoin Introduction ══

  {
    id: 'l1_3_1',
    module: '1.3',
    moduleTitle: 'Bitcoin Introduction',
    title: 'What Is Bitcoin?',
    intro: 'Bitcoin was created in 2009 by a pseudonymous person (or group) called Satoshi Nakamoto. It was the first solution to a problem that had stumped cryptographers for decades: how to create digital money that cannot be counterfeited or double-spent, without a trusted central authority.',
    insightLabel: 'The Core Innovation',
    insight: 'Bitcoin is a decentralized digital currency — no government, bank, or company controls it. Rules are enforced by code and mathematics, not institutions.',
    xp: 20,
    questions: [
      {
        type: 'multiple',
        q: 'Who created Bitcoin?',
        options: ['Elon Musk', 'Satoshi Nakamoto', 'The US Federal Reserve'],
        correct: 1,
        explanation: 'Satoshi Nakamoto — an anonymous individual or group — published the Bitcoin whitepaper in 2008 and launched the network in January 2009.'
      },
      {
        type: 'truefalse',
        q: 'Bitcoin is controlled by a central company or government.',
        correct: false,
        explanation: 'Bitcoin has no central controller. It runs on a distributed network of thousands of computers worldwide, governed by open-source code that anyone can audit.'
      },
      {
        type: 'fillin',
        q: 'Bitcoin was designed to solve the double-spend problem without a ___ authority.',
        answer: 'central',
        hints: ['central', 'digital', 'financial'],
        explanation: 'Previously, digital money required a trusted third party to prevent double-spending. Bitcoin solved this cryptographically, eliminating the need for trust in any central entity.'
      },
      {
        type: 'match',
        q: 'Match each Bitcoin concept to its meaning.',
        pairs: [
          { left: 'Decentralized', right: 'No single point of control' },
          { left: 'Satoshi Nakamoto', right: 'Bitcoin\'s anonymous creator' },
          { left: 'Whitepaper', right: 'The 2008 document describing Bitcoin' }
        ],
        explanation: 'Understanding Bitcoin\'s origins helps explain why it was designed the way it was — as a response to centralized financial failures.'
      }
    ]
  },

  {
    id: 'l1_3_2',
    module: '1.3',
    moduleTitle: 'Bitcoin Introduction',
    title: 'Key Properties of Bitcoin',
    intro: 'Bitcoin was engineered to have properties that no previous money — physical or digital — could achieve simultaneously. These properties make it uniquely suited to solve the problems of fiat money.',
    insightLabel: 'Four Core Properties',
    insight: 'Bitcoin is scarce (21 million hard cap), decentralized (no authority), permissionless (anyone can use it), and borderless (works anywhere on Earth).',
    xp: 20,
    questions: [
      {
        type: 'multiple',
        q: 'What is the maximum supply of Bitcoin that will ever exist?',
        options: ['100 million BTC', '21 million BTC', '1 billion BTC'],
        correct: 1,
        explanation: 'Bitcoin\'s supply is capped at 21 million by its protocol. This hard limit is enforced by code — unlike fiat currencies, no authority can change it.'
      },
      {
        type: 'truefalse',
        q: 'You need a bank account or government ID to use Bitcoin.',
        correct: false,
        explanation: 'Bitcoin is permissionless — anyone with internet access can send or receive it without approval from any institution. This is radical financial inclusion.'
      },
      {
        type: 'fillin',
        q: 'Bitcoin\'s maximum supply is capped at ___ million coins.',
        answer: '21',
        hints: ['21', '100', '50'],
        explanation: 'The 21 million cap is written into Bitcoin\'s code and enforced by every node on the network. It is the source of Bitcoin\'s scarcity.'
      },
      {
        type: 'match',
        q: 'Match each Bitcoin property to what it solves.',
        pairs: [
          { left: 'Scarce (21M cap)', right: 'Prevents inflation from supply growth' },
          { left: 'Permissionless', right: 'Anyone can transact without permission' },
          { left: 'Borderless', right: 'Works across countries without friction' }
        ],
        explanation: 'Each property directly solves a failure mode of the traditional financial system — by design.'
      }
    ]
  },

  {
    id: 'l1_3_3',
    module: '1.3',
    moduleTitle: 'Bitcoin Introduction',
    title: 'Why Bitcoin Matters',
    intro: 'Bitcoin isn\'t just another payment method. It represents a fundamental shift in how humans can organize economic relationships — replacing the need to trust institutions with mathematical certainty enforced by code.',
    insightLabel: 'Code Over Trust',
    insight: 'With Bitcoin, rules are enforced by mathematics, not by humans. No one can change the rules unilaterally — not governments, not miners, not even Satoshi.',
    xp: 20,
    questions: [
      {
        type: 'multiple',
        q: 'What does "don\'t trust, verify" mean in Bitcoin?',
        options: ['Never send Bitcoin to strangers', 'Anyone can independently verify all transactions and rules', 'Use hardware wallets instead of software'],
        correct: 1,
        explanation: 'Bitcoin\'s rules are public and verifiable by anyone running a node. You don\'t need to trust any authority — the math is the authority.'
      },
      {
        type: 'truefalse',
        q: 'A government could easily change Bitcoin\'s supply cap to 100 million coins.',
        correct: false,
        explanation: 'Bitcoin\'s rules are enforced by thousands of independent nodes globally. Any change requires consensus from the entire network — no single entity can impose changes.'
      },
      {
        type: 'fillin',
        q: 'Bitcoin replaces trust in ___ with trust in mathematics and open-source code.',
        answer: 'institutions',
        hints: ['institutions', 'people', 'banks'],
        explanation: 'This is Bitcoin\'s core value proposition: removing the need to trust any human institution by making the rules mathematically verifiable by anyone.'
      },
      {
        type: 'match',
        q: 'Match the traditional system failure to Bitcoin\'s solution.',
        pairs: [
          { left: 'Banks can freeze accounts', right: 'Bitcoin: only you control your keys' },
          { left: 'Governments can inflate supply', right: 'Bitcoin: 21M cap enforced by code' },
          { left: 'Institutions can be corrupt', right: 'Bitcoin: rules verified mathematically' }
        ],
        explanation: 'Bitcoin was explicitly designed as an alternative to systems requiring institutional trust — not as a complement to them.'
      }
    ]
  },

  {
    id: 'l1_3_4',
    module: '1.3',
    moduleTitle: 'Bitcoin Introduction',
    title: 'How Bitcoin Works',
    intro: 'Bitcoin operates through a network of computers worldwide. These computers — called nodes — each hold a complete copy of all Bitcoin transactions ever made, and they collectively agree on which transactions are valid.',
    insightLabel: 'Distributed Consensus',
    insight: 'Bitcoin achieves agreement across thousands of unknown participants using cryptographic proof-of-work — computers compete to add transaction records, making fraud computationally impossible.',
    xp: 20,
    questions: [
      {
        type: 'multiple',
        q: 'What do Bitcoin nodes do?',
        options: ['Mine new coins', 'Store a full copy of all transactions and validate new ones', 'Process payments for fees'],
        correct: 1,
        explanation: 'Full nodes download and verify the entire blockchain — every transaction since 2009. They enforce Bitcoin\'s rules independently, without trusting any authority.'
      },
      {
        type: 'truefalse',
        q: 'Bitcoin miners must solve a mathematical puzzle to add a new block of transactions.',
        correct: true,
        explanation: 'Proof-of-work requires miners to expend real computational energy finding a valid block hash. This makes rewriting history prohibitively expensive — Bitcoin\'s security mechanism.'
      },
      {
        type: 'fillin',
        q: 'Bitcoin\'s consensus mechanism is called proof-of-___, where miners expend energy to validate blocks.',
        answer: 'work',
        hints: ['work', 'stake', 'trust'],
        explanation: 'Proof-of-work ties Bitcoin\'s security to physical reality — electricity and hardware. Attacking Bitcoin requires controlling more computation than all honest miners combined.'
      },
      {
        type: 'match',
        q: 'Match each Bitcoin component to its role.',
        pairs: [
          { left: 'Full node', right: 'Validates all transactions independently' },
          { left: 'Miner', right: 'Adds new blocks via proof-of-work' },
          { left: 'Blockchain', right: 'Immutable record of all transactions' }
        ],
        explanation: 'These components work together in a trustless system: miners produce blocks, nodes verify them, and the blockchain records everything permanently.'
      }
    ]
  }
];

// ── Helpers ────────────────────────────────────
function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) return meta.content;
  const cookie = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='));
  return cookie ? cookie.split('=')[1].trim() : '';
}

function getLessonById(id) {
  return LESSONS_DATA.find(l => l.id === id) || null;
}

// ── DOM References ─────────────────────────────
function getOverlay()     { return document.getElementById('lesson-overlay'); }
function getBody()        { return document.getElementById('loBody'); }
function getProgressBar() { return document.getElementById('loProgressBar'); }
function getHeartsEl()    { return document.getElementById('loHearts'); }

// ── Hearts Render ──────────────────────────────
function renderHeartsDisplay() {
  const el = getHeartsEl();
  if (!el) return;
  const total = window.BITBOT_DATA?.usuario?.vidasTotal ?? 5;
  el.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const h = document.createElement('span');
    h.className = 'lo-heart' + (i < hearts ? '' : ' lo-heart--lost');
    h.textContent = '♥';
    el.appendChild(h);
  }
}

// ── Progress Bar ───────────────────────────────
function setProgress(val) {
  const bar = getProgressBar();
  if (bar) bar.style.width = val + '%';
}

// ── Particles ──────────────────────────────────
function spawnParticles(container) {
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('span');
    p.className = 'lo-particle';
    p.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
    p.style.setProperty('--dy', (Math.random() * -120 - 40) + 'px');
    p.style.left = (30 + Math.random() * 40) + '%';
    p.style.top = '50%';
    p.style.backgroundColor = Math.random() > 0.5 ? '#6E5BFF' : '#f97316';
    container.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}

// ── Intro Card ─────────────────────────────────
function renderIntro(lesson) {
  setProgress(0);
  renderHeartsDisplay();
  const body = getBody();
  body.innerHTML = `
    <div class="lo-intro lo-card" data-animate="in">
      <div class="lo-module-tag">${lesson.module} — ${lesson.moduleTitle}</div>
      <h2 class="lo-lesson-title">${lesson.title}</h2>
      <p class="lo-intro-text">${lesson.intro}</p>
      <div class="lo-insight-box">
        <span class="lo-insight-label">${lesson.insightLabel}</span>
        <p class="lo-insight-text">${lesson.insight}</p>
      </div>
      <button class="lo-btn lo-btn--primary lo-start-btn" id="loStartBtn">
        Start Lesson <span class="lo-xp-badge">+${lesson.xp} XP</span>
      </button>
    </div>
  `;
  document.getElementById('loStartBtn').addEventListener('click', () => {
    currentQ = 0;
    renderQuestion(lesson, 0);
  });
}

// ── Question Renderer ──────────────────────────
function renderQuestion(lesson, qIdx) {
  awaitingNext = false;
  const q = lesson.questions[qIdx];
  const total = lesson.questions.length;
  const pct = Math.round((qIdx / total) * 100);
  setProgress(pct);
  renderHeartsDisplay();

  const body = getBody();
  body.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'lo-card lo-question-card';
  card.dataset.animate = 'in';

  const counter = document.createElement('div');
  counter.className = 'lo-q-counter';
  counter.textContent = `${qIdx + 1} / ${total}`;
  card.appendChild(counter);

  const qText = document.createElement('p');
  qText.className = 'lo-q-text';
  qText.textContent = q.q;
  card.appendChild(qText);

  const answerArea = document.createElement('div');
  answerArea.className = 'lo-answer-area';
  card.appendChild(answerArea);

  if (q.type === 'multiple') {
    renderMultiple(q, answerArea, lesson);
  } else if (q.type === 'truefalse') {
    renderTrueFalse(q, answerArea, lesson);
  } else if (q.type === 'fillin') {
    renderFillin(q, answerArea, card, lesson);
  } else if (q.type === 'match') {
    renderMatch(q, answerArea, card, lesson);
  }

  body.appendChild(card);
}

// ── Multiple Choice ────────────────────────────
function renderMultiple(q, container, lesson) {
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'lo-option';
    btn.innerHTML = `<span class="lo-opt-letter">${String.fromCharCode(65 + i)}</span><span>${opt}</span>`;
    btn.addEventListener('click', () => {
      if (awaitingNext) return;
      const correct = i === q.correct;
      container.querySelectorAll('.lo-option').forEach((b, bi) => {
        b.classList.add(bi === q.correct ? 'lo-opt--correct' : 'lo-opt--wrong');
        b.disabled = true;
      });
      btn.classList.add(correct ? 'lo-opt--selected-correct' : 'lo-opt--selected-wrong');
      handleAnswer(correct, q.explanation, lesson);
    });
    container.appendChild(btn);
  });
}

// ── True / False ───────────────────────────────
function renderTrueFalse(q, container, lesson) {
  ['True', 'False'].forEach(label => {
    const btn = document.createElement('button');
    btn.className = 'lo-tf-btn';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      if (awaitingNext) return;
      const chosen = label === 'True';
      const correct = chosen === q.correct;
      container.querySelectorAll('.lo-tf-btn').forEach(b => {
        const isCorrectBtn = (b.textContent === 'True') === q.correct;
        b.classList.add(isCorrectBtn ? 'lo-tf--correct' : 'lo-tf--wrong');
        b.disabled = true;
      });
      handleAnswer(correct, q.explanation, lesson);
    });
    container.appendChild(btn);
  });
}

// ── Fill-in ────────────────────────────────────
function renderFillin(q, container, card, lesson) {
  const hintsRow = document.createElement('div');
  hintsRow.className = 'lo-hints';
  q.hints.forEach(hint => {
    const chip = document.createElement('button');
    chip.className = 'lo-hint-chip';
    chip.textContent = hint;
    chip.addEventListener('click', () => {
      if (awaitingNext) return;
      const correct = hint.toLowerCase() === q.answer.toLowerCase();
      hintsRow.querySelectorAll('.lo-hint-chip').forEach(c => {
        c.disabled = true;
        if (c.textContent.toLowerCase() === q.answer.toLowerCase()) {
          c.classList.add('lo-hint--correct');
        } else {
          c.classList.add('lo-hint--wrong');
        }
      });
      if (correct) chip.classList.add('lo-hint--selected-correct');
      else chip.classList.add('lo-hint--selected-wrong');
      handleAnswer(correct, q.explanation, lesson);
    });
    hintsRow.appendChild(chip);
  });
  container.appendChild(hintsRow);
}

// ── Match ──────────────────────────────────────
function renderMatch(q, container, card, lesson) {
  matchState = { pairs: q.pairs, selected: null, matched: [], errors: 0 };
  container.className = 'lo-match-area';

  const leftCol = document.createElement('div');
  leftCol.className = 'lo-match-col';
  const rightCol = document.createElement('div');
  rightCol.className = 'lo-match-col';

  const rightItems = [...q.pairs].map((p, i) => ({ text: p.right, idx: i }));
  // Shuffle right column
  for (let i = rightItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rightItems[i], rightItems[j]] = [rightItems[j], rightItems[i]];
  }

  q.pairs.forEach((pair, i) => {
    const lb = document.createElement('button');
    lb.className = 'lo-match-item lo-match-left';
    lb.textContent = pair.left;
    lb.dataset.idx = i;
    lb.addEventListener('click', () => selectMatchItem(lb, 'left', i, container, lesson, q));
    leftCol.appendChild(lb);
  });

  rightItems.forEach((item) => {
    const rb = document.createElement('button');
    rb.className = 'lo-match-item lo-match-right';
    rb.textContent = item.text;
    rb.dataset.idx = item.idx;
    rb.addEventListener('click', () => selectMatchItem(rb, 'right', item.idx, container, lesson, q));
    rightCol.appendChild(rb);
  });

  container.appendChild(leftCol);
  container.appendChild(rightCol);
}

function selectMatchItem(el, side, idx, container, lesson, q) {
  if (awaitingNext) return;
  if (matchState.matched.includes(idx)) return;

  if (!matchState.selected) {
    // First selection
    container.querySelectorAll('.lo-match-item').forEach(b => b.classList.remove('lo-match--active'));
    el.classList.add('lo-match--active');
    matchState.selected = { el, side, idx };
  } else {
    const prev = matchState.selected;
    if (prev.side === side) {
      // Same column — switch selection
      container.querySelectorAll('.lo-match-item').forEach(b => b.classList.remove('lo-match--active'));
      el.classList.add('lo-match--active');
      matchState.selected = { el, side, idx };
      return;
    }
    // Different columns — check match
    const leftIdx = side === 'left' ? idx : prev.idx;
    const rightIdx = side === 'right' ? idx : prev.idx;
    const leftEl = side === 'left' ? el : prev.el;
    const rightEl = side === 'right' ? el : prev.el;

    const isMatch = leftIdx === rightIdx;
    leftEl.classList.remove('lo-match--active');
    rightEl.classList.remove('lo-match--active');

    if (isMatch) {
      leftEl.classList.add('lo-match--matched');
      rightEl.classList.add('lo-match--matched');
      leftEl.disabled = true;
      rightEl.disabled = true;
      matchState.matched.push(leftIdx);
      matchState.selected = null;

      if (matchState.matched.length === q.pairs.length) {
        const correct = matchState.errors === 0;
        handleAnswer(correct, q.explanation, lesson);
      }
    } else {
      leftEl.classList.add('lo-match--error');
      rightEl.classList.add('lo-match--error');
      matchState.errors++;
      matchState.selected = null;
      setTimeout(() => {
        leftEl.classList.remove('lo-match--error');
        rightEl.classList.remove('lo-match--error');
      }, 600);
    }
  }
}

// ── Answer Handling ────────────────────────────
async function handleAnswer(correct, explanation, lesson) {
  awaitingNext = true;
  if (correct) {
    score++;
  } else {
    // Notificar al servidor y actualizar corazones desde la respuesta real
    try {
      const r = await fetch('/api/perder-corazon/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrfToken() }
      });
      const data = await r.json();
      hearts = data.corazones;
      // Sincronizar BITBOT_DATA para el topbar
      if (window.BITBOT_DATA?.usuario) window.BITBOT_DATA.usuario.vidas = hearts;
      // Refrescar corazones del topbar si está disponible
      const container = document.getElementById('heartsContainer');
      if (container && window._renderHearts) window._renderHearts(container, window.BITBOT_DATA.usuario.vidasTotal, hearts);
    } catch (_) {
      hearts = Math.max(0, hearts - 1);
    }
    renderHeartsDisplay();
  }
  answers.push(correct);
  showFeedback(correct, explanation, lesson);
}

function showFeedback(correct, explanation, lesson) {
  const body = getBody();
  const existing = body.querySelector('.lo-feedback');
  if (existing) existing.remove();

  const fb = document.createElement('div');
  fb.className = 'lo-feedback ' + (correct ? 'lo-feedback--correct' : 'lo-feedback--wrong');
  fb.innerHTML = `
    <div class="lo-feedback-inner">
      <span class="lo-feedback-icon">${correct ? '✓' : '✗'}</span>
      <div>
        <strong>${correct ? 'Correct!' : 'Not quite.'}</strong>
        <p>${explanation}</p>
      </div>
    </div>
    <button class="lo-btn lo-btn--next" id="loNextBtn">${
      currentQ + 1 >= lesson.questions.length ? 'See Results' : 'Continue'
    }</button>
  `;
  if (correct) spawnParticles(fb);
  body.appendChild(fb);

  document.getElementById('loNextBtn').addEventListener('click', () => {
    fb.remove();
    currentQ++;
    if (hearts <= 0) {
      renderFailed(lesson);
    } else if (currentQ >= lesson.questions.length) {
      renderComplete(lesson);
    } else {
      renderQuestion(lesson, currentQ);
    }
  });
}

// ── Complete Screen ────────────────────────────
function renderComplete(lesson) {
  setProgress(100);
  const total = lesson.questions.length;
  const pct = Math.round((score / total) * 100);
  const xpEarned = hearts > 0 ? lesson.xp : Math.floor(lesson.xp * 0.5);

  const body = getBody();
  body.innerHTML = `
    <div class="lo-complete lo-card" data-animate="in">
      <div class="lo-complete-icon">₿</div>
      <h2 class="lo-complete-title">Lesson Complete</h2>
      <p class="lo-complete-sub">${lesson.title}</p>
      <div class="lo-complete-stats">
        <div class="lo-cstat">
          <span class="lo-cstat-val">${score}/${total}</span>
          <span class="lo-cstat-label">Correct</span>
        </div>
        <div class="lo-cstat lo-cstat--xp">
          <span class="lo-cstat-val">+${xpEarned}</span>
          <span class="lo-cstat-label">XP Earned</span>
        </div>
        <div class="lo-cstat">
          <span class="lo-cstat-val">${pct}%</span>
          <span class="lo-cstat-label">Score</span>
        </div>
      </div>
      <button class="lo-btn lo-btn--primary" id="loFinishBtn">Back to Dashboard</button>
    </div>
  `;
  spawnParticles(body.querySelector('.lo-complete'));

  document.getElementById('loFinishBtn').addEventListener('click', closeLesson);

  // Call API (non-blocking)
  fetch('/api/completar-leccion/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken()
    },
    body: JSON.stringify({ lesson_id: lesson.id, xp: xpEarned })
  }).catch(() => {
    // Endpoint not yet implemented — ignore silently
  });
}

// ── Failed Screen ──────────────────────────────
function renderFailed(lesson) {
  setProgress(Math.round((currentQ / lesson.questions.length) * 100));
  closeLesson();
  // Mostrar modal global de sin vidas (con timer y opción premium)
  if (window.Hearts) window.Hearts.mostrarModal();
}

// ── Coming Soon ────────────────────────────────
function renderComingSoon() {
  const body = getBody();
  setProgress(0);
  body.innerHTML = `
    <div class="lo-card lo-coming-soon" data-animate="in">
      <div class="lo-complete-icon" style="color:var(--accent-orange)">⛏</div>
      <h2 class="lo-complete-title">Coming Soon</h2>
      <p class="lo-complete-sub">This module is under construction. Check back soon.</p>
      <button class="lo-btn lo-btn--ghost" style="margin-top:1.5rem" id="loExitBtn">Close</button>
    </div>
  `;
  document.getElementById('loExitBtn').addEventListener('click', closeLesson);
}

// ── Public API ─────────────────────────────────
export function openLesson(lessonId) {
  // Bloquear si no hay vidas y no es premium
  const usuario = window.BITBOT_DATA?.usuario;
  if (usuario && usuario.vidas <= 0 && !usuario.esPremium) {
    if (window.Hearts) window.Hearts.mostrarModal();
    return;
  }

  if (lessonId === 'coming-soon') {
    const overlay = getOverlay();
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    hearts = usuario?.vidas ?? 5;
    score = 0;
    currentQ = 0;
    answers = [];
    currentLesson = null;
    renderHeartsDisplay();
    renderComingSoon();
    return;
  }

  const lesson = getLessonById(lessonId);
  if (!lesson) {
    console.warn('[lessons] Unknown lesson id:', lessonId);
    return;
  }

  currentLesson = lesson;
  hearts = usuario?.vidas ?? 5;
  score = 0;
  currentQ = 0;
  answers = [];

  const overlay = getOverlay();
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  renderIntro(lesson);
}

export function closeLesson() {
  const overlay = getOverlay();
  overlay.style.display = 'none';
  document.body.style.overflow = '';
  currentLesson = null;
}

// ── Keyboard Support ───────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const overlay = getOverlay();
    if (overlay && overlay.style.display !== 'none') closeLesson();
  }
  if (e.key === 'Enter') {
    const nextBtn = document.getElementById('loNextBtn');
    if (nextBtn) nextBtn.click();
    const startBtn = document.getElementById('loStartBtn');
    if (startBtn) startBtn.click();
  }
});

// ── Close Button ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('loClose');
  if (closeBtn) closeBtn.addEventListener('click', closeLesson);
});
