/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class',
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				primary: {
					50: '#eef4ff',
					100: '#dce8ff',
					200: '#b2d0ff',
					300: '#7db3ff',
					400: '#4691ff',
					500: '#1a6dff',
					600: '#0052e0',
					700: '#0041b5',
					800: '#003494',
					900: '#002970',
					950: '#001847'
				},
				surface: {
					50: '#fafafa',
					100: '#f4f4f5',
					200: '#e4e4e7',
					300: '#d4d4d8',
					400: '#a1a1aa',
					500: '#71717a',
					600: '#52525b',
					700: '#3f3f46',
					800: '#27272a',
					900: '#18181b',
					950: '#0f0f11'
				},
				accent: {
					300: '#5ffbf6',
					400: '#26f5ef',
					500: '#00dcd5',
					600: '#00b1af',
					700: '#008c8a'
				}
			},
			animation: {
				'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'bounce-slow': 'bounce 1.5s infinite',
				'spin-slow': 'spin 3s linear infinite',
				'fade-in': 'fadeIn 0.3s ease-out',
				'slide-up': 'slideUp 0.3s ease-out',
				'slide-in-left': 'slideInLeft 0.3s ease-out',
				'thinking-dot': 'thinkingDot 1.4s ease-in-out infinite',
				'gradient-x': 'gradientX 3s ease infinite',
				'glow': 'glow 2s ease-in-out infinite alternate'
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' }
				},
				slideUp: {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				slideInLeft: {
					'0%': { opacity: '0', transform: 'translateX(-20px)' },
					'100%': { opacity: '1', transform: 'translateX(0)' }
				},
				thinkingDot: {
					'0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.5' },
					'40%': { transform: 'scale(1)', opacity: '1' }
				},
				gradientX: {
					'0%, 100%': { backgroundPosition: '0% 50%' },
					'50%': { backgroundPosition: '100% 50%' }
				},
				glow: {
					'0%': { boxShadow: '0 0 5px rgba(26, 109, 255, 0.3), 0 0 10px rgba(26, 109, 255, 0.2)' },
					'100%': { boxShadow: '0 0 10px rgba(26, 109, 255, 0.5), 0 0 20px rgba(26, 109, 255, 0.3)' }
				}
			},
			backgroundImage: {
				'gradient-primary': 'linear-gradient(135deg, #1a6dff 0%, #00dcd5 100%)',
				'gradient-primary-hover': 'linear-gradient(135deg, #0052e0 0%, #00b1af 100%)',
				'gradient-surface': 'linear-gradient(180deg, #1f1f23 0%, #18181b 100%)',
				'gradient-radial': 'radial-gradient(circle, var(--tw-gradient-stops))'
			},
			boxShadow: {
				'glow-sm': '0 0 10px rgba(26, 109, 255, 0.2)',
				'glow': '0 0 20px rgba(26, 109, 255, 0.3)',
				'glow-lg': '0 0 30px rgba(26, 109, 255, 0.4)',
				'glow-accent': '0 0 20px rgba(0, 220, 213, 0.3)',
				'inner-glow': 'inset 0 0 20px rgba(26, 109, 255, 0.1)'
			},
			borderRadius: {
				'4xl': '2rem'
			},
			transitionTimingFunction: {
				'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
			}
		}
	},
	plugins: []
};
