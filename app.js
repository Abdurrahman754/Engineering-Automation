/* ===== VIDEO DATA ===== */
// Check if data is available
if (typeof CHANNEL_DATA === 'undefined') {
  console.error("CHANNEL_DATA is missing! Please run update_data.py to generate data.js.");
  window.CHANNEL_DATA = { videos: [], subscribers: 0, totalViews: 0, videoCount: 0 };
}
const VIDEOS = CHANNEL_DATA.videos || [];

/* ===== STATE ===== */
let activeFilter = "all";
let searchQuery = "";
let sortMode = "default";
let filteredVideos = [...VIDEOS];

/* ===== HELPERS ===== */
function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(".0", "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(0) + "K";
  return n.toString();
}

function formatCounter(n) {
  const s = Math.floor(n).toString();
  if (n >= 1000000) return (n / 1000000).toFixed(2).replace(".00", "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "K";
  return s;
}

function getThumbUrl(videoId, quality = "mqdefault") {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
}

function getMaxViews() {
  return Math.max(...VIDEOS.map(v => v.views));
}

/* ===== RENDER VIDEOS ===== */
function renderVideos() {
  const grid = document.getElementById("videos-grid");
  const noResults = document.getElementById("no-results");
  grid.innerHTML = "";

  let list = [...VIDEOS];

  // Filter by tag
  if (activeFilter !== "all") {
    list = list.filter(v => v.tags.includes(activeFilter));
  }

  // Filter by search
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(v =>
      v.title.toLowerCase().includes(q) ||
      v.tags.some(t => t.includes(q)) ||
      v.description.toLowerCase().includes(q)
    );
  }

  // Sort
  if (sortMode === "views-desc") list.sort((a, b) => b.views - a.views);
  else if (sortMode === "views-asc") list.sort((a, b) => a.views - b.views);
  else if (sortMode === "duration-desc") list.sort((a, b) => b.durationSecs - a.durationSecs);
  else if (sortMode === "duration-asc") list.sort((a, b) => a.durationSecs - b.durationSecs);

  filteredVideos = list;

  if (list.length === 0) {
    noResults.style.display = "block";
    return;
  }
  noResults.style.display = "none";

  const maxV = getMaxViews();
  const sorted = [...VIDEOS].sort((a, b) => b.views - a.views);

  list.forEach((video, idx) => {
    const rankIndex = sorted.findIndex(v => v.id === video.id);
    const barPct = Math.round((video.views / maxV) * 100);
    const isTop3 = rankIndex < 3;

    const card = document.createElement("div");
    card.className = "video-card reveal";
    card.setAttribute("data-id", video.id);
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Watch: ${video.title}`);
    card.style.animationDelay = `${idx * 0.06}s`;

    const tagsHtml = video.tagLabels.map(t =>
      `<span class="tag ${t.cls}">${t.text}</span>`
    ).join("");

    const rankBadge = isTop3
      ? `<div class="video-rank">#${rankIndex + 1} TOP</div>`
      : "";

    card.innerHTML = `
      <div class="video-thumb">
        <img src="${getThumbUrl(video.id)}" alt="${video.title}" loading="lazy"
          onerror="this.src='${getThumbUrl(video.id, 'hqdefault')}'" />
        <div class="video-overlay">
          <div class="play-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M5 3l14 9-14 9V3z"/></svg>
          </div>
        </div>
        <span class="video-duration">${video.duration}</span>
        ${rankBadge}
      </div>
      <div class="video-body">
        <div class="video-tags">${tagsHtml}</div>
        <h3 class="video-title">${video.title}</h3>
        <div class="video-meta">
          <div class="video-views">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            ${video.viewsLabel} views
          </div>
          <span>·</span>
          <span>${video.age}</span>
        </div>
        <div class="views-bar">
          <div class="views-bar-fill" style="width: 0%" data-pct="${barPct}%"></div>
        </div>
      </div>
    `;

    card.addEventListener("click", () => openModal(video));
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") openModal(video); });
    grid.appendChild(card);
  });

  // Animate bars
  setTimeout(() => {
    document.querySelectorAll(".views-bar-fill").forEach(el => {
      el.style.width = el.dataset.pct;
    });
  }, 100);

  // Trigger reveal
  setTimeout(() => {
    document.querySelectorAll(".video-card.reveal").forEach(el => {
      el.classList.add("visible");
    });
  }, 100);
}

