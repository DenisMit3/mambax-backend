# 🗺️ Architecture Map
> Updated: 2026-01-09 13:19:51.419185

```text
sait znakomstv/
├── 📂 **.agent/**
│   └── 📂 **workflows/**
│       ├── 📝 `chat-features.md` [`~412 tok`]
│       └── 📝 `deploy.md` [`~328 tok`]
├── 📂 **backend/**
│   ├── 📂 **alembic/**
│   │   ├── 📂 **versions/**
│   │   │   ├── 🐍 `bd5f79035cd5_add_messages_table.py` [`~435 tok`]
│   │   │   └── 🐍 `cb3232dd91d4_initial_tables.py` [`~940 tok`]
│   │   ├── 🐍 `env.py` [`~671 tok`]
│   │   ├── 📄 `README` [`~14 tok`]
│   │   └── 📄 `script.py.mako` [`~158 tok`]
│   ├── 📂 **api/**
│   │   ├── 🐍 `auth.py` [`~888 tok`]
│   │   ├── 🐍 `chat.py` [`~2208 tok`]
│   │   ├── 🐍 `health.py` [`~77 tok`]
│   │   ├── 🐍 `index.py` [`~170 tok`]
│   │   ├── 🐍 `interaction.py` [`~1173 tok`]
│   │   └── 🐍 `users.py` [`~724 tok`]
│   ├── 📂 **core/**
│   │   ├── 🐍 `__init__.py` [`~113 tok`]
│   │   ├── 🐍 `files.py` [`~312 tok`]
│   │   ├── 🐍 `security.py` [`~692 tok`]
│   │   └── 🐍 `websocket.py` [`~827 tok`]
│   ├── 📂 **crud/**
│   │   ├── 🐍 `__init__.py` [`~127 tok`]
│   │   ├── 🐍 `interaction.py` [`~1080 tok`]
│   │   └── 🐍 `user.py` [`~713 tok`]
│   ├── 📂 **db/**
│   │   ├── 🐍 `__init__.py` [`~73 tok`]
│   │   ├── 🐍 `base.py` [`~68 tok`]
│   │   └── 🐍 `session.py` [`~452 tok`]
│   ├── 📂 **models/**
│   │   ├── 🐍 `__init__.py` [`~53 tok`]
│   │   ├── 🐍 `chat.py` [`~396 tok`]
│   │   ├── 🐍 `interaction.py` [`~687 tok`]
│   │   └── 🐍 `user.py` [`~715 tok`]
│   ├── 📂 **schemas/**
│   │   ├── 🐍 `__init__.py` [`~165 tok`]
│   │   ├── 🐍 `chat.py` [`~325 tok`]
│   │   ├── 🐍 `interaction.py` [`~379 tok`]
│   │   └── 🐍 `user.py` [`~545 tok`]
│   ├── 📂 **static/**
│   │   ├── 📂 **uploads/**
│   │   │   ├── 📄 `637e8abb-c9dc-4f7f-9295-aa399208bf58.jpg` [`~76861 tok`]
│   │   │   ├── 📄 `71be6b69-4431-4e41-b48d-510e3b021e34.jpg` [`~8246 tok`]
│   │   │   ├── 📄 `b071d204-b492-417f-959a-58abb43329b9.jpg` [`~33296 tok`]
│   │   │   ├── 📄 `c079d05e-2aa6-412b-84fb-004bc9221279.jpg` [`~12047 tok`]
│   │   │   ├── 📄 `c097507c-3ba0-44c2-8977-27008bf810b1.jpg` [`~17514 tok`]
│   │   │   ├── 📄 `c1a61b5f-7ae4-4e81-9df1-db78fe218c15.jpg` [`~22765 tok`]
│   │   │   ├── 📄 `d46b361b-ce37-4446-bee1-21049fdbaac5.jpg` [`~12047 tok`]
│   │   │   ├── 📄 `d7cf343e-066b-41de-8be1-02f789cc8253.jpg` [`~22765 tok`]
│   │   │   └── 📄 `ec609175-1e84-4953-a77e-6c5bef6c6773.jpg` [`~76861 tok`]
│   │   └── 🌐 `index.html` [`~4098 tok`]
│   ├── 📄 `.gitignore` [`~2 tok`]
│   ├── 📄 `alembic.ini` [`~873 tok`]
│   ├── 🐍 `auth.py` [`~1256 tok`]
│   ├── 🐍 `bot.py` [`~384 tok`]
│   ├── 📄 `cert.pem.bak` [`~319 tok`]
│   ├── 🐍 `crud.py` [`~1489 tok`]
│   ├── 🐍 `database.py` [`~248 tok`]
│   ├── 📄 `Dockerfile` [`~187 tok`]
│   ├── 🐍 `gen_cert.py` [`~568 tok`]
│   ├── 📄 `key.pem.bak` [`~419 tok`]
│   ├── 🐍 `main.py` [`~5214 tok`]
│   ├── 📄 `mambax.db` [`~14328 tok`]
│   ├── 🐍 `models.py` [`~672 tok`]
│   ├── 📄 `Procfile` [`~12 tok`]
│   ├── 📄 `requirements.txt` [`~71 tok`]
│   ├── 📄 `runtime.txt` [`~3 tok`]
│   ├── 🐍 `schemas.py` [`~451 tok`]
│   ├── 🐍 `security.py` [`~206 tok`]
│   ├── 📄 `start.sh` [`~88 tok`]
│   └── ⚙️ `vercel.json` [`~230 tok`]
├── 📂 **frontend/**
│   ├── 📂 **certificates/**

│   ├── 📂 **public/**
│   │   ├── 📄 `file.svg` [`~97 tok`]
│   │   ├── 📄 `globe.svg` [`~258 tok`]
│   │   ├── 📄 `next.svg` [`~343 tok`]
│   │   ├── 📄 `vercel.svg` [`~32 tok`]
│   │   └── 📄 `window.svg` [`~96 tok`]
│   ├── 📂 **src/**
│   │   ├── 📂 **app/**
│   │   │   ├── 📂 **auth/**
│   │   │   │   ├── 📂 **otp/**
│   │   │   │   │   └── ⚛️ `page.tsx` _Auto focus next_ [`~1330 tok`]
│   │   │   │   ├── 📂 **phone/**
│   │   │   │   │   └── ⚛️ `page.tsx` _Pass identifier to next screen via query param or context_ [`~805 tok`]
│   │   │   │   └── 📂 **setup/**
│   │   │   │       ├── 📂 **gender/**

│   │   │   │       ├── 📂 **photos/**

│   │   │   │       └── ⚛️ `page.tsx` _Save to context/localstorage in real app_ [`~540 tok`]
│   │   │   ├── 📂 **chat/**
│   │   │   │   ├── 📂 **[id]/**
│   │   │   │   │   └── ⚛️ `page.tsx` _Mock messages_ [`~5420 tok`]
│   │   │   │   └── ⚛️ `page.tsx` _eslint-disable @next/next/no-img-element_ [`~2293 tok`]
│   │   │   ├── 📂 **discover/**
│   │   │   │   └── ⚛️ `page.tsx` [`~1327 tok`]
│   │   │   ├── 📂 **likes/**
│   │   │   │   └── ⚛️ `page.tsx` _eslint-disable @next/next/no-img-element_ [`~1867 tok`]
│   │   │   ├── 📂 **map/**
│   │   │   │   └── ⚛️ `page.tsx` _eslint-disable @next/next/no-img-element_ [`~1386 tok`]
│   │   │   ├── 📂 **onboarding/**
│   │   │   │   └── ⚛️ `page.tsx` _eslint-disable @next/next/no-img-element_ [`~2571 tok`]
│   │   │   ├── 📂 **profile/**
│   │   │   │   ├── 📂 **edit/**
│   │   │   │   │   └── ⚛️ `page.tsx` _eslint-disable @next/next/no-img-element_ [`~3480 tok`]
│   │   │   │   └── ⚛️ `page.tsx` _eslint-disable @next/next/no-img-element_ [`~874 tok`]
│   │   │   ├── 📂 **search/**
│   │   │   │   └── ⚛️ `page.tsx` _Mock Data for Grid_ [`~1329 tok`]
│   │   │   ├── 📄 `favicon.ico` [`~4685 tok`]
│   │   │   ├── 🎨 `globals.css` [`~1086 tok`]
│   │   │   ├── ⚛️ `layout.tsx` _Optimize Font Loading_ [`~224 tok`]
│   │   │   ├── 🎨 `page.module.css` [`~606 tok`]
│   │   │   ├── ⚛️ `page.tsx` _Auto-login if in Telegram_ [`~1107 tok`]
│   │   │   └── ⚛️ `template.tsx` [`~105 tok`]
│   │   ├── 📂 **components/**
│   │   │   ├── 📂 **layout/**
│   │   │   │   ├── ⚛️ `BottomNav.tsx` [`~620 tok`]
│   │   │   │   └── ⚛️ `ClientLayout.tsx` _Hide bottom nav on specific pages_ [`~163 tok`]
│   │   │   ├── 📂 **providers/**
│   │   │   │   └── ⚛️ `TelegramProvider.tsx` _Check if running in browser with window.Telegram_ [`~357 tok`]
│   │   │   └── 📂 **ui/**
│   │   │       └── ⚛️ `SwipeCard.tsx` _eslint-disable @next/next/no-img-element_ [`~1134 tok`]
│   │   └── 📂 **services/**
│   │       └── 🟦 `api.ts` _Автоматическое определение бэкенда:_ [`~2228 tok`]
│   ├── 📄 `.env.local` [`~308 tok`]
│   ├── 📄 `.gitignore` [`~125 tok`]
│   ├── 📄 `deploy.bat` [`~65 tok`]
│   ├── 📄 `eslint.config.mjs` [`~116 tok`]
│   ├── 🟦 `next-env.d.ts` _/ <reference types="next" />_ [`~62 tok`]
│   ├── 🟦 `next.config.ts` _config options here_ [`~33 tok`]
│   ├── ⚙️ `package.json` [`~191 tok`]
│   ├── 📝 `README.md` [`~220 tok`]
│   ├── 🟨 `server.js` [`~253 tok`]
│   ├── ⚙️ `tsconfig.json` [`~167 tok`]
│   └── 📄 `watch.bat` [`~132 tok`]
├── 📂 **migrations/**
│   ├── 📂 **postgres/**
│   │   └── 📄 `001_init_schema.sql` [`~375 tok`]
│   └── 📂 **scylla/**
│       └── 📄 `001_chat_schema.cql` [`~131 tok`]
├── 📂 **pkg/**
│   └── 📂 **pb/**

├── 📂 **proto/**
│   ├── 📄 `auth.proto` [`~151 tok`]
│   └── 📄 `profile.proto` [`~258 tok`]
├── 📂 **scripts/**
│   └── 📄 `gen_proto.ps1` [`~263 tok`]
├── 📂 **services/**
│   ├── 📂 **auth/**

│   ├── 📂 **geo/**

│   └── 📂 **matching/**

├── 📄 `.env` [`~51 tok`]
├── 📄 `.env.local` [`~308 tok`]
├── 📄 `.gitignore` [`~39 tok`]
├── 📄 `ANALYSIS_REPORT.txt` [`~1385 tok`]
├── 🐍 `check_api.py` [`~1890 tok`]
├── 📝 `design_specification.md` [`~2176 tok`]
├── 📄 `docker-compose.dev.yml` [`~303 tok`]
├── 📄 `docker-compose.yml` [`~181 tok`]
├── 📝 `libraries.md` [`~645 tok`]
├── 📄 `mambax.db` [`~14309 tok`]
├── 🐍 `run_local.py` [`~159 tok`]
├── 📄 `start_dev.bat` [`~285 tok`]
└── 📝 `system_design_manifest.md` [`~1258 tok`]
```