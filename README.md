# BenefitFlow

**Get the food benefits you deserve -- just by talking.**

BenefitFlow is a multilingual voice-powered AI assistant that helps people check their eligibility for SNAP (food stamps) benefits through a simple 2-minute conversation. No 20-page forms. No legal jargon. Just a natural conversation in the user's native language.

[![Live Demo](https://img.shields.io/badge/Live-benefitflow.me-1A5D3B?style=for-the-badge)](https://benefitflow.me)
[![Demo Video](https://img.shields.io/badge/Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://youtu.be/4IEW2D9Mj5c)

---

## Demo

https://github.com/user-attachments/assets/placeholder

> Watch the full demo on [YouTube](https://youtu.be/4IEW2D9Mj5c) or try it live at [benefitflow.me](https://benefitflow.me)

---

## The Problem

Over **30 million Americans** are eligible for SNAP benefits but never apply because the process is overwhelming: 20-page forms, confusing legal language, and no support in their native language. Billions of dollars in food assistance go unclaimed every year.

## The Solution

BenefitFlow replaces the entire application prep process with a **2-minute voice conversation**. Users simply talk to the AI in their own language, answer a few questions about their household and income, and receive a personalized email with:

- Their document checklist (translated into their language)
- Local food resources and helpline numbers
- A direct link to the official MN Benefits application portal
- Step-by-step guidance on what to expect after applying

---

## Features

- **Voice-First Interface** -- Powered by [Vapi AI](https://vapi.ai) for real-time voice conversations with low latency
- **28 Languages Supported** -- Including English, Spanish, Hindi, Hmong, Somali, Arabic, and Vietnamese
- **AI-Powered Eligibility Screening** -- Collects household size, income, and location through natural conversation
- **Personalized Action Plan via Email** -- GPT-4o-mini analyzes the call transcript and generates a tailored SNAP checklist
- **Translated Email Reports** -- Checklist and next-steps email delivered in the user's chosen language
- **Local Resource Matching** -- Connects users to the nearest food shelves based on their zip code
- **Animated Voice Orb** -- WebGL-powered visual feedback during the conversation (OGL)
- **Fully Responsive UI** -- Works on mobile and desktop with a clean, accessible design

---

## Tech Stack

### Frontend (`/client`)

| Technology | Purpose |
|---|---|
| [Next.js 16](https://nextjs.org/) | React framework with App Router |
| [React 19](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com/) | Component library |
| [Vapi Web SDK](https://docs.vapi.ai/) | Real-time voice AI integration |
| [OGL](https://github.com/oframe/ogl) | WebGL voice orb animation |

### Backend (`/backend`)

| Technology | Purpose |
|---|---|
| [FastAPI](https://fastapi.tiangolo.com/) | Python API framework |
| [OpenAI GPT-4o-mini](https://platform.openai.com/) | Transcript analysis and checklist translation |
| [Vapi API](https://docs.vapi.ai/) | Call transcript retrieval |
| [Resend](https://resend.com/) | Transactional email delivery |

### Infrastructure

| Service | Purpose |
|---|---|
| [Vercel](https://vercel.com/) | Frontend hosting & CDN |
| [Railway](https://railway.app/) | Backend hosting |
| Custom domain | [benefitflow.me](https://benefitflow.me) |

---

## Architecture

```
User speaks in any language
        │
        ▼
┌──────────────────┐     Voice stream      ┌──────────────┐
│   Next.js Client │ ◄──────────────────►   │   Vapi AI    │
│   (benefitflow.me)│                       │  (Voice LLM) │
└────────┬─────────┘                        └──────────────┘
         │ POST /generate-report
         ▼
┌──────────────────┐    GET /call/:id       ┌──────────────┐
│  FastAPI Backend │ ───────────────────►    │   Vapi API   │
│    (Railway)     │                        │ (Transcript) │
└────────┬─────────┘                        └──────────────┘
         │
         ├── Analyze transcript (OpenAI GPT-4o-mini)
         │   └── Extract: zip code, household details, checklist
         │
         ├── Translate checklist to user's language (GPT-4o-mini)
         │
         └── Send personalized email (Resend)
              └── Checklist + food resources + application link
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- A [Vapi AI](https://dashboard.vapi.ai) account (public key + assistant ID + secret key)
- An [OpenAI](https://platform.openai.com) API key
- A [Resend](https://resend.com) API key

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/benefitflow.git
cd benefitflow
```

### 2. Set up the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Fill in your keys in `.env`:

```
VAPI_SECRET_KEY=your_vapi_secret_key
OPENAI_API_KEY=your_openai_api_key
RESEND_API_KEY=your_resend_api_key
PORT=8000
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

### 3. Set up the frontend

```bash
cd client
npm install
```

Create a `.env.local` file:

```
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_vapi_assistant_id
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) -- the app runs in demo mode if Vapi keys aren't set.

---

## Project Structure

```
benefitflow/
├── client/                  # Next.js frontend
│   ├── app/
│   │   ├── components/      # Navbar, VoiceOrb
│   │   ├── context/         # LanguageContext (i18n + translations)
│   │   ├── globals.css      # Tailwind styles
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Main page (hero → agent → result flow)
│   │   └── providers.tsx    # Context providers
│   ├── components/ui/       # shadcn/ui components (Button, Badge, Orb)
│   ├── lib/
│   │   ├── hooks/           # useVapiVoice custom hook
│   │   └── utils.ts         # Utilities + API URL config
│   ├── public/              # Static assets
│   ├── package.json
│   └── tsconfig.json
├── backend/
│   ├── main.py              # FastAPI server (transcript analysis + email)
│   ├── requirements.txt     # Python dependencies
│   ├── procfile             # Railway deployment config
│   └── .env.example         # Environment variable template
├── .gitignore
└── README.md
```

---

## Deployment

**Frontend** is deployed on [Vercel](https://vercel.com) -- connect the repo and set the root directory to `client`.

**Backend** is deployed on [Railway](https://railway.app) -- connect the repo and set the root directory to `backend`. Add your environment variables in the Railway dashboard.

---

## License

This project was built for a hackathon. Feel free to fork and build on it.
