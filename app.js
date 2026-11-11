/* ============================================================
   ShopMart — vanilla ES6 module logic
   Works on GitHub Pages (static) AND with the optional Node
   server (server.js) for real Stripe checkout.
   ============================================================ */
const ShopMart = (() => {
  const API_URL = "https://fakestoreapi.com/products";
  let PRODUCTS = [];

  /* ---------- Catalog + variant generation ---------- */

  // Deterministic pseudo-random from product id so variants are stable
  function hashNum(n) {
    let x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  const PALETTES = [
    { name: "Forest Green", hex: "#5c8547", imgQuery: "green+hoodie" },
    { name: "Midnight Black", hex: "#1f2421", imgQuery: "black+hoodie" },
    { name: "Sand Beige", hex: "#cbb99a", imgQuery: "beige+hoodie" },
    { name: "Slate Blue", hex: "#5b7c99", imgQuery: "blue+hoodie" },
    { name: "Terracotta", hex: "#b8643f", imgQuery: "red+hoodie" }
  ];

  // Give every product 3–5 color variants (stable per id)
  function withVariants(p) {
    const count = 3 + Math.floor(hashNum(p.id) * 3); // 3..5
    const start = Math.floor(hashNum(p.id + 7) * PALETTES.length);
    const variants = Array.from({ length: count }, (_, i) => PALETTES[(start + i) % PALETTES.length]);
    // badge
    const h = hashNum(p.id * 3);
    let badge = null;
    if (p.rating >= 4.5) badge = { text: "Best Seller", cls: "bg-amber-100 text-amber-800" };
    else if (h > 0.75) badge = { text: "New", cls: "bg-moss-100 text-moss-700" };
    else if (h > 0.6) badge = { text: "Limited", cls: "bg-stone-200 text-stone-700" };
    const oldPrice = badge ? Math.round(p.price / 0.78) : null;
    return { ...p, variants, badge, oldPrice };
  }

  async function loadProducts() {
    if (PRODUCTS.length) return PRODUCTS;
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      PRODUCTS = data.map(p => withVariants({
        id: p.id,
        name: p.title,
        category: p.category,
        price: Number(p.price),
        rating: p.rating ? p.rating.rate : 0,
        reviews: p.rating ? p.rating.count : 0,
        image: p.image,
        desc: p.description
      }));
    } catch (e) {
      PRODUCTS = [];
    }
    return PRODUCTS;
  }

  /* ---------- Cart ---------- */
  const CART_KEY = "shopmart_cart";
  const PENDING_KEY = "shopmart_pending_order";
  const money = (n) => `$${n.toFixed(2)}`;

  // Same-origin when hosted (GitHub Pages / Node server). Only fall back to
  // the local server if the page was opened from disk.
  const API_BASE = location.protocol.startsWith("http") ? "" : "http://localhost:4242";

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  }
  function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  function cartCount(cart = getCart()) { return cart.reduce((s, i) => s + i.qty, 0); }
  function updateCartCount() {
    document.querySelectorAll("#cart-count").forEach(el => el.textContent = cartCount());
  }
  function addToCart(id, qty = 1, variant = 0) {
    const cart = getCart();
    const item = cart.find(i => i.id === id && i.variant === variant);
    if (item) item.qty += qty; else cart.push({ id, qty, variant });
    saveCart(cart);
    updateCartCount();
  }
  function setQty(id, qty, variant = 0) {
    let cart = getCart();
    const item = cart.find(i => i.id === id && i.variant === variant);
    if (!item) return;
    item.qty = qty;
    if (item.qty <= 0) cart = cart.filter(i => !(i.id === id && i.variant === variant));
    saveCart(cart);
  }
  function removeFromCart(id, variant = 0) {
    saveCart(getCart().filter(i => !(i.id === id && i.variant === variant)));
  }
  function cartDetails() {
    return getCart().map(i => ({ ...i, product: PRODUCTS.find(p => p.id === i.id) })).filter(i => i.product);
  }
  function cartTotals() {
    const items = cartDetails();
    const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
    const shipping = subtotal > 0 && subtotal < 50 ? 5.99 : 0;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;
    return { subtotal, shipping, tax, total, items };
  }
  function getParam(name) { return new URLSearchParams(location.search).get(name); }

  /* ---------- Shared UI helpers ---------- */

  function stars(rating) {
    const full = Math.round(rating);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  function swatchHTML(p, current, size = "size-6") {
    return p.variants.map((v, i) => `
      <button type="button" role="radio" aria-checked="${i === current}" data-variant="${i}"
        title="${v.name}" aria-label="Color: ${v.name}"
        class="swatch ${size} rounded-full ring-2 ring-offset-2 transition-transform hover:scale-110 ${i === current ? "ring-ink" : "ring-transparent"}"
        style="background:${v.hex}"></button>
    `).join("");
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }

  /* ---------- Product card (with color variants) ---------- */

  function renderProductCard(p) {
    const v0 = p.variants[0];
    return `
    <article class="product-card group relative flex flex-col rounded-3xl bg-white shadow-soft hover:shadow-card transition-all duration-300 hover:-translate-y-1 overflow-hidden" data-id="${p.id}">
      ${p.badge ? `<span class="absolute top-4 left-4 z-10 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${p.badge.cls}">${p.badge.text}</span>` : ""}
      <button class="absolute top-3 right-3 z-10 grid place-items-center size-9 rounded-full bg-white/90 backdrop-blur shadow-soft text-ink/60 hover:text-moss-600 transition" data-add="${p.id}" aria-label="Quick add ${esc(p.name)} to cart">
        <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
      </button>
      <a href="product.html?id=${p.id}" class="block overflow-hidden bg-stone-100 aspect-square" aria-label="View ${esc(p.name)}">
        <img src="${p.image}" alt="${esc(p.name)}" loading="lazy" width="400" height="400"
             class="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105">
      </a>
      <div class="flex flex-col gap-1.5 p-4 sm:p-5 pt-3">
        <div class="flex items-center gap-1.5 text-xs">
          <span class="font-bold" style="color:${v0.hex === '#1f2421' ? '#5c8547' : v0.hex}">★ ${p.rating}</span>
          <span class="text-ink/40">${p.reviews} sold</span>
        </div>
        <h3 class="font-bold leading-snug text-sm sm:text-base line-clamp-2">
          <a href="product.html?id=${p.id}" class="hover:text-moss-600 transition">${esc(p.name)}</a>
        </h3>
        <div class="flex items-center justify-between mt-1">
          <div class="flex items-baseline gap-1.5">
            <span class="text-lg font-extrabold">${money(p.price)}</span>
            ${p.oldPrice ? `<s class="text-xs text-ink/40">${money(p.oldPrice)}</s>` : ""}
          </div>
          <div class="flex items-center gap-1.5" data-swatches role="radiogroup" aria-label="Choose colorway">
            ${swatchHTML(p, 0)}
          </div>
        </div>
        <div class="text-[11px] text-ink/40 mt-0.5" data-variant-name>${v0.name} · ${p.variants.length} colors</div>
      </div>
    </article>`;
  }

  // Delegate swatch clicks inside any container
  function bindSwatches(container, onPick) {
    container.querySelectorAll("[data-swatches]").forEach(group => {
      group.addEventListener("click", (e) => {
        const btn = e.target.closest(".swatch");
        if (!btn) return;
        const card = btn.closest("[data-id], .product-card, #product-detail");
        const pid = Number(card.dataset.id || new URLSearchParams(location.search).get("id"));
        const idx = Number(btn.dataset.variant);
        const p = PRODUCTS.find(x => x.id === pid);
        if (!p) return;
        group.querySelectorAll(".swatch").forEach((b, i) => {
          b.classList.toggle("ring-ink", i === idx);
          b.classList.toggle("ring-transparent", i !== idx);
          b.setAttribute("aria-checked", String(i === idx));
        });
        const nameEl = card.querySelector("[data-variant-name]");
        if (nameEl) nameEl.textContent = `${p.variants[idx].name} · ${p.variants.length} colors`;
        onPick && onPick(p, idx);
      });
    });
  }

  /* ---------- Home ---------- */

  async function initHome() {
    updateCartCount();
    const grid = document.getElementById("product-grid");
    const tabs = document.getElementById("filter-tabs");
    const catGrid = document.getElementById("category-grid");
    const status = document.getElementById("product-status");

    // Navbar scroll effect
    const nav = document.getElementById("nav");
    const logoText = document.getElementById("nav-logo-text");
    const onScroll = () => {
      const dark = window.scrollY > 24;
      nav.classList.toggle("bg-cream/85", dark);
      nav.classList.toggle("backdrop-blur-xl", dark);
      nav.classList.toggle("shadow-soft", dark);
      if (logoText) logoText.classList.toggle("!text-ink", dark);
      nav.querySelectorAll("nav a").forEach(a => {
        a.classList.toggle("text-ink/80", dark);
        a.classList.toggle("hover:text-ink", dark);
        a.classList.toggle("text-white/90", !dark);
        a.classList.toggle("hover:text-white", !dark);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Mobile drawer
    const drawer = document.getElementById("drawer");
    const panel = document.getElementById("drawer-panel");
    const openBtn = document.getElementById("drawer-btn");
    const closeDrawer = () => {
      panel.classList.add("translate-x-full");
      setTimeout(() => drawer.classList.add("hidden"), 300);
      openBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    };
    openBtn?.addEventListener("click", () => {
      drawer.classList.remove("hidden");
      requestAnimationFrame(() => panel.classList.remove("translate-x-full"));
      openBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    });
    document.getElementById("drawer-close")?.addEventListener("click", closeDrawer);
    document.getElementById("drawer-overlay")?.addEventListener("click", closeDrawer);
    drawer?.querySelectorAll(".drawer-link").forEach(a => a.addEventListener("click", closeDrawer));

    // Scroll reveal
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach(el => io.observe(el));

    // Hero swatches
    const heroImage = document.getElementById("hero-image");
    const heroLabel = document.getElementById("hero-swatch-label");
    const heroPrice = document.getElementById("hero-price");
    const heroOld = document.getElementById("hero-old-price");
    const HERO_IMAGES = [
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80",   // green hoodie
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80",
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80", // beige
      "https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?w=800&q=80", // blue
      "https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=800&q=80"     // dark
    ];
    document.getElementById("hero-swatches").innerHTML = PALETTES.slice(0, 5).map((v, i) => `
      <button type="button" role="radio" aria-checked="${i === 0}" data-hero-variant="${i}" title="${v.name}"
        aria-label="Colorway: ${v.name}"
        class="hero-swatch size-7 rounded-full ring-2 ring-offset-2 ring-offset-ink transition-transform hover:scale-110 ${i === 0 ? "ring-moss-300" : "ring-white/30"}"
        style="background:${v.hex}"></button>
    `).join("");
    document.querySelector("[data-hero-add]")?.addEventListener("click", (e) => {
      const btn = e.currentTarget;
      addToCart(1, 1, 0);
      btn.innerHTML = `<svg class="size-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>`;
      setTimeout(() => {
        btn.innerHTML = `<svg class="size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m-3.75 1.5A2.25 2.25 0 0 1 6.75 9h10.5a2.25 2.25 0 0 1 2.25 2.25l-.7 7.5a2.25 2.25 0 0 1-2.243 2.063H7.143a2.25 2.25 0 0 1-2.243-2.062l-.7-7.5Z"/></svg>`;
      }, 1200);
    });
    document.getElementById("hero-swatches").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-hero-variant]");
      if (!btn) return;
      const idx = Number(btn.dataset.heroVariant);
      document.querySelectorAll("[data-hero-variant]").forEach((b, i) => {
        b.classList.toggle("ring-moss-300", i === idx);
        b.classList.toggle("ring-white/30", i !== idx);
        b.setAttribute("aria-checked", String(i === idx));
      });
      heroImage.src = HERO_IMAGES[idx];
      heroLabel.textContent = PALETTES[idx].name;
    });

    // Load products
    status.textContent = "Loading products…";
    grid.innerHTML = "";
    await loadProducts();
    if (!PRODUCTS.length) {
      status.textContent = "Couldn't load products right now — please refresh.";
      return;
    }
    status.textContent = "";

    /* Category tiles */
    const CAT_META = {
      "men's clothing": { label: "T-Shirts", emoji: "👕" },
      "women's clothing": { label: "Hoodies", emoji: "🧥" },
      "jewelery": { label: "Accessories", emoji: "🧢" },
      "electronics": { label: "Tech", emoji: "⌚" }
    };
    const cats = [...new Set(PRODUCTS.map(p => p.category))];
    catGrid.innerHTML = cats.map((c, i) => {
      const meta = CAT_META[c] || { label: c, emoji: "🛒" };
      const count = PRODUCTS.filter(p => p.category === c).length * 5;
      const sample = PRODUCTS.find(p => p.category === c);
      return `
      <a href="#products" data-cat-link="${esc(c)}" class="group relative rounded-3xl bg-white shadow-soft hover:shadow-card transition-all duration-300 hover:-translate-y-1 p-5 flex flex-col">
        <div class="grid place-items-center size-11 rounded-2xl bg-moss-50 text-xl mb-4">${meta.emoji}</div>
        <img src="${sample.image}" alt="" loading="lazy" width="200" height="200" class="mx-auto h-36 w-auto object-contain transition-transform duration-500 group-hover:scale-105">
        <h3 class="mt-5 font-extrabold text-lg">${meta.label}</h3>
        <p class="text-xs text-ink/40 mt-0.5">${count}+ Products</p>
        <span class="mt-3 inline-flex items-center gap-1 text-xs font-bold text-moss-600">Explore Collection
          <svg class="size-3 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12l-7.5 7.5"/></svg>
        </span>
      </a>`;
    }).join("");

    /* Filter tabs */
    const all = [["all", "All"], ...cats.map(c => [c, (CAT_META[c] || { label: c }).label])];
    tabs.innerHTML = all.map(([val, label], i) => `
      <button role="tab" aria-selected="${i === 0}" data-tab="${val}"
        class="tab-btn rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition ${i === 0 ? "bg-ink text-white" : "bg-white text-ink/60 hover:text-ink shadow-soft"}">${label}</button>
    `).join("");

    function render(cat = "all", term = "") {
      let list = PRODUCTS;
      if (cat !== "all") list = list.filter(p => p.category === cat);
      if (term) list = list.filter(p => (p.name + " " + p.category).toLowerCase().includes(term.toLowerCase()));
      grid.innerHTML = list.slice(0, 12).map(renderProductCard).join("") ||
        `<p class="col-span-full text-center text-ink/40 py-10">No products found.</p>`;
      bindSwatches(grid, (p, idx) => {
        // quick visual: swap price emphasis on variant pick (demo)
      });
    }

    tabs.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-tab]");
      if (!btn) return;
      tabs.querySelectorAll("[data-tab]").forEach(b => {
        const on = b === btn;
        b.classList.toggle("bg-ink", on); b.classList.toggle("text-white", on);
        b.classList.toggle("bg-white", !on); b.classList.toggle("text-ink/60", !on);
        b.setAttribute("aria-selected", String(on));
      });
      render(btn.dataset.tab);
    });

    // Category tile click → filter products + scroll
    catGrid.addEventListener("click", (e) => {
      const link = e.target.closest("[data-cat-link]");
      if (!link) return;
      e.preventDefault();
      const val = link.dataset.catLink;
      const tabBtn = tabs.querySelector(`[data-tab="${val}"]`);
      if (tabBtn) tabBtn.click();
      document.getElementById("products").scrollIntoView({ behavior: "smooth" });
    });

    // Quick add
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add]");
      if (!btn) return;
      e.preventDefault();
      addToCart(Number(btn.dataset.add));
      btn.classList.add("text-moss-600");
      btn.innerHTML = `<svg class="size-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>`;
      setTimeout(() => {
        btn.classList.remove("text-moss-600");
        btn.innerHTML = `<svg class="size-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>`;
      }, 1200);
    });

    render();
  }

  /* ---------- Product detail ---------- */

  async function initProduct() {
    updateCartCount();
    const el = document.getElementById("product-detail");
    const id = Number(getParam("id"));
    if (!el) return;
    el.innerHTML = `<p class="text-center text-ink/40 py-16">Loading product…</p>`;
    await loadProducts();
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) {
      el.innerHTML = `<div class="text-center py-16"><p class="text-ink/50">Product not found.</p><a class="btn" href="index.html">Back to shop</a></div>`;
      return;
    }
    let curVariant = 0;
    el.innerHTML = `
    <nav class="text-xs text-ink/40 mb-6" aria-label="Breadcrumb">
      <a href="index.html" class="hover:text-ink">Home</a> <span class="mx-1.5">/</span>
      <a href="index.html#products" class="hover:text-ink">Shop</a> <span class="mx-1.5">/</span> <span class="text-ink/70">${esc(p.name.slice(0, 40))}…</span>
    </nav>
    <div class="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
      <div class="relative">
        ${p.badge ? `<span class="absolute top-4 left-4 z-10 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${p.badge.cls}">${p.badge.text}</span>` : ""}
        <div class="rounded-[2rem] bg-stone-100 p-10 shadow-soft">
          <img id="pdp-img" src="${p.image}" alt="${esc(p.name)}" class="mx-auto max-h-[420px] w-auto object-contain">
        </div>
      </div>
      <div>
        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight">${esc(p.name)}</h1>
        <div class="mt-3 flex items-center gap-2 text-sm">
          <span class="text-amber-500 font-bold">${stars(p.rating)}</span>
          <span class="text-ink/40">${p.rating} · ${p.reviews} reviews</span>
        </div>
        <div class="mt-4 flex items-baseline gap-3">
          <span class="text-4xl font-extrabold" id="pdp-price">${money(p.price)}</span>
          ${p.oldPrice ? `<s class="text-lg text-ink/40">${money(p.oldPrice)}</s><span class="rounded-full bg-moss-100 text-moss-700 text-xs font-bold px-2.5 py-1">Save ${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : ""}
        </div>
        <p class="mt-5 text-ink/60 leading-relaxed">${esc(p.desc)}</p>
        <div class="mt-7">
          <div class="text-xs font-bold uppercase tracking-widest text-ink/50 mb-3">Color — <span id="pdp-variant-name" class="text-ink normal-case tracking-normal">${p.variants[0].name}</span></div>
          <div id="pdp-swatches" class="flex items-center gap-3" role="radiogroup" aria-label="Choose colorway">${swatchHTML(p, 0, "size-8")}</div>
        </div>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          <label class="sr-only" for="qty">Quantity</label>
          <div class="flex items-center rounded-full ring-1 ring-ink/15 overflow-hidden">
            <button type="button" id="qty-minus" class="grid place-items-center size-11 hover:bg-stone-100 transition" aria-label="Decrease quantity">−</button>
            <input id="qty" type="number" min="1" value="1" class="w-12 text-center font-bold bg-transparent" aria-label="Quantity">
            <button type="button" id="qty-plus" class="grid place-items-center size-11 hover:bg-stone-100 transition" aria-label="Increase quantity">+</button>
          </div>
          <button id="add-btn" class="inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-bold text-white hover:bg-moss-700 transition shadow-card">
            Add to Cart
            <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m-3.75 1.5A2.25 2.25 0 0 1 6.75 9h10.5a2.25 2.25 0 0 1 2.25 2.25l-.7 7.5a2.25 2.25 0 0 1-2.243 2.063H7.143a2.25 2.25 0 0 1-2.243-2.062l-.7-7.5Z"/></svg>
          </button>
          <a href="cart.html" class="rounded-full px-6 py-3.5 text-sm font-bold ring-1 ring-ink/15 hover:bg-stone-100 transition">Go to Cart</a>
        </div>
        <div class="mt-8 grid grid-cols-3 gap-4 text-xs text-ink/50 border-t border-ink/10 pt-5">
          <div>🚚 Free shipping $50+</div>
          <div>↩️ 30-day returns</div>
          <div>🔒 Secure checkout</div>
        </div>
      </div>
    </div>`;

    el.querySelector("#pdp-swatches").addEventListener("click", (e) => {
      const btn = e.target.closest(".swatch");
      if (!btn) return;
      curVariant = Number(btn.dataset.variant);
      el.querySelectorAll("#pdp-swatches .swatch").forEach((b, i) => {
        b.classList.toggle("ring-ink", i === curVariant);
        b.classList.toggle("ring-transparent", i !== curVariant);
        b.setAttribute("aria-checked", String(i === curVariant));
      });
      el.querySelector("#pdp-variant-name").textContent = p.variants[curVariant].name;
    });
    const qtyInput = el.querySelector("#qty");
    el.querySelector("#qty-minus").addEventListener("click", () => qtyInput.value = Math.max(1, (Number(qtyInput.value) || 1) - 1));
    el.querySelector("#qty-plus").addEventListener("click", () => qtyInput.value = (Number(qtyInput.value) || 1) + 1);
    el.querySelector("#add-btn").addEventListener("click", () => {
      addToCart(p.id, Math.max(1, Number(qtyInput.value) || 1), curVariant);
      const b = el.querySelector("#add-btn");
      b.textContent = "Added ✓";
      setTimeout(() => { b.innerHTML = `Add to Cart`; }, 1000);
    });
  }

  /* ---------- Cart ---------- */

  async function initCart() {
    updateCartCount();
    const el = document.getElementById("cart-view");
    if (!el) return;
    await loadProducts();
    function render() {
      const { items, subtotal, shipping, tax, total } = cartTotals();
      if (!items.length) {
        el.innerHTML = `<div class="lg:col-span-2 rounded-3xl bg-white shadow-soft p-12 text-center">
          <div class="text-5xl mb-4">🛒</div>
          <h2 class="text-xl font-extrabold">Your cart is empty</h2>
          <p class="text-ink/50 mt-2 mb-6 text-sm">Add some premium essentials to get started.</p>
          <a href="index.html#products" class="inline-flex rounded-full bg-ink px-6 py-3 text-sm font-bold text-white hover:bg-moss-700 transition">Continue Shopping</a>
        </div>`;
        return;
      }
      el.innerHTML = `
      <div class="rounded-3xl bg-white shadow-soft divide-y divide-ink/5">
        ${items.map(i => {
        const v = i.product.variants[i.variant || 0] || i.product.variants[0];
        return `
          <div class="cart-item p-4 sm:p-6 flex gap-4 sm:gap-6 items-center" data-id="${i.product.id}" data-variant="${i.variant || 0}">
            <div class="size-20 sm:size-24 shrink-0 rounded-2xl bg-stone-100 grid place-items-center p-2">
              <img src="${i.product.image}" alt="" class="max-h-full max-w-full object-contain">
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="font-bold text-sm sm:text-base line-clamp-1"><a href="product.html?id=${i.product.id}" class="hover:text-moss-600">${esc(i.product.name)}</a></h3>
              <div class="flex items-center gap-2 mt-1 text-xs text-ink/50">
                <span class="inline-block size-3 rounded-full ring-1 ring-ink/10" style="background:${v.hex}"></span> ${v.name}
              </div>
              <div class="mt-2.5 flex items-center gap-3">
                <div class="flex items-center rounded-full ring-1 ring-ink/15 overflow-hidden text-sm">
                  <button data-dec class="grid place-items-center size-8 hover:bg-stone-100 transition" aria-label="Decrease">−</button>
                  <span class="w-8 text-center font-bold" data-qty>${i.qty}</span>
                  <button data-inc class="grid place-items-center size-8 hover:bg-stone-100 transition" aria-label="Increase">+</button>
                </div>
                <button data-remove class="text-xs font-semibold text-red-400 hover:text-red-600 transition">Remove</button>
              </div>
            </div>
            <div class="font-extrabold text-sm sm:text-base whitespace-nowrap">${money(i.product.price * i.qty)}</div>
          </div>`;
      }).join("")}
      </div>
      <div class="rounded-3xl bg-white shadow-soft p-6 lg:sticky lg:top-24">
        <h2 class="font-extrabold text-lg">Order Summary</h2>
        <div class="mt-4 space-y-2.5 text-sm">
          <div class="flex justify-between"><span class="text-ink/50">Subtotal</span><span class="font-semibold">${money(subtotal)}</span></div>
          <div class="flex justify-between"><span class="text-ink/50">Shipping</span><span class="font-semibold">${shipping === 0 ? '<span class="text-moss-600">FREE</span>' : money(shipping)}</span></div>
          <div class="flex justify-between"><span class="text-ink/50">Tax (8%)</span><span class="font-semibold">${money(tax)}</span></div>
          <div class="flex justify-between border-t border-ink/10 pt-3 mt-3 text-lg"><span class="font-extrabold">Total</span><span class="font-extrabold">${money(total)}</span></div>
        </div>
        <a href="checkout.html" class="mt-6 block rounded-full bg-ink text-center px-6 py-3.5 text-sm font-bold text-white hover:bg-moss-700 transition shadow-card">Proceed to Checkout</a>
        <p class="mt-3 text-center text-xs text-ink/40">🔒 Encrypted & secure payment via Stripe</p>
      </div>`;
      el.querySelectorAll(".cart-item").forEach(row => {
        const id = Number(row.dataset.id), variant = Number(row.dataset.variant);
        const qtyEl = row.querySelector("[data-qty]");
        row.querySelector("[data-inc]")?.addEventListener("click", () => {
          setQty(id, Number(qtyEl.textContent) + 1, variant); updateCartCount(); render();
        });
        row.querySelector("[data-dec]")?.addEventListener("click", () => {
          setQty(id, Number(qtyEl.textContent) - 1, variant); updateCartCount(); render();
        });
        row.querySelector("[data-remove]")?.addEventListener("click", () => {
          removeFromCart(id, variant); updateCartCount(); render();
        });
      });
    }
    render();
  }

  /* ---------- Checkout ---------- */

  async function initCheckout() {
    updateCartCount();
    const el = document.getElementById("checkout-view");
    if (!el) return;
    await loadProducts();
    const { items, subtotal, shipping, tax, total } = cartTotals();
    if (!items.length) {
      el.innerHTML = `<div class="lg:col-span-2 rounded-3xl bg-white shadow-soft p-12 text-center">
        <div class="text-5xl mb-4">🛒</div>
        <h2 class="text-xl font-extrabold">Your cart is empty</h2>
        <p class="text-ink/50 mt-2 mb-6 text-sm">Add some premium essentials to get started.</p>
        <a href="index.html#products" class="inline-flex rounded-full bg-ink px-6 py-3 text-sm font-bold text-white hover:bg-moss-700 transition">Shop Products</a>
      </div>`;
      return;
    }
    el.innerHTML = `
    <form id="checkout-form" class="rounded-3xl bg-white shadow-soft p-6 sm:p-8 space-y-5" novalidate>
      <h2 class="font-extrabold text-lg">Shipping Information</h2>
      <div class="grid sm:grid-cols-2 gap-4">
        <label class="block"><span class="text-xs font-bold text-ink/60">Full Name</span>
          <input required name="name" class="mt-1.5 w-full rounded-xl ring-1 ring-ink/15 px-4 py-2.5 text-sm focus:ring-2 focus:ring-moss-500 focus:outline-none transition" placeholder="Jane Doe"></label>
        <label class="block"><span class="text-xs font-bold text-ink/60">Email</span>
          <input required type="email" name="email" class="mt-1.5 w-full rounded-xl ring-1 ring-ink/15 px-4 py-2.5 text-sm focus:ring-2 focus:ring-moss-500 focus:outline-none transition" placeholder="jane@example.com"></label>
      </div>
      <label class="block"><span class="text-xs font-bold text-ink/60">Address</span>
        <input required name="address" class="mt-1.5 w-full rounded-xl ring-1 ring-ink/15 px-4 py-2.5 text-sm focus:ring-2 focus:ring-moss-500 focus:outline-none transition" placeholder="123 Green Street"></label>
      <div class="grid sm:grid-cols-2 gap-4">
        <label class="block"><span class="text-xs font-bold text-ink/60">City</span>
          <input required name="city" class="mt-1.5 w-full rounded-xl ring-1 ring-ink/15 px-4 py-2.5 text-sm focus:ring-2 focus:ring-moss-500 focus:outline-none transition" placeholder="Portland"></label>
        <label class="block"><span class="text-xs font-bold text-ink/60">Payment Method</span>
          <select name="payment" class="mt-1.5 w-full rounded-xl ring-1 ring-ink/15 px-4 py-2.5 text-sm focus:ring-2 focus:ring-moss-500 focus:outline-none transition bg-white">
            <option>Credit Card (Stripe)</option>
            <option>Debit Card (Stripe)</option>
            <option>Cash on Delivery</option>
          </select></label>
      </div>
      <div id="stripe-error" class="hidden rounded-xl bg-red-50 ring-1 ring-red-200 text-red-600 text-sm font-semibold px-4 py-3"></div>
      <button type="submit" class="w-full rounded-full bg-ink px-6 py-3.5 text-sm font-bold text-white hover:bg-moss-700 transition shadow-card">Place Order · ${money(total)}</button>
      <p class="text-center text-xs text-ink/40">🔒 Payments processed securely via Stripe</p>
    </form>
    <div class="rounded-3xl bg-white shadow-soft p-6 lg:sticky lg:top-24">
      <h2 class="font-extrabold text-lg">Order Summary</h2>
      <div class="mt-4 space-y-2.5 text-sm">
        ${items.map(i => `<div class="flex justify-between gap-3"><span class="text-ink/60 line-clamp-1">${esc(i.product.name)} × ${i.qty}</span><span class="font-semibold whitespace-nowrap">${money(i.product.price * i.qty)}</span></div>`).join("")}
        <div class="flex justify-between"><span class="text-ink/50">Subtotal</span><span class="font-semibold">${money(subtotal)}</span></div>
        <div class="flex justify-between"><span class="text-ink/50">Shipping</span><span class="font-semibold">${shipping === 0 ? '<span class="text-moss-600">FREE</span>' : money(shipping)}</span></div>
        <div class="flex justify-between"><span class="text-ink/50">Tax</span><span class="font-semibold">${money(tax)}</span></div>
        <div class="flex justify-between border-t border-ink/10 pt-3 mt-3 text-lg"><span class="font-extrabold">Total</span><span class="font-extrabold">${money(total)}</span></div>
      </div>
    </div>`;

    document.getElementById("checkout-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const errEl = document.getElementById("stripe-error");
      errEl.classList.add("hidden");
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const data = Object.fromEntries(new FormData(form).entries());
      const btn = form.querySelector('button[type="submit"]');
      const isStripe = (data.payment || "").includes("Stripe");

      if (isStripe) {
        btn.disabled = true;
        btn.textContent = "Redirecting to Stripe…";
        // GitHub Pages = no backend. Only attempt Stripe when a server exists.
        if (API_BASE === "" && !location.port) {
          btn.disabled = false;
          btn.innerHTML = `Place Order · ${money(total)}`;
          errEl.textContent = "Stripe checkout needs the local server (npm start). On GitHub Pages this demo completes orders without payment.";
          errEl.classList.remove("hidden");
          return;
        }
        try {
          const res = await fetch(`${API_BASE}/api/create-checkout-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: data.email,
              items: items.map(i => ({ name: i.product.name, image: i.product.image, price: i.product.price, qty: i.qty }))
            })
          });
          if (!res.ok) { let msg = "Could not start checkout."; try { msg = (await res.json()).error || msg; } catch { } throw new Error(msg); }
          const { url } = await res.json();
          if (!url) throw new Error("No checkout URL returned.");
          localStorage.setItem(PENDING_KEY, JSON.stringify({ at: Date.now(), total }));
          window.location.href = url;
          return;
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = `Place Order · ${money(total)}`;
          errEl.textContent = err.message;
          errEl.classList.remove("hidden");
          return;
        }
      }

      // Non-Stripe demo flow (works fully static on GitHub Pages)
      localStorage.removeItem(CART_KEY);
      updateCartCount();
      el.innerHTML = `<div class="lg:col-span-2 rounded-3xl bg-white shadow-soft p-10 sm:p-14 text-center">
        <div class="text-5xl mb-4">🎉</div>
        <h2 class="text-2xl font-extrabold text-moss-600">Order placed successfully!</h2>
        <p class="text-ink/60 mt-3">Thank you, <strong>${esc(data.name)}</strong>. A confirmation was sent to <strong>${esc(data.email)}</strong>.</p>
        <p class="text-ink/60 mt-1 text-sm">Shipping to ${esc(data.address)}, ${esc(data.city)} · Order total <strong>${money(total)}</strong></p>
        <a class="mt-8 inline-flex rounded-full bg-ink px-6 py-3 text-sm font-bold text-white hover:bg-moss-700 transition" href="index.html">Continue Shopping</a>
      </div>`;
    });
  }

  /* ---------- Success (Stripe redirect landing) ---------- */

  function initSuccess() {
    updateCartCount();
    const sessionId = new URLSearchParams(location.search).get("session_id");
    let pending = null;
    try { pending = JSON.parse(localStorage.getItem(PENDING_KEY)); } catch { }
    const msg = document.getElementById("success-msg");
    if (!msg) return;
    if (sessionId) {
      localStorage.removeItem(CART_KEY);
      localStorage.removeItem(PENDING_KEY);
      updateCartCount();
      msg.innerHTML = `Your payment was processed securely via Stripe.<br>Order total: <strong>${pending ? money(pending.total) : ""}</strong>`;
    } else {
      msg.textContent = "No recent order found.";
    }
  }

  return { initHome, initProduct, initCart, initCheckout, initSuccess };
})();
