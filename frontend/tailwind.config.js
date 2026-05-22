/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Branding
        focusPurple: '#6c5ce7',
        focusDark: '#2d3436',
        neuBg: "#f0f2f5", // Soft background for Neumorphism
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
 transitionDuration: {
  '2000': '2000ms',
  '1000': '1000ms',
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
        // Orb Effects
        'orbPulse': {
          '0%, 100%': { 
            transform: 'scale(1)', 
            boxShadow: '10px 10px 20px #d1d9e6, -10px -10px 20px #ffffff',
            'border-color': 'rgba(108, 92, 231, 0.1)'
          },
          '50%': { 
            transform: 'scale(1.05)', 
            boxShadow: '15px 15px 30px #c1c9d6, -15px -15px 30px #ffffff, 0 0 20px rgba(108, 92, 231, 0.2)',
            'border-color': 'rgba(108, 92, 231, 0.5)'
          },
        },
      },
      animation: {
        'float-slow': 'logo-float 3.5s ease-in-out infinite',
        'float-small': 'logo-float-small 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'shimmer-swipe': 'shimmer-swipe 2.2s infinite ease-in-out',
        'orbit': 'orbit 20s infinite linear',
        'content-reveal': 'content-reveal 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'orbPulse': 'orbPulse 3s infinite ease-in-out',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fadeInUp': 'fadeInUp 0.8s ease-out forwards',
        'popIn': 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      },
      boxShadow: {
        // Neumorphic Presets
        'neu-flat': '20px 20px 60px #d1d9e6, -20px -20px 60px #ffffff',
        'neu-pressed': 'inset 6px 6px 12px #d1d9e6, inset -6px -6px 12px #ffffff',
        'neu-sm': '10px 10px 20px #d1d9e6, -10px -10px 20px #ffffff',
      },
    },
  },
  plugins: [],
}