/* ===== MODAL ===== */
function openModal(video) {
  const overlay = document.getElementById("modal-overlay");
  const iframe = document.getElementById("modal-iframe");
  const titleEl = document.getElementById("modal-title-text");
  const descEl = document.getElementById("modal-desc");
  const statsEl = document.getElementById("modal-stats");
  const metaEl = document.getElementById("modal-meta");
  const linkEl = document.getElementById("modal-yt-link");

  const srcBase = video.isShort
    ? `https://www.youtube.com/embed/${video.id}`
    : `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`;

  iframe.src = srcBase;
  titleEl.textContent = video.title;
  descEl.textContent = video.description;
  metaEl.innerHTML = video.tagLabels.map(t =>
    `<span class="tag ${t.cls}">${t.text}</span>`
  ).join("");
  statsEl.innerHTML = `
    <div class="modal-stat">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      ${formatNumber(video.views)} views
    </div>
    <div class="modal-stat">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      ${video.duration}
    </div>
    <div class="modal-stat">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
      ${video.age}
    </div>
  `;
  linkEl.href = video.isShort
    ? `https://www.youtube.com/shorts/${video.id}`
    : `https://www.youtube.com/watch?v=${video.id}`;

  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  const iframe = document.getElementById("modal-iframe");
  overlay.classList.remove("open");
  document.body.style.overflow = "";
  setTimeout(() => { iframe.src = ""; }, 300);
}

/* ===== VIEWS CHART ===== */
function renderChart() {
  const chart = document.getElementById("views-chart");
  chart.innerHTML = "";
  const maxV = getMaxViews();
  const sorted = [...VIDEOS].sort((a, b) => b.views - a.views);

  sorted.forEach(video => {
    const pct = Math.round((video.views / maxV) * 100);
    const wrap = document.createElement("div");
    wrap.className = "chart-bar-wrap";
    wrap.title = `${video.title}\n${video.viewsLabel} views`;
    const shortTitle = video.title.split(":")[0].split(" ").slice(0, 3).join(" ");
    wrap.innerHTML = `
      <div class="chart-bar-outer">
        <div class="chart-bar" data-pct="${pct}" data-label="${video.viewsLabel}" style="height:0; min-height:4px;"></div>
      </div>
      <div class="chart-label">${shortTitle}</div>
    `;
    chart.appendChild(wrap);
  });
}

/* ===== COUNTER ANIMATION ===== */
function animateCounter(el, target, duration = 1800) {
  const start = performance.now();
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(target * eased);
    el.textContent = formatCounter(value);
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = formatCounter(target);
  }
  requestAnimationFrame(update);
}

/* ===== INTERSECTION OBSERVER ===== */
function setupObservers() {
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".reveal, .topic-card, .stat-card").forEach(el => {
    revealObs.observe(el);
  });

  // Counters in stats section
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target);
        if (!isNaN(target)) animateCounter(el, target);
        counterObs.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll(".counter").forEach(el => counterObs.observe(el));

  // Hero stats
  const heroObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(document.getElementById("stat-subs"), CHANNEL_DATA.subscribers, 2000);
        animateCounter(document.getElementById("stat-views"), CHANNEL_DATA.totalViews, 2200);
        animateCounter(document.getElementById("stat-vids"), CHANNEL_DATA.videoCount, 1200);
        heroObs.disconnect();
      }
    });
  }, { threshold: 0.5 });
  const heroStats = document.querySelector(".hero-stats");
  if (heroStats) heroObs.observe(heroStats);

  // Stat bars
  const barObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll(".stat-bar-fill").forEach(bar => {
          const fill = getComputedStyle(bar).getPropertyValue("--fill").trim();
          bar.style.width = fill;
        });
        barObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll(".stat-card").forEach(el => barObs.observe(el));

  // Chart bars
  const chartObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll(".chart-bar").forEach(bar => {
          const pct = bar.dataset.pct;
          bar.style.height = `${pct}%`;
        });
        chartObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  const chartEl = document.getElementById("views-chart");
  if (chartEl) chartObs.observe(chartEl);
}

