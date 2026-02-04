# 🗺️ Architecture Map
> Updated: 2026-01-12 09:54:38.158886

```text
sait znakomstv/
├── 📂 **.agent/**
│   └── 📂 **workflows/**
│       ├── 📝 `chat-features.md` [`~412 tok`]
│       └── 📝 `deploy.md` [`~328 tok`]
├── 📂 **.gemini/**
│   ├── 📝 `TELEGRAM_STARS_PAYMENT_PLAN.md` [`~4406 tok`]
│   └── 📝 `VIRTUAL_GIFTS_COMPLETION_PLAN.md` [`~4875 tok`]
├── 📂 **.github/**
│   └── 📂 **workflows/**
│       ├── 📄 `e2e.yml` [`~612 tok`]
│       ├── 📄 `frontend-tests.yml` [`~236 tok`]
│       ├── 📄 `quality.yml` [`~257 tok`]
│       └── 📄 `tests.yml` [`~371 tok`]
├── 📂 **.pytest_cache/**
│   ├── 📂 **v/**
│   │   └── 📂 **cache/**
│   │       ├── 📄 `lastfailed` [`~57 tok`]
│   │       └── 📄 `nodeids` [`~201 tok`]
│   ├── 📄 `.gitignore` [`~9 tok`]
│   ├── 📄 `CACHEDIR.TAG` [`~47 tok`]
│   └── 📝 `README.md` [`~75 tok`]
├── 📂 **apps/**
│   └── 📂 **admin/**
│       └── 📂 **server/**
│           └── 📂 **routers/**
│               └── 🟦 `advanced.ts` _Config_ [`~580 tok`]
├── 📂 **backend/**
│   ├── 📂 **.pytest_cache/**
│   │   ├── 📂 **v/**
│   │   │   └── 📂 **cache/**
│   │   │       ├── 📄 `lastfailed` [`~66 tok`]
│   │   │       └── 📄 `nodeids` [`~421 tok`]
│   │   ├── 📄 `.gitignore` [`~9 tok`]
│   │   ├── 📄 `CACHEDIR.TAG` [`~47 tok`]
│   │   └── 📝 `README.md` [`~75 tok`]
│   ├── 📂 **alembic/**
│   │   ├── 📂 **versions/**
│   │   │   ├── 🐍 `0ad35de095ed_add_performance_indexes.py` [`~324 tok`]
│   │   │   ├── 🐍 `172dcbf0aea7_add_monetization_models.py` [`~3584 tok`]
│   │   │   ├── 🐍 `1de50891d900_sync_schema.py` _Sync_schema_ [`~401 tok`]
│   │   │   ├── 🐍 `50f68ebfca2c_merge_gift_migrations.py` _merge_gift_migrations_ [`~133 tok`]
│   │   │   ├── 🐍 `6ee0b7a507b9_use_enums_for_user_model.py` [`~714 tok`]
│   │   │   ├── 🐍 `7925103b2039_add_moderation_logs.py` [`~584 tok`]
│   │   │   ├── 🐍 `84c234c1a660_sync_user_schema.py` _sync_user_schema_ [`~359 tok`]
│   │   │   ├── 🐍 `87d9bd3d0c22_admin_dashboard_perfect_tables.py` [`~3494 tok`]
│   │   │   ├── 🐍 `97dc34be6cab_add_telegram_charge_id.py` _add_telegram_charge_id_ [`~586 tok`]
│   │   │   ├── 🐍 `a5d0774ffce9_add_advanced_analytics_models.py` [`~2493 tok`]
│   │   │   ├── 🐍 `b823a7011a7e_add_call_and_metric_models.py` [`~564 tok`]
│   │   │   ├── 🐍 `bfa2729b3e19_add_push_subscriptions.py` [`~771 tok`]
│   │   │   ├── 🐍 `d34c87028925_initial_schema.py` [`~1397 tok`]
│   │   │   ├── 🐍 `de04cc0a8fee_add_missing_user_columns.py` [`~268 tok`]
│   │   │   ├── 🐍 `e1a2b3c4d5e6_add_advanced_tables.py` [`~1184 tok`]
│   │   │   ├── 🐍 `f1a2b3c4d5e7_add_is_read_to_messages.py` _add is_read to messages_ [`~141 tok`]
│   │   │   ├── 🐍 `g1f2s3t4s5a6_add_virtual_gifts.py` [`~1974 tok`]
│   │   │   └── 🐍 `h2g3s4t5b6c7_add_stars_balance_to_users.py` _Add stars_balance to users table_ [`~184 tok`]
│   │   ├── 🐍 `env.py` [`~955 tok`]
│   │   ├── 📄 `README` [`~14 tok`]
│   │   └── 📄 `script.py.mako` [`~158 tok`]
│   ├── 📂 **api/**
│   │   ├── 🐍 `admin.py` [`~15214 tok`]
│   │   ├── 🐍 `advanced.py` [`~4437 tok`]
│   │   ├── 🐍 `auth.py` [`~2162 tok`]
│   │   ├── 🐍 `bot_webhook.py` _Telegram Bot Webhook Integration_ [`~1731 tok`]
│   │   ├── 🐍 `chat.py` [`~6185 tok`]
│   │   ├── 🐍 `debug.py` _Debug logging endpoint for receiving remote logs from frontend_ [`~2406 tok`]
│   │   ├── 🐍 `discovery.py` [`~2516 tok`]
│   │   ├── 🐍 `health.py` [`~830 tok`]
│   │   ├── 🐍 `interaction.py` [`~2220 tok`]
│   │   ├── 🐍 `marketing.py` [`~8424 tok`]
│   │   ├── 🐍 `monetization.py` [`~13797 tok`]
│   │   ├── 🐍 `notification.py` [`~352 tok`]
│   │   ├── 🐍 `safety.py` [`~1046 tok`]
│   │   ├── 🐍 `security.py` [`~2225 tok`]
│   │   ├── 🐍 `stripe_webhook.py` [`~1473 tok`]
│   │   ├── 🐍 `system.py` _System Operations & Monitoring API Routes_ [`~8387 tok`]
│   │   ├── 🐍 `traycer.py` [`~402 tok`]
│   │   ├── 🐍 `users.py` [`~1836 tok`]
│   │   ├── 🐍 `ux_features.py` [`~2624 tok`]
│   │   └── 🐍 `verification.py` [`~1061 tok`]
│   ├── 📂 **config/**
│   │   ├── 🐍 `__init__.py` [`~0 tok`]
│   │   ├── 🐍 `settings.py` [`~423 tok`]
│   │   └── 🐍 `traycer.py` [`~154 tok`]
│   ├── 📂 **core/**
│   │   ├── 🐍 `__init__.py` [`~113 tok`]
│   │   ├── 🐍 `files.py` [`~312 tok`]
│   │   ├── 🐍 `security.py` [`~692 tok`]
│   │   └── 🐍 `websocket.py` [`~903 tok`]
│   ├── 📂 **crud_pkg/**
│   │   ├── 🐍 `__init__.py` [`~157 tok`]
│   │   ├── 🐍 `advanced.py` [`~670 tok`]
│   │   ├── 🐍 `chat.py` [`~246 tok`]
│   │   ├── 🐍 `interaction.py` [`~1086 tok`]
│   │   ├── 🐍 `safety.py` [`~505 tok`]
│   │   └── 🐍 `user.py` [`~1355 tok`]
│   ├── 📂 **db/**
│   │   ├── 🐍 `__init__.py` [`~73 tok`]
│   │   ├── 🐍 `base.py` [`~68 tok`]
│   │   └── 🐍 `session.py` [`~585 tok`]
│   ├── 📂 **models/**
│   │   ├── 🐍 `__init__.py` [`~452 tok`]
│   │   ├── 🐍 `advanced.py` [`~2563 tok`]
│   │   ├── 🐍 `analytics.py` [`~483 tok`]
│   │   ├── 🐍 `chat.py` [`~553 tok`]
│   │   ├── 🐍 `interaction.py` [`~1268 tok`]
│   │   ├── 🐍 `marketing.py` [`~702 tok`]
│   │   ├── 🐍 `moderation.py` [`~1081 tok`]
│   │   ├── 🐍 `monetization.py` [`~5537 tok`]
│   │   ├── 🐍 `notification.py` [`~183 tok`]
│   │   ├── 🐍 `system.py` [`~825 tok`]
│   │   ├── 🐍 `user.py` [`~1568 tok`]
│   │   └── 🐍 `user_management.py` [`~780 tok`]
│   ├── 📂 **schemas/**
│   │   ├── 🐍 `__init__.py` [`~240 tok`]
│   │   ├── 🐍 `auth.py` [`~230 tok`]
│   │   ├── 🐍 `chat.py` [`~351 tok`]
│   │   ├── 🐍 `interaction.py` [`~414 tok`]
│   │   ├── 🐍 `monetization.py` [`~978 tok`]
│   │   ├── 🐍 `notification.py` [`~78 tok`]
│   │   ├── 🐍 `safety.py` [`~135 tok`]
│   │   └── 🐍 `user.py` [`~562 tok`]
│   ├── 📂 **services/**
│   │   ├── 🐍 `__init__.py` [`~274 tok`]
│   │   ├── 🐍 `ai.py` [`~1032 tok`]
│   │   ├── 🐍 `analytics.py` [`~4030 tok`]
│   │   ├── 🐍 `cache.py` [`~723 tok`]
│   │   ├── 🐍 `chat.py` [`~5911 tok`]
│   │   ├── 🐍 `fraud_detection.py` [`~516 tok`]
│   │   ├── 🐍 `geo.py` [`~1038 tok`]
│   │   ├── 🐍 `gifts.py` [`~1331 tok`]
│   │   ├── 🐍 `marketing.py` [`~673 tok`]
│   │   ├── 🐍 `moderation.py` [`~1381 tok`]
│   │   ├── 🐍 `monetization.py` [`~906 tok`]
│   │   ├── 🐍 `notification.py` [`~1033 tok`]
│   │   ├── 🐍 `nsfw_detection.py` [`~283 tok`]
│   │   ├── 🐍 `pagination.py` _Cursor Pagination Service_ [`~2449 tok`]
│   │   ├── 🐍 `reporting.py` [`~1147 tok`]
│   │   ├── 🐍 `search_filters.py` [`~3572 tok`]
│   │   ├── 🐍 `security.py` [`~5408 tok`]
│   │   ├── 🐍 `swipe_limits.py` [`~3029 tok`]
│   │   ├── 🐍 `telegram_payments.py` [`~1631 tok`]
│   │   ├── 🐍 `ux_features.py` _UX Features Service_ [`~5324 tok`]
│   │   ├── 🐍 `verification.py` _Profile Verification Service_ [`~2483 tok`]
│   │   └── 🐍 `web3_client.py` [`~862 tok`]
│   ├── 📂 **static/**
│   │   ├── 📂 **gifts/**
│   │   │   ├── 📄 `champagne.png` [`~42341 tok`]
│   │   │   ├── 📄 `chocolate.png` [`~55332 tok`]
│   │   │   ├── 📄 `diamond_ring.png` [`~49987 tok`]
│   │   │   ├── 📄 `dinner.png` [`~52638 tok`]
│   │   │   ├── 📄 `heart_balloon.png` [`~37251 tok`]
│   │   │   ├── 📝 `README.md` [`~28 tok`]
│   │   │   ├── 📄 `rose.png` [`~41151 tok`]
│   │   │   ├── 📄 `star.png` [`~48366 tok`]
│   │   │   └── 📄 `teddy.png` [`~57651 tok`]
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
│   ├── 📂 **tests/**
│   │   ├── 📂 **api/**
│   │   │   ├── 🐍 `test_admin.py` [`~1192 tok`]
│   │   │   ├── 🐍 `test_auth.py` [`~677 tok`]
│   │   │   ├── 🐍 `test_chat.py` [`~643 tok`]
│   │   │   ├── 🐍 `test_interactions.py` [`~562 tok`]
│   │   │   └── 🐍 `test_monetization.py` [`~1105 tok`]
│   │   ├── 📂 **services/**
│   │   │   ├── 🐍 `test_chat.py` [`~383 tok`]
│   │   │   └── 🐍 `test_monetization.py` [`~722 tok`]
│   │   ├── 🐍 `conftest.py` [`~690 tok`]
│   │   ├── 🐍 `test_health_and_sanity.py` [`~247 tok`]
│   │   └── 🐍 `test_monetization.py` [`~1674 tok`]
│   ├── 📄 `.env` [`~84 tok`]
│   ├── 📄 `.env.complete` [`~241 tok`]
│   ├── 📄 `.env.example` [`~229 tok`]
│   ├── 📄 `.gitignore` [`~2 tok`]
│   ├── 🐍 `__init__.py` [`~0 tok`]
│   ├── 📄 `alembic.ini` [`~873 tok`]
│   ├── 🐍 `auth.py` [`~2969 tok`]
│   ├── 🐍 `bot.py` _MambaX Telegram Bot_ [`~10417 tok`]
│   ├── 📄 `cert.pem.bak` [`~319 tok`]
│   ├── 🐍 `check_user.py` [`~366 tok`]
│   ├── 🐍 `crud.py` [`~2662 tok`]
│   ├── 🐍 `database.py` [`~57 tok`]
│   ├── 🐍 `debug_otp_test.py` [`~349 tok`]
│   ├── 📄 `Dockerfile` [`~230 tok`]
│   ├── 🐍 `gen_cert.py` [`~568 tok`]
│   ├── 🐍 `get_local_ip.py` [`~479 tok`]
│   ├── 📄 `key.pem.bak` [`~419 tok`]
│   ├── 🐍 `main.py` [`~2435 tok`]
│   ├── 📄 `mambax.db` [`~180097 tok`]
│   ├── 🐍 `metrics.py` [`~75 tok`]
│   ├── 🐍 `models_old.py` [`~785 tok`]
│   ├── 📄 `mypy.ini` [`~40 tok`]
│   ├── 📄 `Procfile` [`~12 tok`]
│   ├── 🐍 `promote_admin.py` [`~356 tok`]
│   ├── 📄 `pyproject.toml` [`~111 tok`]
│   ├── 📝 `README.md` [`~856 tok`]
│   ├── 📄 `requirements.txt` [`~224 tok`]
│   ├── 📄 `runtime.txt` [`~3 tok`]
│   ├── 🐍 `schemas_old.py` [`~537 tok`]
│   ├── 🐍 `security.py` [`~206 tok`]
│   ├── 🐍 `seed.py` [`~1779 tok`]
│   ├── 🐍 `seed_gifts.py` [`~1506 tok`]
│   ├── 🐍 `seed_test_user.py` [`~584 tok`]
│   ├── 🐍 `seed_users.py` [`~1461 tok`]
│   ├── 📄 `setup.cfg` [`~31 tok`]
│   └── 📄 `start.sh` [`~221 tok`]
├── 📂 **docs/**
│   └── 📝 `ADMIN_FEATURE_MATRIX.md` [`~1634 tok`]
├── 📂 **epic-docs/**
│   ├── 📂 **specs/**
│   │   └── 📝 `0fdc7511-28a7-4deb-b025-85510c054d88-🚀_Enterprise_Admin_Dashboard_-_Dating_Platform_2.0_(130+_Features).md` [`~15488 tok`]
│   ├── 📂 **tickets/**
│   │   ├── 📝 `199a7061-4638-435e-b986-1d2e311107e9-📊_Core_Analytics_Dashboard_(20_Features).md` [`~1599 tok`]
│   │   ├── 📝 `22279dd0-0e1c-46ba-89bc-d9d74e98d862-🏗️_Project_Infrastructure_&_Setup.md` [`~927 tok`]
│   │   ├── 📝 `247b409c-2209-4c78-9a21-0c3e6c5d0989-👥_User_Management_System_(25_Features).md` [`~2134 tok`]
│   │   ├── 📝 `38df3039-3795-4be5-9a9a-8fd429021555-⚙️_System_Operations_&_Monitoring_(15_Features).md` [`~714 tok`]
│   │   ├── 📝 `6ba1ced1-47a7-4ab1-8043-18fa97e94ffd-📢_Marketing_&_Growth_Tools_(15_Features).md` [`~1069 tok`]
│   │   ├── 📝 `c4f25071-3c2a-4502-bc1d-bec3f974179a-🚀_Advanced_Features_&_AI_Integration_(20+_Features).md` [`~748 tok`]
│   │   ├── 📝 `c9e8e2e9-7509-48ff-9c92-91f8cda4de14-💰_Monetization_&_Revenue_Management_(15_Features).md` [`~2487 tok`]
│   │   └── 📝 `eba8587c-2084-4f74-b51c-8160a15ac036-🛡️_Content_Moderation_System_(20_Features).md` [`~2306 tok`]
│   └── 📝 `emergency_audit.md` [`~7233 tok`]
├── 📂 **frontend/**
│   ├── 📂 **.swc/**
│   │   └── 📂 **plugins/**
│   │       └── 📂 **windows_x86_64_23.0.0/**

│   ├── 📂 **certificates/**

│   ├── 📂 **coverage/**
│   │   ├── 📂 **lcov-report/**
│   │   │   ├── 📂 **app/**
│   │   │   │   ├── 🌐 `index.html` [`~1092 tok`]
│   │   │   │   └── 🌐 `template.tsx.html` [`~1289 tok`]
│   │   │   ├── 📂 **components/**
│   │   │   │   ├── 📂 **admin/**
│   │   │   │   │   ├── 📂 **advanced/**

│   │   │   │   │   └── 📂 **analytics/**

│   │   │   │   ├── 📂 **gifts/**
│   │   │   │   │   ├── 🌐 `GiftCatalog.tsx.html` [`~8518 tok`]
│   │   │   │   │   ├── 🌐 `index.html` [`~1464 tok`]
│   │   │   │   │   ├── 🌐 `index.ts.html` [`~939 tok`]
│   │   │   │   │   └── 🌐 `SendGiftModal.tsx.html` [`~13597 tok`]
│   │   │   │   ├── 📂 **layout/**
│   │   │   │   │   ├── 🌐 `BottomNav.tsx.html` [`~3096 tok`]
│   │   │   │   │   ├── 🌐 `ClientLayout.tsx.html` [`~3335 tok`]
│   │   │   │   │   └── 🌐 `index.html` [`~1268 tok`]
│   │   │   │   ├── 📂 **providers/**
│   │   │   │   │   ├── 🌐 `index.html` [`~1112 tok`]
│   │   │   │   │   └── 🌐 `TelegramProvider.tsx.html` [`~2698 tok`]
│   │   │   │   └── 📂 **ui/**
│   │   │   │       ├── 🌐 `BuySwipesModal.tsx.html` [`~11724 tok`]
│   │   │   │       ├── 🌐 `DevModeToggle.tsx.html` [`~3839 tok`]
│   │   │   │       ├── 🌐 `GiftNotification.tsx.html` [`~4199 tok`]
│   │   │   │       ├── 🌐 `GiftRevealAnimation.tsx.html` [`~12544 tok`]
│   │   │   │       ├── 🌐 `index.html` [`~1932 tok`]
│   │   │   │       ├── 🌐 `SwipeCard.tsx.html` [`~6599 tok`]
│   │   │   │       └── 🌐 `TopUpModal.tsx.html` [`~14554 tok`]
│   │   │   ├── 📂 **context/**
│   │   │   │   ├── 🌐 `index.html` [`~1097 tok`]
│   │   │   │   └── 🌐 `UserContext.tsx.html` [`~4303 tok`]
│   │   │   ├── 📂 **hooks/**
│   │   │   │   ├── 🌐 `index.html` [`~1097 tok`]
│   │   │   │   └── 🌐 `useAdminSocket.ts.html` [`~3959 tok`]
│   │   │   ├── 📂 **services/**
│   │   │   │   ├── 🌐 `adminApi.ts.html` [`~23183 tok`]
│   │   │   │   ├── 🌐 `advancedApi.ts.html` [`~20767 tok`]
│   │   │   │   ├── 🌐 `api.ts.html` [`~19715 tok`]
│   │   │   │   ├── 🌐 `index.html` [`~1748 tok`]
│   │   │   │   ├── 🌐 `notificationService.ts.html` [`~3621 tok`]
│   │   │   │   └── 🌐 `websocket.ts.html` [`~5276 tok`]
│   │   │   ├── 📂 **utils/**
│   │   │   │   ├── 🌐 `env.ts.html` [`~2054 tok`]
│   │   │   │   ├── 🌐 `index.html` [`~1252 tok`]
│   │   │   │   └── 🌐 `remoteLogger.ts.html` [`~6959 tok`]
│   │   │   ├── 🎨 `base.css` [`~1348 tok`]
│   │   │   ├── 🟨 `block-navigation.js` _eslint-disable_ [`~663 tok`]
│   │   │   ├── 📄 `favicon.png` [`~62 tok`]
│   │   │   ├── 🌐 `index.html` [`~2739 tok`]
│   │   │   ├── 🎨 `prettify.css` [`~169 tok`]
│   │   │   ├── 🟨 `prettify.js` _eslint-disable_ [`~4397 tok`]
│   │   │   ├── 📄 `sort-arrow-sprite.png` [`~24 tok`]
│   │   │   └── 🟨 `sorter.js` _eslint-disable_ [`~1682 tok`]
│   │   ├── 📄 `clover.xml` [`~17266 tok`]
│   │   ├── ⚙️ `coverage-final.json` [`~59635 tok`]
│   │   └── 📄 `lcov.info` [`~8462 tok`]
│   ├── 📂 **e2e/**
│   │   ├── 🟦 `auth.spec.ts` _1. Navigate to home/login_ [`~384 tok`]
│   │   ├── 🟦 `example.spec.ts` _Check if title contains typical app name or similar_ [`~153 tok`]
│   │   └── 🟦 `swipe.spec.ts` _Authenticate before tests_ [`~604 tok`]
│   ├── 📂 **public/**
│   │   ├── 📂 **sounds/**
│   │   │   └── 📝 `README.md` [`~89 tok`]
│   │   ├── 📄 `file.svg` [`~97 tok`]
│   │   ├── 📄 `globe.svg` [`~258 tok`]
│   │   ├── ⚙️ `manifest.json` [`~134 tok`]
│   │   ├── 📄 `next.svg` [`~343 tok`]
│   │   ├── 🟨 `sw.js` [`~239 tok`]
│   │   ├── 📄 `vercel.svg` [`~32 tok`]
│   │   └── 📄 `window.svg` [`~96 tok`]
│   ├── 📂 **src/**
│   │   ├── 📂 **app/**
│   │   │   ├── 📂 **admin/**
│   │   │   │   ├── 📂 **advanced/**
│   │   │   │   │   ├── 📂 **accessibility/**

│   │   │   │   │   ├── 📂 **ai/**

│   │   │   │   │   ├── 📂 **algorithm/**

│   │   │   │   │   ├── 📂 **calls/**

│   │   │   │   │   ├── 📂 **events/**

│   │   │   │   │   ├── 📂 **icebreakers/**

│   │   │   │   │   ├── 📂 **localization/**

│   │   │   │   │   ├── 📂 **partners/**

│   │   │   │   │   ├── 📂 **performance/**

│   │   │   │   │   ├── 📂 **pwa/**

│   │   │   │   │   ├── 📂 **recommendations/**

│   │   │   │   │   ├── 📂 **reports/**

│   │   │   │   │   ├── 📂 **web3/**

│   │   │   │   │   └── ⚛️ `page.tsx` [`~2630 tok`]
│   │   │   │   ├── 📂 **analytics/**
│   │   │   │   │   ├── 📂 **funnels/**

│   │   │   │   │   ├── 📂 **retention/**

│   │   │   │   │   ├── 📂 **revenue/**

│   │   │   │   │   └── ⚛️ `page.tsx` [`~7027 tok`]
│   │   │   │   ├── 📂 **marketing/**
│   │   │   │   │   ├── 📂 **campaigns/**

│   │   │   │   │   ├── 📂 **push/**

│   │   │   │   │   ├── 📂 **referrals/**

│   │   │   │   │   └── ⚛️ `page.tsx` _Mock data removed_ [`~5505 tok`]
│   │   │   │   ├── 📂 **moderation/**
│   │   │   │   │   ├── 📂 **appeals/**

│   │   │   │   │   ├── 📂 **reports/**

│   │   │   │   │   └── ⚛️ `page.tsx` [`~7548 tok`]
│   │   │   │   ├── 📂 **monetization/**
│   │   │   │   │   ├── 📂 **gifts/**

│   │   │   │   │   ├── 📂 **payments/**

│   │   │   │   │   ├── 📂 **promo-codes/**

│   │   │   │   │   ├── 📂 **promos/**

│   │   │   │   │   ├── 📂 **refunds/**

│   │   │   │   │   ├── 📂 **subscriptions/**

│   │   │   │   │   └── ⚛️ `page.tsx` [`~7946 tok`]
│   │   │   │   ├── 📂 **system/**
│   │   │   │   │   ├── 📂 **audit/**

│   │   │   │   │   ├── 📂 **flags/**

│   │   │   │   │   ├── 📂 **health/**

│   │   │   │   │   ├── 📂 **logs/**

│   │   │   │   │   └── ⚛️ `page.tsx` _Mock removed_ [`~6016 tok`]
│   │   │   │   ├── 📂 **users/**
│   │   │   │   │   ├── 📂 **[id]/**

│   │   │   │   │   ├── 📂 **segments/**

│   │   │   │   │   ├── 📂 **verification/**

│   │   │   │   │   └── ⚛️ `page.tsx` [`~8655 tok`]
│   │   │   │   ├── 🎨 `admin-layout.css` [`~2599 tok`]
│   │   │   │   ├── 🎨 `admin-variables.css` [`~1219 tok`]
│   │   │   │   ├── 🎨 `admin.module.css` [`~2934 tok`]
│   │   │   │   ├── ⚛️ `layout.tsx` _Import global admin styles_ [`~2205 tok`]
│   │   │   │   └── ⚛️ `page.tsx` _Animated counter hook_ [`~7259 tok`]
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
│   │   │   │   │   ├── 📂 **__tests__/**

│   │   │   │   │   └── ⚛️ `page.tsx` _eslint-disable-next-line @typescript-eslint/no-explicit-any_ [`~11157 tok`]
│   │   │   │   └── ⚛️ `page.tsx` _eslint-disable @next/next/no-img-element_ [`~1774 tok`]
│   │   │   ├── 📂 **discover/**
│   │   │   │   └── ⚛️ `page.tsx` [`~3182 tok`]
│   │   │   ├── 📂 **gifts/**
│   │   │   │   ├── 🎨 `page.module.css` [`~1618 tok`]
│   │   │   │   └── ⚛️ `page.tsx` _eslint-disable @next/next/no-img-element_ [`~3778 tok`]
│   │   │   ├── 📂 **likes/**
│   │   │   │   └── ⚛️ `page.tsx` _eslint-disable @next/next/no-img-element_ [`~1867 tok`]
│   │   │   ├── 📂 **map/**
│   │   │   │   └── ⚛️ `page.tsx` _eslint-disable @next/next/no-img-element_ [`~1413 tok`]
│   │   │   ├── 📂 **onboarding/**
│   │   │   │   └── ⚛️ `page.tsx` _eslint-disable @next/next/no-img-element_ [`~2571 tok`]
│   │   │   ├── 📂 **profile/**
│   │   │   │   ├── 📂 **[id]/**
│   │   │   │   │   └── ⚛️ `page.tsx` _eslint-disable @next/next/no-img-element_ [`~3556 tok`]
│   │   │   │   ├── 📂 **edit/**
│   │   │   │   │   └── ⚛️ `page.tsx` _eslint-disable @next/next/no-img-element_ [`~3480 tok`]
│   │   │   │   ├── 📂 **premium/**
│   │   │   │   │   └── ⚛️ `page.tsx` [`~3383 tok`]
│   │   │   │   └── ⚛️ `page.tsx` _eslint-disable @next/next/no-img-element_ [`~4703 tok`]
│   │   │   ├── 📂 **search/**
│   │   │   │   └── ⚛️ `page.tsx` _Mock Data for Grid_ [`~1329 tok`]
│   │   │   ├── 📂 **users/**
│   │   │   │   └── 📂 **[id]/**
│   │   │   │       └── ⚛️ `page.tsx` [`~2041 tok`]
│   │   │   ├── 📂 **verification/**
│   │   │   │   └── ⚛️ `page.tsx` _Helper to get API URL since it's not exported from api.ts_ [`~3144 tok`]
│   │   │   ├── 📄 `favicon.ico` [`~4685 tok`]
│   │   │   ├── 🎨 `globals.css` [`~1376 tok`]
│   │   │   ├── ⚛️ `layout.tsx` _Optimize Font Loading_ [`~387 tok`]
│   │   │   ├── 🎨 `page.module.css` [`~606 tok`]
│   │   │   ├── ⚛️ `page.tsx` _Auto-login if in Telegram_ [`~1107 tok`]
│   │   │   └── ⚛️ `template.tsx` [`~105 tok`]
│   │   ├── 📂 **components/**
│   │   │   ├── 📂 **admin/**
│   │   │   │   ├── 📂 **advanced/**
│   │   │   │   │   ├── ⚛️ `AIContentGenerator.tsx` [`~1653 tok`]
│   │   │   │   │   └── ⚛️ `CustomReportsBuilder.tsx` [`~1982 tok`]
│   │   │   │   └── 📂 **analytics/**
│   │   │   │       ├── ⚛️ `ChurnPrediction.tsx` [`~2961 tok`]
│   │   │   │       ├── ⚛️ `FunnelChart.tsx` [`~1549 tok`]
│   │   │   │       ├── 🟦 `index.ts` [`~63 tok`]
│   │   │   │       ├── ⚛️ `RealtimeMetrics.tsx` [`~2559 tok`]
│   │   │   │       ├── ⚛️ `RetentionHeatmap.tsx` [`~2259 tok`]
│   │   │   │       └── ⚛️ `RevenueChart.tsx` [`~3164 tok`]
│   │   │   ├── 📂 **gifts/**
│   │   │   │   ├── 📂 **__tests__/**
│   │   │   │   │   ├── ⚛️ `GiftCatalog.test.tsx` _Mock api_ [`~532 tok`]
│   │   │   │   │   └── ⚛️ `SendGiftModal.test.tsx` [`~515 tok`]
│   │   │   │   ├── 🎨 `GiftCatalog.module.css` [`~1274 tok`]
│   │   │   │   ├── ⚛️ `GiftCatalog.tsx` _eslint-disable @next/next/no-img-element_ [`~2363 tok`]
│   │   │   │   ├── 🟦 `index.ts` _Gifts components exports_ [`~30 tok`]
│   │   │   │   ├── 🎨 `SendGiftModal.module.css` [`~2341 tok`]
│   │   │   │   └── ⚛️ `SendGiftModal.tsx` _eslint-disable @next/next/no-img-element_ [`~3793 tok`]
│   │   │   ├── 📂 **layout/**
│   │   │   │   ├── ⚛️ `BottomNav.tsx` [`~620 tok`]
│   │   │   │   └── ⚛️ `ClientLayout.tsx` _Hide bottom nav on specific pages_ [`~613 tok`]
│   │   │   ├── 📂 **providers/**
│   │   │   │   └── ⚛️ `TelegramProvider.tsx` _Check if running in browser with window.Telegram_ [`~357 tok`]
│   │   │   └── 📂 **ui/**
│   │   │       ├── 📂 **__tests__/**
│   │   │       │   └── ⚛️ `SwipeCard.test.tsx` [`~352 tok`]
│   │   │       ├── ⚛️ `BuySwipesModal.tsx` [`~3257 tok`]
│   │   │       ├── ⚛️ `DevModeToggle.tsx` _Check localStorage on mount_ [`~734 tok`]
│   │   │       ├── ⚛️ `GiftNotification.tsx` [`~853 tok`]
│   │   │       ├── ⚛️ `GiftRevealAnimation.tsx` _Confetti animation_ [`~2797 tok`]
│   │   │       ├── ⚛️ `SwipeCard.tsx` _eslint-disable @next/next/no-img-element_ [`~1611 tok`]
│   │   │       └── ⚛️ `TopUpModal.tsx` _Cleanup polling on unmount_ [`~3820 tok`]
│   │   ├── 📂 **context/**
│   │   │   └── ⚛️ `UserContext.tsx` _Define minimal user interface needed for context_ [`~685 tok`]
│   │   ├── 📂 **hooks/**
│   │   │   └── 🟦 `useAdminSocket.ts` _Get token from local storage (simplified for this task)_ [`~648 tok`]
│   │   ├── 📂 **services/**
│   │   │   ├── 📂 **__tests__/**
│   │   │   │   └── 🟦 `api.test.ts` _Mock env_ [`~457 tok`]
│   │   │   ├── 🟦 `adminApi.ts` [`~4760 tok`]
│   │   │   ├── 🟦 `advancedApi.ts` [`~4151 tok`]
│   │   │   ├── 🟦 `api.ts` [`~4425 tok`]
│   │   │   ├── 🟦 `notificationService.ts` _Register SW_ [`~586 tok`]
│   │   │   └── 🟦 `websocket.ts` [`~844 tok`]
│   │   └── 📂 **utils/**
│   │       ├── 🟦 `env.ts` [`~302 tok`]
│   │       └── 🟦 `remoteLogger.ts` [`~1273 tok`]
│   ├── 📄 `.env.example` [`~8 tok`]
│   ├── 📄 `.env.local` [`~16 tok`]
│   ├── 📄 `.gitignore` [`~129 tok`]
│   ├── 📄 `deploy.bat` [`~65 tok`]
│   ├── 📄 `Dockerfile` [`~357 tok`]
│   ├── 📄 `eslint.config.mjs` [`~116 tok`]
│   ├── 🟨 `jest.config.js` _Provide the path to your Next.js app to load next.config.js and .env files in your test environment_ [`~306 tok`]
│   ├── 🟨 `jest.setup.js` _Polyfills if needed_ [`~206 tok`]
│   ├── 📄 `modal_final.txt` [`~13714 tok`]
│   ├── 📄 `modal_test_output.txt` [`~3744 tok`]
│   ├── 🟦 `next-env.d.ts` _/ <reference types="next" />_ [`~62 tok`]
│   ├── 🟦 `next.config.ts` _Proxy all API requests through a specific prefix to avoid conflicts with frontend pages_ [`~242 tok`]
│   ├── ⚙️ `package.json` [`~314 tok`]
│   ├── 📄 `page_final.txt` [`~15771 tok`]
│   ├── 📄 `page_last_hope.txt` [`~3748 tok`]
│   ├── 📄 `page_out.txt` [`~18068 tok`]
│   ├── 📄 `page_test_output.txt` [`~215 tok`]
│   ├── 🟦 `playwright.config.ts` [`~159 tok`]
│   ├── 📝 `README.md` [`~220 tok`]
│   ├── 🟦 `sentry.client.config.ts` _Only enable in production_ [`~190 tok`]
│   ├── 🟦 `sentry.edge.config.ts` _Only enable in production_ [`~77 tok`]
│   ├── 🟦 `sentry.server.config.ts` _Only enable in production_ [`~98 tok`]
│   ├── 🟨 `server.js` [`~253 tok`]
│   ├── 📄 `test_output.txt` [`~2978 tok`]
│   ├── ⚙️ `tsconfig.json` [`~167 tok`]
│   ├── 📄 `tsconfig.tsbuildinfo` [`~64515 tok`]
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
│   ├── 📄 `gen_proto.ps1` [`~263 tok`]
│   ├── 🐍 `load_test.py` [`~1225 tok`]
│   └── 🐍 `simulate_webhook.py` [`~1554 tok`]
├── 📂 **services/**
│   ├── 📂 **auth/**

│   ├── 📂 **geo/**

│   └── 📂 **matching/**

├── 📂 **static/**
│   └── 📂 **uploads/**
│       ├── 📄 `a471986a-9ef1-4e88-b1c7-f76d5c2b143b.jpg` [`~3963 tok`]
│       ├── 📄 `f3485d8e-eb71-476a-bca7-b8f938ea99cf.jpg` [`~0 tok`]
│       └── 📄 `fa287f67-6131-4cdd-b7cc-89e66faf5882.jpg` [`~3963 tok`]
├── 📄 `.env` [`~67 tok`]
├── 📄 `.env.local` [`~308 tok`]
├── 📄 `.gitignore` [`~55 tok`]
├── 📄 `.pre-commit-config.yaml` [`~134 tok`]
├── 📄 `ANALYSIS_REPORT.txt` [`~3973 tok`]
├── 🐍 `check_api.py` [`~1890 tok`]
├── 📝 `DEPLOYMENT.md` [`~2699 tok`]
├── 📝 `design_specification.md` [`~2176 tok`]
├── 📝 `DESKTOP_MOBILE_VIEW.md` [`~530 tok`]
├── 📄 `docker-compose.dev.yml` [`~303 tok`]
├── 📄 `docker-compose.yml` [`~874 tok`]
├── 📄 `frontend_logs.txt` [`~37382 tok`]
├── 📝 `libraries.md` [`~645 tok`]
├── 📄 `mambax.db` [`~171901 tok`]
├── 📝 `MOBILE_ACCESS.md` [`~213 tok`]
├── 📝 `payment_flow.md` [`~309 tok`]
├── 📄 `railway.toml` [`~70 tok`]
├── 📝 `README.md` [`~2217 tok`]
├── 🐍 `run_local.py` [`~252 tok`]
├── 📝 `SECURITY_CONTACTS.md` [`~113 tok`]
├── 📄 `start_dev.bat` [`~285 tok`]
├── 📄 `start_local_network.bat` [`~147 tok`]
├── 📄 `start_local_network.sh` [`~142 tok`]
├── 📝 `system_design_manifest.md` [`~1258 tok`]
├── 📝 `TELEGRAM_BOT_SETUP.md` [`~1217 tok`]
├── 📝 `ticket_vercel.md` [`~1241 tok`]
└── 🐍 `watch_logs.py` [`~285 tok`]
```