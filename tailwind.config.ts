import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* VS Code / Kiro exact palette */
        'vsc-bg':        '#1e1e1e',
        'vsc-sidebar':   '#252526',
        'vsc-panel':     '#1e1e1e',
        'vsc-titlebar':  '#3c3c3c',
        'vsc-tab-bg':    '#2d2d2d',
        'vsc-tab-active':'#1e1e1e',
        'vsc-border':    '#3c3c3c',
        'vsc-input':     '#3c3c3c',
        'vsc-hover':     '#2a2d2e',
        'vsc-selection': '#264f78',
        'vsc-fg':        '#cccccc',
        'vsc-fg-dim':    '#858585',
        'vsc-fg-muted':  '#6b6b6b',
        'accent':        '#0078d4',
        'accent-light':  '#1a8ad4',
        'accent-purple': '#6366f1',
      },
      fontSize: {
        '10': ['10px', '14px'],
        '11': ['11px', '15px'],
        '12': ['12px', '16px'],
        '13': ['13px', '18px'],
      },
      boxShadow: {
        'vsc':    '0 2px 8px rgba(0,0,0,0.36)',
        'vsc-lg': '0 8px 32px rgba(0,0,0,0.5)',
        'glow':   '0 0 0 1px rgba(0,120,212,0.4), 0 4px 16px rgba(0,120,212,0.2)',
      },
      keyframes: {
        'slide-in-right': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',     opacity: '1' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.2s ease-out',
        'slide-in-left':  'slide-in-left 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
