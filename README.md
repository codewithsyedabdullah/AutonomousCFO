# AUTO CFO — AI Financial Twin Advisor

**Code-Storm 26 | Track: Fintech**

> CFO-level financial advice was only for the rich. AUTO CFO changes that.

AUTO CFO is an AI-powered personal finance advisor that acts as your Financial Twin — a real-time digital replica of your financial life. Unlike generic budgeting apps, it gives you CFO-level insight powered by AI, grounded in your actual transaction data.

---

## ✨ Features

### 📊 Financial Twin Dashboard
- Net worth tracker with real-time calculations
- Monthly income vs expenses bar chart
- Financial Health Score (0–100) with animated gauge
- Top spending categories pie chart
- Recent transactions list

### 💬 AI CFO Chat
- Dynamic context injection — the AI knows YOUR specific numbers
- Ask "Why am I overspending?" and get answers citing your actual data
- Proactive risk alerts when savings rate < 10%
- Powered by OpenAI GPT-4o or Claude (configurable)

### 🔮 Scenario Simulator
- **Save More** — See how extra monthly savings accelerates goals
- **Major Purchase** — Plan big purchases and see cash flow impact
- **Income Change** — See how a raise or pay cut affects finances
- Side-by-side Before/After comparison with 12-month projection charts

### 🎯 Goal Tracker
- Create and track financial goals (emergency fund, house down payment, etc.)
- Quick-add contributions ($50, $100, $500)
- Visual progress bars

### 💰 Transaction Management
- Manual transaction entry with category selection
- CSV upload for bulk import
- Income/expense tracking with color-coded badges

### 📋 Tax Module (Pakistan FBR)
- Auto-calculated tax liability from your transactions
- Pakistan FBR 2024-25 tax slabs implemented
- Deduction breakdown with FBR section references
- Missed deduction spotting
- AI Tax Lawyer chat with specialized tax context
- One-click tax summary document download

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite + TypeScript + Tailwind CSS 3 |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | SQLite (better-sqlite3) |
| **Auth** | JWT (jsonwebtoken + bcryptjs) |
| **Charts** | Recharts |
| **AI** | OpenAI API (GPT-4o) / Anthropic Claude |
| **Icons** | Lucide React |
| **Hosting** | Vercel (frontend) + Railway/Render (backend) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### 1. Clone & Install
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env`:
- Set `AI_API_KEY` to your OpenAI or Anthropic API key (optional — mock mode works without it)
- Adjust `CORS_ORIGIN` if frontend runs on a different port

### 3. Run Development Servers
```bash
# Terminal 1 - Backend (port 3001)
cd backend && npm run dev

# Terminal 2 - Frontend (port 5173)
cd frontend && npx vite
```

### 4. Open App
Navigate to **http://localhost:5173**

---

## 📁 Project Structure

```
├── backend/
│   └── src/
│       ├── index.ts              # Express server entry
│       ├── config.ts             # Environment config
│       ├── db/
│       │   ├── connection.ts    # SQLite connection
│       │   └── schema.ts        # Database tables
│       ├── middleware/
│       │   └── auth.ts          # JWT middleware
│       ├── routes/
│       │   ├── auth.ts          # Register/login
│       │   ├── transactions.ts  # CRUD + CSV upload
│       │   ├── goals.ts         # CRUD + contributions
│       │   ├── dashboard.ts     # Aggregated data
│       │   ├── simulator.ts     # Scenario projections
│       │   ├── chat.ts          # AI CFO chat
│       │   └── tax.ts           # Tax module
│       └── services/
│           ├── healthScore.ts   # Score algorithm
│           ├── projections.ts   # Financial projections
│           └── taxCalculator.ts # FBR tax slabs
│
├── frontend/
│   └── src/
│       ├── App.tsx              # Router setup
│       ├── main.tsx             # Entry point
│       ├── api/
│       │   └── client.ts       # Axios + auth interceptor
│       ├── context/
│       │   └── AuthContext.tsx  # Auth provider
│       ├── components/
│       │   ├── Layout.tsx      # Sidebar nav
│       │   ├── ProtectedRoute.tsx
│       │   ├── HealthScoreGauge.tsx
│       │   ├── NetWorthCard.tsx
│       │   ├── MonthlyBarChart.tsx
│       │   ├── CategoryPieChart.tsx
│       │   ├── TransactionRow.tsx
│       │   └── GoalCard.tsx
│       └── pages/
│           ├── Landing.tsx     # Hero page
│           ├── Login.tsx
│           ├── Register.tsx
│           ├── Dashboard.tsx   # Main financial twin
│           ├── Transactions.tsx
│           ├── Goals.tsx
│           ├── Simulator.tsx
│           ├── Chat.tsx
│           └── Tax.tsx         # Tax module
│
├── vercel.json    # Frontend deployment
├── render.yaml    # Backend deployment
└── .gitignore
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get current user |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions |
| POST | `/api/transactions` | Create transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| POST | `/api/transactions/csv` | Upload CSV |
| GET | `/api/transactions/categories` | Category breakdown |

### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/goals` | List goals |
| POST | `/api/goals` | Create goal |
| PUT | `/api/goals/:id` | Update goal |
| POST | `/api/goals/:id/contribute` | Add money to goal |
| DELETE | `/api/goals/:id` | Delete goal |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Full financial snapshot |

### Simulator
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulator/simulate` | Run scenario projection |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | AI CFO chat (streaming) |

### Tax
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tax/summary` | Tax liability calculation |
| GET | `/api/tax/profile` | Get tax profile |
| POST | `/api/tax/profile` | Save tax profile |
| POST | `/api/tax/generate-pdf` | Download tax summary |
| POST | `/api/tax/chat` | AI Tax Lawyer chat |

---

## 🧮 Financial Health Score Algorithm

```
savings_rate_score    = min(savings_rate / 0.20, 1.0) × 100   → weight 35%
expense_consistency  = 1 - (std_dev_expenses / avg_expenses)   → weight 25%
income_regularity    = 1 - (std_dev_income / avg_income)      → weight 20%
goal_progress        = current_amount / target_amount          → weight 20%

composite_score = clamped(weighted_average, 0, 100)
```

**Bands:** 80–100 Excellent (green) | 60–79 Good (blue) | 40–59 Fair (yellow) | 20–39 At Risk (orange) | 0–19 Critical (red)

---

## 🏗️ Deployment

### Frontend → Vercel
```bash
npx vercel --prod
```
Or connect the GitHub repo to Vercel — it will auto-detect the Vite config from `vercel.json`.

### Backend → Railway or Render
1. Push to GitHub
2. On Railway/Render: create new web service, connect repo, set root directory to `backend`
3. Set environment variables from `.env.example`
4. Build command: `cd backend && npm install && npm run build`
5. Start command: `cd backend && npm start`

---

## 🎥 Demo Walkthrough (3 minutes)

1. **Problem** (30s): 80% of people have no financial advisor
2. **Sign up** (15s): Create account, add 5 sample transactions
3. **Dashboard** (30s): See health score update, net worth, charts
4. **AI Chat** (30s): Ask "Why am I overspending?" — AI cites real numbers
5. **Scenario Simulator** (30s): "What if I save $200 more?" — quantified impact
6. **Tax Module** (30s): See liability calculated, download tax summary
7. **Close** (15s): Market size, Phase 2 Plaid integration, subscription model

---

## 📋 Hackathon Submission Checklist

- [x] GitHub repo with hackathon-period commits
- [x] README with setup instructions
- [ ] Deployed live link (Vercel + Railway/Render)
- [ ] 3-minute video demo
- [ ] Pitch deck (6–8 slides)

---

## 🔮 Phase 2 Roadmap

- Plaid API integration for automatic bank sync
- ML-based spending forecasting
- Multi-bank aggregation
- Mobile app (React Native)
- Real FBR/IRS API submission
- Subscription tiers (free + premium)

---

Built with ❤️ for **Code-Storm 26** — Fintech Track
