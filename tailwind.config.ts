
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			screens: {
				xs: "420px",
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
			},
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
				'slide-in-left': 'slideInFromLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
				'slide-in-right': 'slideInFromRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
				'scale-in': 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
				'gentle-float': 'gentleFloat 4s ease-in-out infinite',
				'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
				'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
				'gradient-shift': 'gradientShift 6s ease infinite',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				fadeInUp: {
					from: {
						opacity: '0',
						transform: 'translate3d(0, 24px, 0)'
					},
					to: {
						opacity: '1',
						transform: 'translate3d(0, 0, 0)'
					}
				},
				slideInFromLeft: {
					from: {
						opacity: '0',
						transform: 'translate3d(-32px, 0, 0)'
					},
					to: {
						opacity: '1',
						transform: 'translate3d(0, 0, 0)'
					}
				},
				slideInFromRight: {
					from: {
						opacity: '0',
						transform: 'translate3d(32px, 0, 0)'
					},
					to: {
						opacity: '1',
						transform: 'translate3d(0, 0, 0)'
					}
				},
				scaleIn: {
					from: {
						opacity: '0',
						transform: 'scale(0.95)'
					},
					to: {
						opacity: '1',
						transform: 'scale(1)'
					}
				},
				gentleFloat: {
					'0%, 100%': {
						transform: 'translate3d(0, 0, 0)'
					},
					'50%': {
						transform: 'translate3d(0, -6px, 0)'
					}
				},
				pulseGlow: {
					'0%, 100%': {
						opacity: '0.5'
					},
					'50%': {
						opacity: '0.8'
					}
				},
				slideDown: {
					from: {
						opacity: '0',
						transform: 'translateY(-10px)'
					},
					to: {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				gradientShift: {
					'0%, 100%': {
						backgroundPosition: '0% 50%'
					},
					'50%': {
						backgroundPosition: '100% 50%'
					}
				}
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
