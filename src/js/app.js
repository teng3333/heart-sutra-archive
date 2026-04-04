/* ============================================
   Heart Sutra Modern Archive — Main Application
   ============================================ */

(function () {
  'use strict';

  // --- Track Data ---
  const tracks = [
    {
      number: 1,
      genre: 'Indy',
      title: '般若心経indie',
      image: 'assets/covers/01_indy.jpg',
      url: 'https://suno.com/s/Wx7CnwCbekbEYNGr',
      tags: '#般若心経 #HEARTSUTRA'
    },
    {
      number: 2,
      genre: 'ENKA',
      title: '般若心経演歌',
      image: 'assets/covers/02_enka.jpg',
      url: 'https://suno.com/s/enJa54lfA1apbDbO',
      tags: '演歌'
    },
    {
      number: 3,
      genre: 'Tango',
      title: '般若心経tango',
      image: 'assets/covers/03_tango.jpg',
      url: 'https://suno.com/s/5Sy85cO08UtHyEVC',
      tags: 'tango'
    },
    {
      number: 4,
      genre: 'Acoustic',
      title: '般若心経acoustic',
      image: 'assets/covers/04_acoustic.jpg',
      url: 'https://suno.com/s/RxVB7XfJIoxjGBae',
      tags: 'indie pop, indie ballad, soft electronic'
    },
    {
      number: 5,
      genre: 'Blues',
      title: '般若心経Blues',
      image: 'assets/covers/05_blues.jpg',
      url: 'https://suno.com/s/m5FIUyXT3HKfQBgD',
      tags: 'Blues'
    },
    {
      number: 6,
      genre: 'JAZZ',
      title: '般若心経JAZZ',
      image: 'assets/covers/06_jazz.jpg',
      url: 'https://suno.com/s/jHp51qiXA6Gyylq1',
      tags: 'Jazz Ballad, Female Vocals, Piano'
    },
    {
      number: 7,
      genre: 'Funk',
      title: '般若心経funk',
      image: 'assets/covers/07_funk.jpg',
      url: 'https://suno.com/s/aeL9Kzw6rv2mN4Ey',
      tags: '#般若心経 #色即是空空即是色'
    },
    {
      number: 8,
      genre: 'Bollywood',
      title: '般若心経Bollywood',
      image: 'assets/covers/08_bollywood.jpg',
      url: 'https://suno.com/s/bjw8h0khtyiDCC9k',
      tags: '#般若心経 #HEARTSUTRA'
    },
    {
      number: 9,
      genre: 'iDOL',
      title: '般若心経アイドル',
      image: 'assets/covers/09_idol.jpg',
      url: 'https://suno.com/s/aRq2vh0JiqRjFHqw',
      tags: 'kawaii idol pop, drum and bass'
    },
    {
      number: 10,
      genre: 'Cyber Punk',
      title: '般若心経ARTPOP',
      image: 'assets/covers/10_cyberpunk.jpg',
      url: 'https://suno.com/s/d5Wc2J4lCiKgQFuz',
      tags: '#般若心経 #HEARTSUTRA'
    },
    {
      number: 11,
      genre: 'Simple',
      title: '般若心経呟',
      image: 'assets/covers/11_simple.jpg',
      url: 'https://suno.com/s/nfJC4YFxiPglZNyx',
      tags: 'jazz, modern classical'
    },
    {
      number: 12,
      genre: 'Anime Song',
      title: '般若心経アニソン',
      image: 'assets/covers/12_animesong.jpg',
      url: 'https://suno.com/s/wTxoEvVYpjzWbbpb',
      tags: '#般若心経 #色即是空空即是色'
    }
  ];

  // --- Shuffle (Fisher-Yates) ---
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // --- Create Gallery Card ---
  function createCard(track) {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.innerHTML = `
      <a href="${track.url}" target="_blank" rel="noopener noreferrer" class="gallery-card-link">
        <div class="gallery-card-image-wrapper">
          <img 
            src="${track.image}" 
            alt="${track.title}" 
            class="gallery-card-image"
            loading="lazy"
          >
          <div class="gallery-card-overlay">
            <div class="gallery-card-number">No. ${String(track.number).padStart(2, '0')}</div>
            <div class="gallery-card-genre">
              <span class="gallery-card-genre-text">${track.genre}</span>
            </div>
            <div class="gallery-card-title">${track.title}</div>
          </div>
        </div>
      </a>
    `;
    return card;
  }

  // --- Create Grid Sizer (for Masonry) ---
  function createGridSizer() {
    const sizer = document.createElement('div');
    sizer.className = 'gallery-grid-sizer';
    return sizer;
  }

  function createGutterSizer() {
    const sizer = document.createElement('div');
    sizer.className = 'gallery-gutter-sizer';
    return sizer;
  }

  // --- Typing Animation for Genre ---
  function setupTypingAnimation() {
    const cards = document.querySelectorAll('.gallery-card');
    cards.forEach(card => {
      const genreEl = card.querySelector('.gallery-card-genre-text');
      if (!genreEl) return;
      const originalText = genreEl.textContent;

      card.addEventListener('mouseenter', () => {
        if (genreEl._typingInterval) {
          clearInterval(genreEl._typingInterval);
        }
        genreEl.textContent = '';
        genreEl.style.transform = 'translateY(0)';
        let i = 0;
        const interval = setInterval(() => {
          if (i < originalText.length) {
            genreEl.textContent += originalText[i];
            i++;
          } else {
            clearInterval(interval);
          }
        }, 50);
        genreEl._typingInterval = interval;
      });

      card.addEventListener('mouseleave', () => {
        if (genreEl._typingInterval) {
          clearInterval(genreEl._typingInterval);
        }
        genreEl.textContent = originalText;
      });
    });
  }

  // --- Staggered Card Reveal ---
  function revealCards() {
    const cards = document.querySelectorAll('.gallery-card');
    let revealIndex = 0;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const card = entry.target;
          setTimeout(() => {
            card.classList.add('is-visible');
          }, revealIndex * 120);
          revealIndex++;
          observer.unobserve(card);
        }
      });
    }, {
      threshold: 0.05,
      rootMargin: '0px 0px -30px 0px'
    });

    cards.forEach(card => observer.observe(card));
  }

  // --- Reveal About Section Elements ---
  function revealAboutSection() {
    const elements = document.querySelectorAll('.about-section .section-header, .about-content, .about-sutra');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    elements.forEach(el => {
      el.classList.add('reveal-element');
      observer.observe(el);
    });
  }

  // --- Cursor Glow ---
  function initCursorGlow() {
    const glow = document.querySelector('.cursor-glow');
    if (!glow) return;

    if (window.matchMedia('(pointer: fine)').matches) {
      document.addEventListener('mousemove', (e) => {
        requestAnimationFrame(() => {
          glow.style.transform = `translate(${e.clientX - 200}px, ${e.clientY - 200}px)`;
        });
      });
    } else {
      glow.style.display = 'none';
    }
  }

  // --- Smooth Scroll (CSS-based, lightweight alternative to Locomotive) ---
  function initSmoothScroll() {
    // Use CSS smooth scrolling + custom scrollbar styling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Parallax effect on scroll
    const heroElements = document.querySelectorAll('[data-scroll-speed]');
    
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      
      heroElements.forEach(el => {
        const speed = parseFloat(el.getAttribute('data-scroll-speed')) || 0;
        const yPos = -(scrollY * speed * 0.1);
        el.style.transform = `translateY(${yPos}px)`;
      });
    }, { passive: true });
  }

  // --- Loading Screen ---
  function initLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingBar = document.getElementById('loading-bar');
    let progress = 0;

    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      loadingBar.style.width = progress + '%';
    }, 150);

    return new Promise((resolve) => {
      const minTime = new Promise(r => setTimeout(r, 2200));

      const imagesReady = new Promise((imgResolve) => {
        const grid = document.getElementById('gallery-grid');
        if (typeof imagesLoaded !== 'undefined') {
          imagesLoaded(grid, () => imgResolve());
        } else {
          setTimeout(imgResolve, 1500);
        }
      });

      Promise.all([minTime, imagesReady]).then(() => {
        loadingBar.style.width = '100%';
        setTimeout(() => {
          loadingScreen.classList.add('is-hidden');
          resolve();
        }, 500);
      });
    });
  }

  // --- Initialize Masonry ---
  function initMasonry() {
    const grid = document.getElementById('gallery-grid');
    if (typeof Masonry === 'undefined' || typeof imagesLoaded === 'undefined') {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      imagesLoaded(grid, () => {
        const msnry = new Masonry(grid, {
          itemSelector: '.gallery-card',
          columnWidth: '.gallery-grid-sizer',
          gutter: '.gallery-gutter-sizer',
          percentPosition: true,
          transitionDuration: '0.4s'
        });
        resolve(msnry);
      });
    });
  }

  // --- Main Init ---
  async function init() {
    // 1. Build gallery with shuffled tracks
    const grid = document.getElementById('gallery-grid');
    
    // Add sizer elements for Masonry
    grid.appendChild(createGridSizer());
    grid.appendChild(createGutterSizer());

    const shuffledTracks = shuffle(tracks);
    shuffledTracks.forEach(track => {
      const card = createCard(track);
      grid.appendChild(card);
    });

    // 2. Setup typing animation
    setupTypingAnimation();

    // 3. Init cursor glow
    initCursorGlow();

    // 4. Init Masonry
    const msnry = await initMasonry();

    // 5. Loading screen
    await initLoading();

    // 6. Reveal cards with stagger
    revealCards();

    // 7. Reveal about section
    revealAboutSection();

    // 8. Init smooth scroll (lightweight parallax)
    initSmoothScroll();

    // 9. Handle resize
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (msnry) msnry.layout();
      }, 250);
    });
  }

  // --- DOM Ready ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
