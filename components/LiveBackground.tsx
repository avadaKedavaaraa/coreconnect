
import React, { useRef, useEffect } from 'react';
import { Lineage } from '../types';

interface LiveBackgroundProps {
  lineage: Lineage;
}

const LiveBackground: React.FC<LiveBackgroundProps> = ({ lineage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isWizard = lineage === Lineage.WIZARD;

  useEffect(() => {
    // 1. Capture the ref value
    const canvasEl = canvasRef.current;
    
    // 2. Explicit null check
    if (!canvasEl) return;

    // 3. Create a non-nullable reference for closures
    const canvas = canvasEl;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let mouse = { x: -1000, y: -1000 };
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      baseX: number;
      baseY: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.baseX = this.x;
        this.baseY = this.y;
        
        if (isWizard) {
            // Fireflies / Magic Motes
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = -(Math.random() * 1 + 0.5); // Float up
            this.size = Math.random() * 2 + 1;
            this.color = `rgba(16, 185, 129, ${Math.random() * 0.5})`; // Emerald
        } else {
            // Neural Grid Points
            this.vx = (Math.random() - 0.5) * 1;
            this.vy = (Math.random() - 0.5) * 1;
            this.size = Math.random() * 1.5 + 1;
            this.color = `rgba(217, 70, 239, ${Math.random() * 0.5})`; // Fuchsia
        }
      }

      update() {
        // Wizard Logic: Flow up, interact smoothly
        if (isWizard) {
            this.x += this.vx;
            this.y += this.vy;

            // Reset if off screen
            if (this.y < -10) {
                this.y = canvas.height + 10;
                this.x = Math.random() * canvas.width;
            }

            // Mouse Repel
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const maxDistance = 150;
            const force = (maxDistance - distance) / maxDistance;

            if (distance < maxDistance) {
                this.x -= forceDirectionX * force * 2;
                this.y -= forceDirectionY * force * 2;
            }
        } 
        // Muggle Logic: Network connect
        else {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

            // Mouse Connect (Plexus)
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Subtle pull
            if (distance < 200) {
                this.x += dx * 0.01;
                this.y += dy * 0.01;
            }
        }
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function initParticles() {
      particles = [];
      const count = isWizard ? 50 : 80; // More for grid, less for fireflies
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    }

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.update();
        p.draw();

        // Muggle: Draw Connections
        if (!isWizard) {
            // Connect to mouse
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 150) {
                ctx.strokeStyle = `rgba(217, 70, 239, ${1 - dist/150})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.x;
        mouse.y = e.y;
    });

    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [lineage]);

  return (
    <canvas 
        ref={canvasRef} 
        className="fixed inset-0 pointer-events-none z-0"
    />
  );
};

export default LiveBackground;
