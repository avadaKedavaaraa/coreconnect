
import React, { useRef, useEffect } from 'react';
import { Lineage } from '../types';

interface LiveBackgroundProps {
  lineage: Lineage;
}

const LiveBackground: React.FC<LiveBackgroundProps> = ({ lineage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isWizard = lineage === Lineage.WIZARD;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let mouse = { x: -1000, y: -1000 };
    let animationFrameId: number;

    const resize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles();
      }
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      canvasWidth: number;
      canvasHeight: number;

      constructor(w: number, h: number) {
        this.canvasWidth = w;
        this.canvasHeight = h;
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        
        if (isWizard) {
            // Fireflies
            this.vx = (Math.random() - 0.5) * 0.8; 
            this.vy = -(Math.random() * 1.5 + 0.5); 
            this.size = Math.random() * 2.5 + 1; 
            this.color = `rgba(16, 185, 129, ${0.4 + Math.random() * 0.6})`; 
        } else {
            // Neural Grid
            this.vx = (Math.random() - 0.5) * 1.5;
            this.vy = (Math.random() - 0.5) * 1.5;
            this.size = Math.random() * 2 + 1;
            this.color = `rgba(217, 70, 239, ${0.4 + Math.random() * 0.6})`; 
        }
      }

      update() {
        if (isWizard) {
            this.x += this.vx;
            this.y += this.vy;

            // Reset loop
            if (this.y < -10) {
                this.y = this.canvasHeight + 10;
                this.x = Math.random() * this.canvasWidth;
            }
            if (this.x < -10) this.x = this.canvasWidth + 10;
            if (this.x > this.canvasWidth + 10) this.x = -10;

            // Mouse Repel
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 150;

            if (distance < maxDistance) {
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const force = (maxDistance - distance) / maxDistance;
                this.x -= forceDirectionX * force * 2;
                this.y -= forceDirectionY * force * 2;
            }
        } else {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > this.canvasWidth) this.vx *= -1;
            if (this.y < 0 || this.y > this.canvasHeight) this.vy *= -1;

            // Mouse Attract
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 200) {
                this.x += dx * 0.02;
                this.y += dy * 0.02;
            }
        }
      }

      draw(context: CanvasRenderingContext2D) {
        context.fillStyle = this.color;
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        context.fill();
      }
    }

    function initParticles() {
      particles = [];
      const count = isWizard ? 120 : 180; 
      
      if (canvas) {
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(canvas.width, canvas.height));
        }
      }
    }

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.update();
        p.draw(ctx);

        // Muggle Lines
        if (!isWizard) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 200) {
                ctx.strokeStyle = `rgba(217, 70, 239, ${0.5 * (1 - dist/200)})`;
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

    const handleMouseMove = (e: MouseEvent) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);

    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
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
