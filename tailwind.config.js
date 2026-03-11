/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // WARM IVORY — linen-white backgrounds
        ivory: {
          50:  '#FAF8F4',
          100: '#F4EEE6',
          200: '#EBE1D5',
          300: '#DFCFBE',
          400: '#CFBAA5',
          500: '#BCA48C',
          600: '#A58C72',
          700: '#89725B',
          800: '#6C5846',
          900: '#514133',
        },
        // BURNISHED GOLD — warm luxury accent
        champagne: {
          50:  '#F9F5EC',
          100: '#F0E7D2',
          200: '#E4D2AE',
          300: '#D4B986',
          400: '#BF9E5E',
          500: '#A68540',  // main gold
          600: '#8C6D2E',
          700: '#70561F',
          800: '#564213',
          900: '#3D2F0C',
        },
        // TERRACOTTA SIENNA — sophisticated warm red
        rose: {
          50:  '#FAF2EE',
          100: '#F5E3DA',
          200: '#ECC5B3',
          300: '#E1A086',
          400: '#D27D5C',
          500: '#BE6040',
          600: '#A34E30',  // primary action — warm sienna
          700: '#853C22',
          800: '#672D16',
          900: '#4B1F0D',
        },
        // WARM BLUSH — tertiary
        blush: {
          50:  '#FAF4F1',
          100: '#F4E6DF',
          200: '#E9CCBF',
          300: '#DCAC97',
          400: '#CB886C',
          500: '#B86A4C',
          600: '#9E5436',
          700: '#7F3F25',
          800: '#622E18',
          900: '#47200E',
        },
        // WARM CHARCOAL — text & dark elements (replaces cold blue-grey)
        charcoal: {
          50:  '#F5F1ED',
          100: '#EDE5DC',
          200: '#D8CCBF',
          300: '#BDAD9E',
          400: '#9D8D7E',
          500: '#7D6E60',
          600: '#5E5148',
          700: '#403830',
          800: '#2A2420',
          900: '#1C1814',
        },
        'brand-purple': '#2e1065',
        'brand-turquoise': '#A68540',
        'brand-turquoise-hover': '#8C6D2E',
        'brand-gray': '#7D6E60',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        // Cormorant Garamond — editorial display & body headings
        serif:   ['var(--font-serif)', 'Georgia', 'serif'],
        display: ['var(--font-serif)', 'Georgia', 'serif'],
        // DM Sans — clean editorial body
        sans:    ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Display — Cormorant at light weight, tight tracking
        'display-xl': ['6rem',   { lineHeight: '0.98', letterSpacing: '-0.03em', fontWeight: '300' }],
        'display-lg': ['4.5rem', { lineHeight: '1.02', letterSpacing: '-0.025em', fontWeight: '300' }],
        'display-md': ['3.25rem',{ lineHeight: '1.08', letterSpacing: '-0.02em', fontWeight: '300' }],
        'display-sm': ['2.5rem', { lineHeight: '1.12', letterSpacing: '-0.015em', fontWeight: '300' }],
        // Headings — medium weight
        'heading-xl': ['2.25rem',{ lineHeight: '1.15', letterSpacing: '-0.015em', fontWeight: '400' }],
        'heading-lg': ['1.875rem',{ lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '400' }],
        'heading-md': ['1.5rem', { lineHeight: '1.28', letterSpacing: '-0.005em', fontWeight: '400' }],
        'heading-sm': ['1.25rem',{ lineHeight: '1.35', letterSpacing: '0', fontWeight: '400' }],
        // Body — DM Sans
        'body-lg': ['1.0625rem',  { lineHeight: '1.7', fontWeight: '300' }],
        'body-md': ['0.9375rem',  { lineHeight: '1.65', fontWeight: '300' }],
        'body-sm': ['0.8125rem',  { lineHeight: '1.6', fontWeight: '400' }],
        'caption': ['0.6875rem',  { lineHeight: '1.4', letterSpacing: '0.08em', fontWeight: '500' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
      },
      borderRadius: {
        'sm':  '0.25rem',
        DEFAULT: '0.375rem',
        'md':  '0.5rem',
        'lg':  '0.625rem',
        'xl':  '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        'full': '9999px',
      },
      boxShadow: {
        'soft':    '0 1px 3px rgba(28,24,20,0.04), 0 4px 16px rgba(28,24,20,0.04)',
        'soft-lg': '0 4px 20px rgba(28,24,20,0.07), 0 1px 4px rgba(28,24,20,0.04)',
        'soft-xl': '0 12px 48px rgba(28,24,20,0.09)',
        'inner-soft': 'inset 0 1px 3px rgba(28,24,20,0.05)',
        'card': '0 0 0 1px rgba(28,24,20,0.06), 0 2px 8px rgba(28,24,20,0.04)',
      },
      animation: {
        'fade-in':  'fadeIn 0.8s ease-out',
        'slide-up': 'slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(28px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        scaleIn: {
          '0%':   { transform: 'scale(0.97)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
