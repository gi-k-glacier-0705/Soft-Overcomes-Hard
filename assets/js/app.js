/**
 * THE SOFT OVERCOMES THE HARD
 * A generative art system inspired by the Daoist metaphor of water eroding stone.
 *
 * Input uses Pointer Events so mouse, touch, and stylus share the same behavior.
 */

class App {
    constructor() {
        this.canvas = document.getElementById('canvas-main');
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        this.dpr = 1;
        this.particles = [];
        this.obstacles = [];
        this.particleCount = 600;
        this.time = 0;

        this.activePointerId = null;
        this.lastObstaclePoint = null;
        this.dragSpacing = 28;

        this.resizeCanvas();
        this.createObstacles();
        this.resetParticles();
        this.clearCanvas();
        this.setupEventListeners();
        this.loop();
    }

    getViewportSize() {
        return {
            width: document.documentElement.clientWidth || window.innerWidth,
            height: document.documentElement.clientHeight || window.innerHeight
        };
    }

    resizeCanvas() {
        const { width, height } = this.getViewportSize();
        this.dpr = Math.max(1, window.devicePixelRatio || 1);

        // Assigning canvas.width/height clears the bitmap and resets its transform.
        this.canvas.width = Math.round(width * this.dpr);
        this.canvas.height = Math.round(height * this.dpr);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        // Set, rather than accumulate, the transform. Repeated resizes won't compound scale.
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.clearCanvas();
    }

    clearCanvas() {
        const { width, height } = this.getViewportSize();
        this.ctx.fillStyle = '#e8e6e1';
        this.ctx.fillRect(0, 0, width, height);
    }

    createObstacles() {
        const { width, height } = this.getViewportSize();
        const centerX = width / 2;
        const centerY = height / 2;

        this.obstacles = [
            { x: centerX - 100, y: centerY - 50, w: 40, h: 200, integrity: 1.0 },
            { x: centerX + 60, y: centerY - 150, w: 30, h: 120, integrity: 1.0 },
            { x: centerX - 200, y: centerY + 100, w: 150, h: 30, integrity: 1.0 }
        ];
    }

    resetParticles() {
        const { width, height } = this.getViewportSize();
        this.particles = [];

        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(this.createParticle(width, height));
        }
    }

    createParticle(width, height) {
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            vx: 0,
            vy: 0,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 2 + 1
        };
    }

    setupEventListeners() {
        // Resize the drawing surface only. Do not recreate particles or obstacles:
        // mobile browser chrome and orientation changes can trigger resize events.
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('orientationchange', () => {
            requestAnimationFrame(() => this.resizeCanvas());
        });

        this.canvas.addEventListener('pointerdown', (event) => {
            if (event.button !== undefined && event.button !== 0) return;

            event.preventDefault();
            this.activePointerId = event.pointerId;
            this.lastObstaclePoint = null;

            try {
                this.canvas.setPointerCapture(event.pointerId);
            } catch (_) {
                // Pointer capture may be unavailable in some embedded browsers.
            }

            const point = this.getCanvasPoint(event);
            this.addObstacle(point.x, point.y);
            this.lastObstaclePoint = point;
        });

        this.canvas.addEventListener('pointermove', (event) => {
            if (event.pointerId !== this.activePointerId) return;
            event.preventDefault();

            const point = this.getCanvasPoint(event);
            if (!this.lastObstaclePoint) {
                this.addObstacle(point.x, point.y);
                this.lastObstaclePoint = point;
                return;
            }

            const dx = point.x - this.lastObstaclePoint.x;
            const dy = point.y - this.lastObstaclePoint.y;
            const distance = Math.hypot(dx, dy);

            // Add obstacles along a drag at a controlled spacing, rather than
            // creating hundreds of objects from a single high-frequency gesture.
            if (distance >= this.dragSpacing) {
                const steps = Math.floor(distance / this.dragSpacing);
                for (let i = 1; i <= steps; i++) {
                    const t = i / steps;
                    this.addObstacle(
                        this.lastObstaclePoint.x + dx * t,
                        this.lastObstaclePoint.y + dy * t
                    );
                }
                this.lastObstaclePoint = point;
            }
        });

        const endPointer = (event) => {
            if (event.pointerId !== this.activePointerId) return;
            this.activePointerId = null;
            this.lastObstaclePoint = null;
        };

        this.canvas.addEventListener('pointerup', endPointer);
        this.canvas.addEventListener('pointercancel', endPointer);
        this.canvas.addEventListener('lostpointercapture', endPointer);

        document.getElementById('btn-clear').addEventListener('click', () => {
            this.obstacles = [];
        });

        document.getElementById('btn-reset').addEventListener('click', () => {
            this.resetFlow();
        });
    }

    getCanvasPoint(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
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

    resetFlow() {
        this.time = 0;
        this.createObstacles();
        this.resetParticles();
        this.clearCanvas();
    }

    // A smooth, trigonometry-based flow field (a visual model, not fluid dynamics).
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

        const { width, height } = this.getViewportSize();

        this.particles.forEach((p) => {
            const flow = this.getFlow(p.x, p.y);

            p.vx += flow.x * 0.1;
            p.vy += flow.y * 0.1;

            const magnitude = Math.hypot(p.vx, p.vy) || 1;
            p.vx = (p.vx / magnitude) * p.speed;
            p.vy = (p.vy / magnitude) * p.speed;

            p.x += p.vx;
            p.y += p.vy;

            this.obstacles.forEach((obs) => {
                if (
                    p.x > obs.x && p.x < obs.x + obs.w &&
                    p.y > obs.y && p.y < obs.y + obs.h
                ) {
                    obs.integrity -= 0.0001;
                    p.vx *= -0.5;
                    p.vy *= -0.5;
                }
            });

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;
        });

        this.obstacles = this.obstacles.filter((obs) => obs.integrity > 0.1);

        this.obstacles.forEach((obs) => {
            totalIntegrity += obs.integrity;
        });

        const averageIntegrity = this.obstacles.length
            ? (totalIntegrity / this.obstacles.length) * 100
            : 0;

        document.getElementById('integrity-value').textContent = averageIntegrity.toFixed(1);
    }

    draw() {
        const { width, height } = this.getViewportSize();

        this.ctx.fillStyle = 'rgba(232, 230, 225, 0.04)';
        this.ctx.fillRect(0, 0, width, height);

        this.obstacles.forEach((obs) => {
            this.ctx.fillStyle = `rgba(122, 122, 122, ${obs.integrity})`;
            this.ctx.strokeStyle = `rgba(26, 26, 26, ${obs.integrity * 0.5})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.rect(obs.x, obs.y, obs.w, obs.h);
            this.ctx.fill();
            this.ctx.stroke();
        });

        this.ctx.fillStyle = 'rgba(26, 26, 26, 0.6)';
        this.particles.forEach((p) => {
            const radius = p.size * (1 + Math.abs(p.vx * 0.2));
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

window.addEventListener('load', () => {
    new App();
});