/* ===== NAVBAR ===== */
function setupNavbar() {
  const navbar = document.getElementById("navbar");
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("nav-links");
  const backTop = document.getElementById("back-to-top");

  window.addEventListener("scroll", () => {
    if (window.scrollY > 60) {
      navbar.classList.add("scrolled");
      backTop.classList.add("visible");
    } else {
      navbar.classList.remove("scrolled");
      backTop.classList.remove("visible");
    }

    // Active nav link
    const sections = ["home", "videos", "topics", "stats", "about"];
    let current = "home";
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el && window.scrollY >= el.offsetTop - 120) current = id;
    });
    document.querySelectorAll(".nav-link").forEach(a => {
      a.classList.toggle("active", a.getAttribute("href") === `#${current}`);
    });
  }, { passive: true });

  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("open");
    navLinks.classList.toggle("open");
  });

  // Close mobile nav on link click
  navLinks.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      hamburger.classList.remove("open");
      navLinks.classList.remove("open");
    });
  });

  backTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* ===== FILTERS ===== */
function setupFilters() {
  document.getElementById("filter-tabs").addEventListener("click", e => {
    const tab = e.target.closest(".filter-tab");
    if (!tab) return;
    document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    activeFilter = tab.dataset.filter;
    renderVideos();
  });

  const searchInput = document.getElementById("search-input");
  let debounceTimer;
  searchInput.addEventListener("input", e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = e.target.value;
      renderVideos();
    }, 280);
  });

  document.getElementById("sort-select").addEventListener("change", e => {
    sortMode = e.target.value;
    renderVideos();
  });
}

/* ===== MODAL EVENTS ===== */
function setupModal() {
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-overlay").addEventListener("click", e => {
    if (e.target === document.getElementById("modal-overlay")) closeModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
  });
}

/* ===== SMOOTH SCROLL ===== */
function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const target = document.querySelector(a.getAttribute("href"));
      if (target) {
        e.preventDefault();
        const offset = 80;
        window.scrollTo({ top: target.offsetTop - offset, behavior: "smooth" });
      }
    });
  });
}

/* ===== TOPIC CARDS CLICK (scroll to filtered) ===== */
function setupTopics() {
  const topicMap = {
    "topic-bms": "bms",
    "topic-hvac": "ahu",
    "topic-bacnet": "bacnet",
    "topic-controls": "controls"
  };
  Object.entries(topicMap).forEach(([cardId, filter]) => {
    const card = document.getElementById(cardId);
    if (!card) return;
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      activeFilter = filter;
      document.querySelectorAll(".filter-tab").forEach(t => {
        t.classList.toggle("active", t.dataset.filter === filter);
      });
      renderVideos();
      const vidSection = document.getElementById("videos");
      window.scrollTo({ top: vidSection.offsetTop - 80, behavior: "smooth" });
    });
  });
}

