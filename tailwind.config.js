/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
      extend: {
        colors: {
          primary: 'var(--primary)',
          accent: 'var(--accent)',
          muted: 'var(--muted)'
        },
        backgroundColor: {
          skin: 'var(--bg)',
          card: 'var(--card)'
        },
        textColor: {
          skin: 'var(--text)'
        },
        boxShadow: {
          floating: '0 20px 45px rgba(11, 120, 255, 0.18)'
        },
        transitionDuration: {
          theme: '300ms'
        }
      }
    },
    plugins: []
  };