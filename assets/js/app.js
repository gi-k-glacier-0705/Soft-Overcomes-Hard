/**
 * THE SOFT OVERCOMES THE HARD
 * A Generative Simulation of Fluid Persistence
 * 
 * Logic:
 * 1. Flow Field: Uses trigonometry-based pseudo-noise to create a directional stream.
 * 2. Particle System: Represents "Soft" ink. Particles follow the flow but react to obstacles.
 * 3. Obstacle Logic: "Hard" structures that obstruct flow but lose "integrity" (erode) 
 *    whenever ink particles collide with them.
 */

class App {
    constructor() {
        this.canvas = document.getElementById('canvas-main');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.dpr = window.devicePixelRatio || 1;
        
        this.particles = [];
        this.obstacles = [];
        this.particleCount = 600;
        this.time = 0;
        
        this.init();
        this.setupEventListeners();
        this.loop();
    }

    init() {
        this.resize();
        this.createObstacles();
        this.resetParticles();
        
        // Initial clear to background color
        this.ctx.fillStyle = '#e8e6e1';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    resize() {
        this.canvas.width = window.innerWidth * this.dpr;
        this.canvas.height = window.innerHeight * this.dpr;
        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;
        this.ctx.scale(this.dpr, this.dpr);
    }

    createObstacles() {
        // Create initial "Hard" structures
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        this.obstacles = [
            { x: centerX - 100, y: centerY - 50, w: 40, h: 200, integrity: 1.0 },
            { x: centerX + 60, y: centerY - 150, w: 30, h: 120, integrity: 1.0 },
            { x: centerX - 200, y: centerY + 100, w: 150, h: 30, integrity: 1.0 }
        ];
    }

    resetParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle() {
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: 0,
            vy: 0,
            life: Math.random() * 0.5 + 0.5,
            history: [], // For trailing effect
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 2 + 1
        };
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.init());

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.addObstacle(e.clientX - rect.left, e.clientY - rect.top);
        });

        document.getElementById('btn-clear').addEventListener('click', () => {
            this.obstacles = [];
        });

        document.getElementById('btn-reset').addEventListener('click', () => {
            this.init();
        });
    }

    addObstacle(x, y) {
        this.obstacles.push({
            x: x - 25,
            y: y - 25,
            w: 50,
            h: 50,
            integrity: 1.0
        });
    }

    // A smooth flow field using overlapping sine waves
    getFlow(x, y) {
        const freq = 0.002;
        const angle = (Math.sin(x * freq + this.time) + Math.cos(y * freq + this.time)) * Math.PI;
        return {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
    }

    update() {
        this.time += 0.005;
        let totalIntegrity = 0;

        this.particles.forEach(p => {
            const flow = this.getFlow(p.x, p.y);
            
            // Influence velocity by flow field
            p.vx += flow.x * 0.1;
            p.vy += flow.y * 0.1;
            
            // Apply speed limit
            const mag = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            p.vx = (p.vx / mag) * p.speed;
            p.vy = (p.vy / mag) * p.speed;

            p.x += p.vx;
            p.y += p.vy;

            // Collision Detection with Obstacles
            this.obstacles.forEach(obs => {
                if (p.x > obs.x && p.x < obs.x + obs.w &&
                    p.y > obs.y && p.y < obs.y + obs.h) {
                    
                    // The "Soft" yields but erodes the "Hard"
                    obs.integrity -= 0.0001; // Erosion rate
                    
                    // Bounce/yield logic
                    p.vx *= -0.5;
                    p.vy *= -0.5;
                }
            });

            // Wrap screen
            if (p.x < 0) p.x = window.innerWidth;
            if (p.x > window.innerWidth) p.x = 0;
            if (p.y < 0) p.y = window.innerHeight;
            if (p.y > window.innerHeight) p.y = 0;
        });

        // Remove eroded obstacles
        this.obstacles = this.obstacles.filter(obs => obs.integrity > 0.1);
        
        // Update UI
        this.obstacles.forEach(o => totalIntegrity += o.integrity);
        const avgIntegrity = this.obstacles.length > 0 
            ? (totalIntegrity / this.obstacles.length) * 100 
            : 0;
        document.getElementById('integrity-value').innerText = avgIntegrity.toFixed(1);
    }

    draw() {
        // Fade effect for trails (simulates ink soaking into paper)
        this.ctx.fillStyle = 'rgba(232, 230, 225, 0.04)'; 
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        // Draw Obstacles (The Hard)
        this.obstacles.forEach(obs => {
            this.ctx.fillStyle = `rgba(122, 122, 122, ${obs.integrity})`;
            this.ctx.strokeStyle = `rgba(26, 26, 26, ${obs.integrity * 0.5})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.rect(obs.x, obs.y, obs.w, obs.h);
            this.ctx.fill();
            this.ctx.stroke();
        });

        // Draw Particles (The Soft)
        this.ctx.fillStyle = 'rgba(26, 26, 26, 0.6)';
        this.particles.forEach(p => {
            this.ctx.beginPath();
            // Subtle variable radius based on velocity for organic feel
            const r = p.size * (1 + Math.abs(p.vx * 0.2));
            this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

// Start the application
window.addEventListener('load', () => {
    new App();
});