/* ===== POPULATE DATA ===== */
function populateData() {
  try {
    const setTarget = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.dataset.target = val;
    };
    
    setTarget("stat-subs", CHANNEL_DATA.subscribers);
    setTarget("stat-views", CHANNEL_DATA.totalViews);
    setTarget("stat-vids", CHANNEL_DATA.videoCount);
    setTarget("channel-views-stat", CHANNEL_DATA.totalViews);
    setTarget("channel-subs-stat", CHANNEL_DATA.subscribers);
    setTarget("channel-vids-stat", CHANNEL_DATA.videoCount);

    const ctaSubs = document.getElementById("cta-subs-count");
    if (ctaSubs) ctaSubs.textContent = formatNumber(CHANNEL_DATA.subscribers) + "+";
    
    // Alert user if running on file:// protocol
    if (window.location.protocol === 'file:') {
      console.warn("Running via file:// profile. YouTube embeds may be restricted. Use a local server for full functionality.");
    }

    // Initialize Carousel
    initCarousel();
  } catch (e) {
    console.error("Error populating data:", e);
  }
}

/* ===== CAROUSEL LOGIC ===== */
function initCarousel() {
  const track = document.getElementById("carousel-track");
  const dotsContainer = document.getElementById("carousel-indicators");
  const prevBtn = document.getElementById("carousel-prev");
  const nextBtn = document.getElementById("carousel-next");
  
  if (!track) return;

  // Get Top 5 Videos
  const topVideos = [...CHANNEL_DATA.videos]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  track.innerHTML = "";
  dotsContainer.innerHTML = "";

  topVideos.forEach((video, index) => {
    // Create Slide
    const slide = document.createElement("div");
    slide.className = "carousel-slide";
    
    const tagHtml = video.tagLabels.map(t => `<span class="tag ${t.cls}">${t.text}</span>`).join("");
    
    slide.innerHTML = `
      <div class="featured-card">
        <div class="featured-embed">
          <iframe id="featured-iframe-${index}" 
            src="https://www.youtube.com/embed/${video.id}?rel=0&showinfo=0&modestbranding=1&enablejsapi=1&origin=${window.location.origin}" 
            title="${video.title}" frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen></iframe>
        </div>
        <div class="featured-info">
          <div class="featured-meta">${tagHtml}</div>
          <h3 class="featured-title">${video.title}</h3>
          <p class="featured-desc">${video.description.substring(0, 160)}...</p>
          <div class="featured-numbers">
            <div class="feat-stat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span>${video.viewsLabel} Views</span>
            </div>
          </div>
          <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank" class="btn-primary">Watch on YouTube →</a>
        </div>
      </div>
    `;
    track.appendChild(slide);

    // Create Dot
    const dot = document.createElement("div");
    dot.className = index === 0 ? "indicator active" : "indicator";
    dot.addEventListener("click", () => goToSlide(index));
    dotsContainer.appendChild(dot);
  });

  let currentSlide = 0;
  const slides = document.querySelectorAll(".carousel-slide");
  const dots = document.querySelectorAll(".indicator");

  function updateCarousel() {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === currentSlide);
    });
  }

  function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    updateCarousel();
  }

  function prevSlide() {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    updateCarousel();
  }

  function goToSlide(index) {
    currentSlide = index;
    updateCarousel();
  }

  if (nextBtn) nextBtn.addEventListener("click", () => { nextSlide(); resetAutoplay(); });
  if (prevBtn) prevBtn.addEventListener("click", () => { prevSlide(); resetAutoplay(); });

  // Autoplay
  let autoplayInterval = setInterval(nextSlide, 5000);

  function resetAutoplay() {
    clearInterval(autoplayInterval);
    autoplayInterval = setInterval(nextSlide, 5000);
  }

  // Pause on hover
  track.addEventListener("mouseenter", () => clearInterval(autoplayInterval));
  track.addEventListener("mouseleave", () => resetAutoplay());
}

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
  populateData();
  renderVideos();
  renderChart();
  setupNavbar();
  setupFilters();
  setupModal();
  setupSmoothScroll();
  setupTopics();
  setupObservers();

  // Stagger topic card reveals
  document.querySelectorAll(".topic-card").forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.1}s`;
    card.classList.add("reveal");
  });
  document.querySelectorAll(".stat-card").forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.1}s`;
    card.classList.add("reveal");
  });
});
