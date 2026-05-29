'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ── 1. CUSTOM CURSOR ── */
  const cursorGlow = document.getElementById('cursorGlow');
  let mouseX = 0, mouseY = 0, curX = 0, curY = 0;
  document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
  (function animCursor() {
    curX += (mouseX - curX) * 0.12;
    curY += (mouseY - curY) * 0.12;
    if (cursorGlow) {
      cursorGlow.style.left = curX + 'px';
      cursorGlow.style.top = curY + 'px';
    }
    requestAnimationFrame(animCursor);
  })();
  document.querySelectorAll('a, button, .menu-card, .gallery-item, .wheel-segment').forEach(el => {
    el.addEventListener('mouseenter', () => { if (cursorGlow) { cursorGlow.style.width = '60px'; cursorGlow.style.height = '60px'; } });
    el.addEventListener('mouseleave', () => { if (cursorGlow) { cursorGlow.style.width = '24px'; cursorGlow.style.height = '24px'; } });
  });

  /* ── 2. PARALLAX HERO ── */
  const heroBgLayers = document.querySelectorAll('.hero-bg-layer');
  function handleHeroParallax() {
    const scrollY = window.scrollY;
    heroBgLayers.forEach((layer, i) => {
      const speed = i === 0 ? 0.2 : 0.12;
      layer.style.transform = `translateY(${scrollY * speed}px) scale(1.1)`;
    });
  }
  window.addEventListener('scroll', handleHeroParallax, { passive: true });

  /* ── 3. STEAM CANVAS PARTICLES ── */
  const canvas = document.getElementById('steamCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });

    const particles = [];
    function createParticle() {
      return {
        x: Math.random() * window.innerWidth,
        y: window.innerHeight + 20,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: -(Math.random() * 0.8 + 0.3),
        opacity: Math.random() * 0.4 + 0.05,
        life: 1
      };
    }
    for (let i = 0; i < 60; i++) {
      const p = createParticle();
      p.y = Math.random() * window.innerHeight;
      particles.push(p);
    }
    function animParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (Math.random() < 0.08) particles.push(createParticle());
      particles.forEach((p, i) => {
        p.x += p.speedX + Math.sin(Date.now() * 0.001 + i) * 0.2;
        p.y += p.speedY;
        p.life -= 0.002;
        if (p.y < -20 || p.life <= 0) { particles.splice(i, 1); return; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196, 167, 125, ${p.opacity * p.life})`;
        ctx.fill();
      });
      requestAnimationFrame(animParticles);
    }
    animParticles();
  }

  /* ── 4. LIVE CUP COUNTER ── */
  const cupCount = document.getElementById('cupCount');
  if (cupCount) {
    let count = 247;
    setInterval(() => {
      if (Math.random() < 0.3) {
        count += Math.floor(Math.random() * 3) + 1;
        cupCount.textContent = count;
        cupCount.style.color = '#d4a045';
        setTimeout(() => { cupCount.style.color = ''; }, 300);
      }
    }, 4000);
  }

  /* ── 5. NAVBAR SCROLL ── */
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const navItems = document.querySelectorAll('.nav-link');
  const backToTop = document.getElementById('backToTop');

  function handleNavScroll() {
    const scrollY = window.scrollY;
    if (navbar) navbar.classList.toggle('scrolled', scrollY > 60);
    if (backToTop) backToTop.classList.toggle('visible', scrollY > 400);
  }
  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }
  document.querySelectorAll('.nav-link, .btn-reserve').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  /* ── 6. BACK TO TOP ── */
  if (backToTop) {
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ── 7. FADE-IN OBSERVER ── */
  const fadeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '-60px 0px', threshold: 0 });

  document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));

  /* ── 8. ACTIVE NAV LINK ── */
  const sections = document.querySelectorAll('section[id]');
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navItems.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
        });
      }
    });
  }, { rootMargin: '-40% 0px -40% 0px' });
  sections.forEach(s => sectionObserver.observe(s));

  /* ── 9. COUNTING ANIMATION ── */
  function animateCounter(el) {
    const target = parseInt(el.dataset.target);
    const duration = 1800;
    const start = performance.now();
    function tick(now) {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      el.textContent = Math.round(eased * target);
      if (elapsed < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  const statObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        document.querySelectorAll('.stat-num[data-target]').forEach(animateCounter);
        statObserver.disconnect();
      }
    });
  }, { threshold: 0.5 });
  const aboutStats = document.querySelector('.about-stats');
  if (aboutStats) statObserver.observe(aboutStats);

  /* ── 10. MENU FILTER TABS ── */
  const menuTabs = document.querySelectorAll('.menu-tab');
  const menuCards = document.querySelectorAll('.menu-card');
  menuTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      menuTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      menuCards.forEach((card, i) => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.display = 'block';
        if (!show) { setTimeout(() => { card.style.display = 'none'; }, 300); return; }
        setTimeout(() => {
          card.style.transition = `opacity 0.4s ${i * 0.07}s, transform 0.4s ${i * 0.07}s`;
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, 50);
      });
    });
  });

  /* ── 11. WISHLIST TOGGLE ── */
  document.querySelectorAll('.btn-wishlist').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      this.classList.toggle('active');
      const icon = this.querySelector('i');
      if (this.classList.contains('active')) {
        icon.classList.replace('far', 'fas');
        this.style.transform = 'scale(1.3)';
        setTimeout(() => { this.style.transform = ''; }, 300);
      } else {
        icon.classList.replace('fas', 'far');
      }
    });
  });

  /* ── 12. ORDER BUTTON ── */
  document.querySelectorAll('.btn-order').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const orig = this.textContent;
      this.textContent = '✓ Added!';
      this.style.background = 'rgba(74,222,128,0.2)';
      this.style.borderColor = 'rgba(74,222,128,0.6)';
      this.style.color = '#4ade80';
      setTimeout(() => {
        this.textContent = orig;
        this.style.background = '';
        this.style.borderColor = '';
        this.style.color = '';
      }, 1800);
    });
  });

  /* ── 13. GALLERY LIGHTBOX ── */
  window.openLightbox = function(el) {
    const img = el.querySelector('img');
    const cap = el.querySelector('.gallery-overlay span');
    const lb = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightboxImg');
    const lbCap = document.getElementById('lightboxCaption');
    if (!lb || !img) return;
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = cap ? cap.textContent : '';
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  window.closeLightbox = function() {
    const lb = document.getElementById('lightbox');
    if (lb) lb.classList.remove('open');
    document.body.style.overflow = '';
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  /* ── 14. TIME SLOTS (DYNAMIC) ── */
  const timeSlotsEl = document.getElementById('timeSlots');
  if (timeSlotsEl) {
    const slots = [
      { time: '9:00 AM', avail: true },
      { time: '10:00 AM', avail: true },
      { time: '11:00 AM', avail: false },
      { time: '12:00 PM', avail: false },
      { time: '1:00 PM', avail: true },
      { time: '2:00 PM', avail: true },
      { time: '3:00 PM', avail: true },
      { time: '5:00 PM', avail: false },
      { time: '6:00 PM', avail: true },
      { time: '7:00 PM', avail: true },
    ];
    timeSlotsEl.innerHTML = slots.map(s =>
      `<div class="time-slot ${s.avail ? 'avail' : 'busy'}" ${s.avail ? '' : 'title="Fully booked"'}>${s.time}</div>`
    ).join('');
    timeSlotsEl.querySelectorAll('.time-slot.avail').forEach(slot => {
      slot.addEventListener('click', () => {
        const rTime = document.getElementById('rTime');
        if (rTime) {
          const t = slot.textContent;
          for (let opt of rTime.options) {
            if (opt.textContent.includes(t.split(':')[0])) { rTime.value = opt.value; break; }
          }
        }
        timeSlotsEl.querySelectorAll('.time-slot').forEach(s => s.style.outline = '');
        slot.style.outline = '2px solid #4ade80';
      });
    });
  }

  /* ── 15. RESERVATION FORM ── */
  const reserveForm = document.getElementById('reserveForm');
  if (reserveForm) {
    // Set min date to today
    const rDate = document.getElementById('rDate');
    if (rDate) { const t = new Date(); rDate.min = t.toISOString().split('T')[0]; rDate.value = t.toISOString().split('T')[0]; }
    reserveForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const btn = this.querySelector('button[type=submit]');
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Confirming...</span>';
      btn.disabled = true;
      setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Reserved!</span>';
        btn.style.background = 'linear-gradient(135deg, #15803d, #166534)';
        const msg = document.getElementById('reserveSuccess');
        if (msg) { msg.textContent = '🎉 Your table has been reserved! We\'ll send a confirmation to your phone shortly.'; msg.style.display = 'block'; }
      }, 1500);
    });
  }

  /* ── 16. CONTACT FORM ── */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const btn = this.querySelector('button[type=submit]');
      btn.innerHTML = '<span>Sending...</span> <i class="fas fa-spinner fa-spin"></i>';
      btn.disabled = true;
      setTimeout(() => {
        btn.innerHTML = '<span>Sent!</span> <i class="fas fa-check"></i>';
        const msg = document.getElementById('contactSuccess');
        if (msg) { msg.textContent = '☕ Message received! We\'ll get back to you within 24 hours.'; msg.style.display = 'block'; }
      }, 1200);
    });
  }

  /* ── 17. FLAVOUR WHEEL ── */
  const segments = document.querySelectorAll('.wheel-segment');
  const tooltip = document.getElementById('flavourTooltip');
  const segLabels = ['Sweet & Caramel', 'Fruity & Bright', 'Earthy & Woody', 'Floral & Delicate', 'Nutty & Rich', 'Herbal & Spiced'];
  segments.forEach((seg, i) => {
    seg.addEventListener('mouseenter', () => {
      const flavors = seg.dataset.flavor || segLabels[i];
      if (tooltip) { tooltip.textContent = '→ ' + flavors; tooltip.style.opacity = '1'; }
    });
    seg.addEventListener('mouseleave', () => {
      if (tooltip) tooltip.textContent = 'Hover a segment';
    });
  });

  /* ── 18. AMBIENT SOUND TOGGLE ── */
  const ambientToggle = document.getElementById('ambientToggle');
  const soundIcon = document.getElementById('soundIcon');
  // Create AudioContext-based white noise simulating café ambience
  let audioCtx = null;
  let gainNode = null;
  let isPlaying = false;

  if (ambientToggle) {
    ambientToggle.addEventListener('click', () => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const bufferSize = audioCtx.sampleRate * 4;
        const buffer = audioCtx.createBuffer(2, bufferSize, audioCtx.sampleRate);
        for (let c = 0; c < 2; c++) {
          const data = buffer.getChannelData(c);
          for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.02;
        }
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        // Low-pass filter for cozy muffled sound
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        gainNode = audioCtx.createGain();
        gainNode.gain.value = 0;
        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        source.start();
      }
      isPlaying = !isPlaying;
      if (gainNode) gainNode.gain.setTargetAtTime(isPlaying ? 0.6 : 0, audioCtx.currentTime, 0.5);
      if (soundIcon) soundIcon.className = isPlaying ? 'fas fa-volume-up' : 'fas fa-volume-mute';
      ambientToggle.style.borderColor = isPlaying ? 'rgba(212,160,69,0.5)' : '';
      ambientToggle.style.color = isPlaying ? 'var(--amber)' : '';
    });
  }

  /* ── 19. SCROLL HERO PARTICLES ── */
  const heroParticles = document.getElementById('heroParticles');
  if (heroParticles) {
    for (let i = 0; i < 15; i++) {
      const p = document.createElement('div');
      p.style.cssText = `
        position: absolute;
        width: ${Math.random() * 4 + 2}px;
        height: ${Math.random() * 4 + 2}px;
        border-radius: 50%;
        background: rgba(196,167,125,${Math.random() * 0.4 + 0.1});
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: floatP ${Math.random() * 6 + 4}s ease-in-out ${Math.random() * 4}s infinite;
        pointer-events: none;
      `;
      heroParticles.appendChild(p);
    }
    if (!document.getElementById('floatPStyle')) {
      const style = document.createElement('style');
      style.id = 'floatPStyle';
      style.textContent = `
        @keyframes floatP {
          0%,100%{transform:translateY(0) translateX(0)}
          33%{transform:translateY(-30px) translateX(10px)}
          66%{transform:translateY(-15px) translateX(-8px)}
        }
        #heroParticles { position:absolute; inset:0; z-index:3; pointer-events:none; }
      `;
      document.head.appendChild(style);
    }
  }

  /* ── 20. SMOOTH REVEAL CARDS ── */
  const cardObserver = new IntersectionObserver(entries => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, i * 80);
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.menu-card, .exp-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1)';
    cardObserver.observe(card);
  });

});
