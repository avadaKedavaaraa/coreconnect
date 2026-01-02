
import React, { useRef, useEffect } from 'react';
import { Lineage } from '../types';

interface LiveBackgroundProps {
  lineage: Lineage;
}

const LiveBackground: React.FC<LiveBackgroundProps> = ({ lineage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isWizard = lineage === Lineage.WIZARD;

  useEffect(() => {
    // 1. Capture ref to local variable
    const canvasNode = canvasRef.current;
    
    // 2. Strict null check
    if (!canvasNode) return;

    // 3. Create a strictly typed const for closure use
    const canvas = canvasNode as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let mouse = { x: -1000, y: -1000 };
    let animationFrameId: number;

    const resize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
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
        // Use the local 'canvas' variable which is guaranteed HTMLCanvasElement
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.baseX = this.x;
        this.baseY = this.y;
        
        if (isWizard) {
            // Fireflies / Magic Motes
            this.vx = (Math.random() - 0.5) * 0.8; // Slightly faster
            this.vy = -(Math.random() * 1.5 + 0.5); // Float up faster
            this.size = Math.random() * 2.5 + 1; // Slightly larger
            // Increased Opacity: 0.4 to 1.0 (was 0.0 to 0.5)
            this.color = `rgba(16, 185, 129, ${0.4 + Math.random() * 0.6})`; 
        } else {
            // Neural Grid Points
            this.vx = (Math.random() - 0.5) * 1.5;
            this.vy = (Math.random() - 0.5) * 1.5;
            this.size = Math.random() * 2 + 1;
            // Increased Opacity: 0.4 to 1.0
            this.color = `rgba(217, 70, 239, ${0.4 + Math.random() * 0.6})`; 
        }
      }

      update() {
        // Wizard Logic: Flow up, interact smoothly
        if (isWizard) {
            this.x += this.vx;
            this.y += this.vy;

            // Reset if off screen (Loop from bottom)
            if (this.y < -10) {
                this.y = canvas.height + 10;
                this.x = Math.random() * canvas.width;
            }
            // Loop sides
            if (this.x < -10) this.x = canvas.width + 10;
            if (this.x > canvas.width + 10) this.x = -10;

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
                this.x += dx * 0.02;
                this.y += dy * 0.02;
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
      // Significantly increased count for "everywhere" effect
      const count = isWizard ? 120 : 180; 
      
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    }

    function animate() {
      if (!ctx || !canvas) return;
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
            if (dist < 200) {
                // Brighter lines
                ctx.strokeStyle = `rgba(217, 70, 239, ${0.5 * (1 - dist/200)})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
            
            // Connect to nearby particles (Grid effect)
            particles.forEach(p2 => {
                const dx2 = p.x - p2.x;
                const dy2 = p.y - p2.y;
                const dist2 = Math.sqrt(dx2*dx2 + dy2*dy2);
                if (dist2 < 100) {
                    ctx.strokeStyle = `rgba(217, 70, 239, ${0.2 * (1 - dist2/100)})`;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            });
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
