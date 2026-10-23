import { useEffect, useRef } from 'react';
import { playPartyPopperSound } from '../utils/audioUtils';

const COLORS = [
  '#f59e0b', // Gold
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#fbbf24', // Amber
  '#a855f7', // Purple
];

export default function CelebrationPoppers({ triggerKey = 0 }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const spawnParticles = () => {
      const newParticles = [];

      // 1. Left Cannon (Shoots up and right)
      for (let i = 0; i < 70; i++) {
        const angle = -Math.PI / 2 + (Math.random() * 0.7 - 0.1); // ~ -70 to -35 deg
        const speed = 16 + Math.random() * 18;
        newParticles.push(createParticle(0, height * 0.88, angle, speed));
      }

      // 2. Right Cannon (Shoots up and left)
      for (let i = 0; i < 70; i++) {
        const angle = -Math.PI / 2 - (Math.random() * 0.7 - 0.1); // ~ -110 to -145 deg
        const speed = 16 + Math.random() * 18;
        newParticles.push(createParticle(width, height * 0.88, angle, speed));
      }

      // 3. Top-center celebratory shower
      for (let i = 0; i < 40; i++) {
        const angle = -Math.PI / 2 + (Math.random() * 1.4 - 0.7);
        const speed = 12 + Math.random() * 14;
        newParticles.push(createParticle(width * 0.5, height * 0.35, angle, speed));
      }

      particlesRef.current = [...particlesRef.current, ...newParticles];
      playPartyPopperSound();
    };

    const createParticle = (x, y, angle, speed) => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const type = Math.random() > 0.3 ? 'ribbon' : Math.random() > 0.5 ? 'circle' : 'star';
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 7 + Math.random() * 9,
        color,
        type,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        wobble: Math.random() * 10,
        wobbleSpeed: 0.08 + Math.random() * 0.06,
        alpha: 1,
        decay: 0.003 + Math.random() * 0.004,
      };
    };

    // Initial blast
    spawnParticles();

    // Secondary delayed blast for extended festive effect
    const timeout = setTimeout(() => {
      spawnParticles();
    }, 900);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const activeParticles = [];
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.32; // Gravity
        p.vx *= 0.985; // Air drag
        p.rotation += p.rotationSpeed;
        p.wobble += p.wobbleSpeed;
        p.alpha -= p.decay;

        if (p.alpha > 0 && p.y < height + 40) {
          activeParticles.push(p);

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.scale(Math.cos(p.wobble), 1);
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;

          if (p.type === 'ribbon') {
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.5);
          } else if (p.type === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Star
            ctx.beginPath();
            for (let s = 0; s < 5; s++) {
              ctx.lineTo(
                Math.cos(((18 + s * 72) * Math.PI) / 180) * p.size * 0.5,
                -Math.sin(((18 + s * 72) * Math.PI) / 180) * p.size * 0.5
              );
              ctx.lineTo(
                Math.cos(((54 + s * 72) * Math.PI) / 180) * p.size * 0.25,
                -Math.sin(((54 + s * 72) * Math.PI) / 180) * p.size * 0.25
              );
            }
            ctx.closePath();
            ctx.fill();
          }

          ctx.restore();
        }
      }

      particlesRef.current = activeParticles;
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [triggerKey]);

  return (
    <>
      {/* Confetti Animation Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Celebratory Party Popper Cannons (Bottom-Left & Bottom-Right) */}
      <div
        className="popper-canon-left"
        style={{
          position: 'absolute',
          bottom: 84,
          left: 18,
          pointerEvents: 'none',
          zIndex: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          animation: 'popperShake 0.6s ease infinite alternate',
        }}
      >
        <span style={{ fontSize: '2.4rem', filter: 'drop-shadow(0 4px 12px rgba(245,158,11,0.5))' }}>
          🎉
        </span>
      </div>

      <div
        className="popper-canon-right"
        style={{
          position: 'absolute',
          bottom: 84,
          right: 18,
          pointerEvents: 'none',
          zIndex: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transform: 'scaleX(-1)',
          animation: 'popperShake 0.6s ease 0.3s infinite alternate',
        }}
      >
        <span style={{ fontSize: '2.4rem', filter: 'drop-shadow(0 4px 12px rgba(245,158,11,0.5))' }}>
          🎉
        </span>
      </div>
    </>
  );
}
