
(() => {
    const hero = document.querySelector(".hero");
    const canvas = hero && hero.querySelector(".beans");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const COLORS = ["#3e2518", "#4b2e1e", "#5a3825", "#6b4430"];
    const GRAVITY = 1400;   // px/detik^2
    const BOUNCE = 0.42;    // 0 = tidak memantul, 1 = pantulan penuh
    const PUSH_RADIUS = 110;

    let W = 0, H = 0, beans = [];
    let running = false, visible = true, last = 0;

    const rand = (a, b) => a + Math.random() * (b - a);

    function makeBean(spawnAbove) {
        const r = W < 600 ? rand(10, 14) : rand(12, 18);
        return {
            r,
            x: rand(r, Math.max(r + 1, W - r)),
            y: spawnAbove ? -rand(0, H * 1.2) - r : H - r,
            vx: rand(-80, 80),
            vy: 0,
            a: rand(0, Math.PI * 2),
            spin: rand(-6, 6),
            depth: rand(0, Math.min(60, H * 0.2)), // kedalaman lantai acak -> terlihat menumpuk
            color: COLORS[Math.floor(Math.random() * COLORS.length)]
        };
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = hero.clientWidth;
        H = hero.clientHeight;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const target = Math.round(Math.min(60, Math.max(18, W / 28)));
        while (beans.length < target) beans.push(makeBean(true));
        beans.length = Math.min(beans.length, target);
        beans.forEach(b => { b.x = Math.min(Math.max(b.x, b.r), W - b.r); });
        wake();
    }

    function step(dt) {
        let moving = false;
        for (const b of beans) {
            b.vy += GRAVITY * dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.a += b.spin * dt;

            if (b.x < b.r) { b.x = b.r; b.vx = -b.vx * BOUNCE; }
            if (b.x > W - b.r) { b.x = W - b.r; b.vx = -b.vx * BOUNCE; }

            const floor = H - b.r - b.depth;
            if (b.y > floor) {
                b.y = floor;
                b.vy = Math.abs(b.vy) > 60 ? -b.vy * BOUNCE : 0;
                const f = Math.min(1, 6 * dt); // gesekan lantai
                b.vx -= b.vx * f;
                b.spin -= b.spin * f;
            }
            if (Math.abs(b.vx) > 4 || Math.abs(b.vy) > 4 || Math.abs(b.spin) > 0.2 || b.y < floor - 1) moving = true;
        }
        return moving;
    }

    function drawBean(b) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.a);
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, b.r, b.r * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(20, 10, 5, 0.55)";
        ctx.lineWidth = b.r * 0.14;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-b.r * 0.85, 0);
        ctx.bezierCurveTo(-b.r * 0.3, -b.r * 0.3, b.r * 0.3, b.r * 0.3, b.r * 0.85, 0);
        ctx.stroke();
        ctx.restore();
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        beans.forEach(drawBean);
    }

    function frame(now) {
        if (!running) return;
        const dt = Math.min((now - last) / 1000, 1 / 30);
        last = now;
        const moving = step(dt);
        draw();
        if (moving && visible && !document.hidden) requestAnimationFrame(frame);
        else running = false; // tidur sampai ada dorongan/resize
    }

    function wake() {
        if (reduceMotion) {
            for (let i = 0; i < 400; i++) step(1 / 60);
            draw();
            return;
        }
        if (running || !visible || document.hidden) return;
        running = true;
        last = performance.now();
        requestAnimationFrame(frame);
    }

    hero.addEventListener("pointermove", e => {
        if (reduceMotion) return;
        const rect = hero.getBoundingClientRect();
        const px = e.clientX - rect.left, py = e.clientY - rect.top;
        for (const b of beans) {
            const dx = b.x - px, dy = b.y - py;
            const d = Math.hypot(dx, dy);
            if (d < PUSH_RADIUS && d > 0.001) {
                const k = (1 - d / PUSH_RADIUS) * 500;
                b.vx += (dx / d) * k;
                b.vy += (dy / d) * k - 80;
                b.spin += rand(-8, 8);
            }
        }
        wake();
    });

    new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) wake();
    }).observe(hero);
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("resize", resize);

    resize();
})();
