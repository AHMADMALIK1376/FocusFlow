/** @type {import('tailwindcss').Config} */

// Helper: expose a token as a Tailwind color with opacity support.
const rgb = (v) => `rgb(var(${v}) / <alpha-value>)`;

module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ---- Aurora token-driven palette (theme-aware, opacity-capable) ----
        brand: {
          DEFAULT: rgb('--brand'),
          deep: rgb('--brand-deep'),
          soft: rgb('--brand-soft'),
        },
        'on-brand': rgb('--on-brand'),
        sun: rgb('--sun'),
        'on-sun': rgb('--on-sun'),
        sage: rgb('--sage'),
        'on-sage': rgb('--on-sage'),
        'sage-deep': rgb('--sage-deep'),
        icon: rgb('--icon'),
        blush: rgb('--blush'),
        success: rgb('--success'),
        info: rgb('--info'),
        warn: rgb('--warn'),
        'warn-ink': rgb('--warn-ink'),
        'success-ink': rgb('--success-ink'),
        'info-ink': rgb('--info-ink'),
        'focus-ink': rgb('--focus-ink'),
        'brand-ink': rgb('--brand-ink'),
        'muted-ink': rgb('--muted-ink'),
        'on-focus': rgb('--on-focus'),
        'on-warn': rgb('--on-warn'),
        'on-success': rgb('--on-success'),
        focus: rgb('--focus'),
        'focus-ring': rgb('--ring'),
        canvas: rgb('--canvas'),
        surface: {
          DEFAULT: rgb('--surface'),
          2: rgb('--surface-2'),
        },
        ink: rgb('--ink'),
        muted: rgb('--muted'),
        highlight: rgb('--highlight'),
      },
      backgroundImage: {
        'grad-hero': 'var(--grad-hero)',
        'grad-aurora': 'var(--grad-aurora)',
        'grad-sun': 'var(--grad-sun)',
        'grad-sage': 'var(--grad-sage)',
        'grad-blush': 'var(--grad-blush)',
        'grad-sage-card': 'var(--grad-sage-card)',
        'grad-sage-deep': 'var(--grad-sage-deep)',
      },
      borderRadius: {
        'token-sm': 'var(--radius-sm)',
        'token-md': 'var(--radius-md)',
        'token-lg': 'var(--radius-lg)',
        'token-xl': 'var(--radius-xl)',
      },
      transitionTimingFunction: {
        spring: 'var(--ease-spring)',
      },
      backdropBlur: {
        glass: 'var(--glass-blur)',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        // Logo & Icons
        'logo-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        'logo-float-small': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        // UI Effects
        'shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
        'shimmer-swipe': {
          '0%': { transform: 'translateX(-150%)' },
          '100%': { transform: 'translateX(250%)' },
        },
        // Splash Screen & Reveal
        'orbit': {
          'from': { transform: 'rotate(0deg) translateX(60px) rotate(0deg)' },
          'to': { transform: 'rotate(360deg) translateX(60px) rotate(-360deg)' },
        },
        'content-reveal': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fadeInUp': {
          'from': { opacity: '0', transform: 'translateY(30px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'popIn': {
          '0%': { opacity: '0', transform: 'scale(0)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // Aurora additions
        'aurora-drift': {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2%,-2%,0) scale(1.05)' },
        },
      },
      animation: {
        'float-slow': 'logo-float 3.5s ease-in-out infinite',
        'float-small': 'logo-float-small 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'shimmer-swipe': 'shimmer-swipe 2.2s infinite ease-in-out',
        'orbit': 'orbit 20s infinite linear',
        'content-reveal': 'content-reveal 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fadeInUp': 'fadeInUp 0.8s ease-out forwards',
        'popIn': 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'aurora-drift': 'aurora-drift 16s ease-in-out infinite',
      },
      boxShadow: {
        // Token-driven (theme-aware)
        neu: 'var(--shadow-neu)',
        'neu-sm': 'var(--shadow-neu-sm)',
        'neu-inset': 'var(--shadow-neu-inset)',
        glass: 'var(--shadow-glass)',
        'clay-brand': 'var(--shadow-clay-brand)',
        'clay-sage': 'var(--shadow-clay-sage)',
      },
    },
  },
  plugins: [],
}
