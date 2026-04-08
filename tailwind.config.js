var config = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        container: {
            center: true,
            padding: "1.5rem",
            screens: {
                "2xl": "1440px"
            }
        },
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))"
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))"
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))"
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))"
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))"
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))"
                },
                panel: {
                    DEFAULT: "hsl(var(--panel))",
                    foreground: "hsl(var(--panel-foreground))"
                },
                sidebar: {
                    DEFAULT: "hsl(var(--sidebar))",
                    foreground: "hsl(var(--sidebar-foreground))",
                    accent: "hsl(var(--sidebar-accent))",
                    border: "hsl(var(--sidebar-border))"
                }
            },
            borderRadius: {
                xl: "1.25rem",
                "2xl": "1.75rem"
            },
            boxShadow: {
                glow: "0 20px 60px -32px rgba(15, 23, 42, 0.3)",
                card: "0 18px 48px -24px rgba(15, 23, 42, 0.18)"
            },
            fontFamily: {
                sans: ["Aptos", "\"Segoe UI Variable\"", "\"Trebuchet MS\"", "sans-serif"],
                display: ["Bahnschrift", "\"Aptos Display\"", "\"Segoe UI Variable\"", "sans-serif"]
            },
            backgroundImage: {
                "grid-soft": "linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px)"
            }
        }
    },
    plugins: []
};
export default config;
