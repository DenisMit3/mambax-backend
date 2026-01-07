"use client";

import Link from "next/link";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/api";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Auto-login if in Telegram
    if (typeof window !== 'undefined') {
      const telegram = (window as unknown as { Telegram: { WebApp: { initData: string, expand: () => void, ready: () => void } } }).Telegram;

      if (telegram?.WebApp) {
        telegram.WebApp.ready();
        telegram.WebApp.expand();

        if (telegram.WebApp.initData) {
          const login = async () => {
            setLoading(true);
            try {
              const data = await authService.telegramLogin(telegram.WebApp.initData);
              if (data.has_profile) {
                router.push("/discover");
              } else {
                router.push("/onboarding");
              }
            } catch (e) {
              console.error(e);
            } finally {
              setLoading(false);
            }
          };
          login();
        }
      }
    }
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 800 }} className="title-gradient">MambaX...</div>
      </div>
    );
  }

  return (
    <main className="container">
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '20px',
        marginBottom: '40px'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '24px', letterSpacing: '-0.5px' }}>
          Mamba<span style={{ color: 'var(--primary)' }}>X</span>
        </div>
        <Link href="/auth/phone" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '14px', textDecoration: 'none' }}>
          Log In
        </Link>
      </header>

      {/* Hero Section */}
      <section style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        paddingTop: '40px',
        gap: '24px'
      }} className="animate-fade-in">

        <div style={{
          position: 'relative',
          width: '200px',
          height: '280px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: '20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          background: 'linear-gradient(45deg, #222, #444)'
        }}>
          {/* Placeholder for Hero Image */}
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%), url("https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=2459&auto=format&fit=crop")',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }} />
          <div style={{ position: 'absolute', bottom: '15px', left: '15px', textAlign: 'left' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Sarah, 24</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>📍 2 km away</div>
          </div>
        </div>

        <h1 style={{ fontSize: '36px', lineHeight: '1.2', fontWeight: 800 }}>
          Find your <span className="title-gradient">Soulmate</span><br />not just a date.
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '320px', lineHeight: '1.5' }}>
          Experience the new era of dating.
          AI-powered matching, verified profiles, and zero fake accounts.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px', marginTop: '20px' }}>
          <Link href="/auth/phone" className="btn btn-primary" style={{ height: '54px', fontSize: '18px', textDecoration: 'none' }}>
            Log In / Sign Up
          </Link>
        </div>
      </section>

      {/* Footer / Trust Signals */}
      <footer style={{ marginTop: 'auto', paddingBottom: '30px', paddingTop: '40px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Trusted by 1M+ Users • AI Verified
        </p>
      </footer>
    </main>
  );
}
