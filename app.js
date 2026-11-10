const ShopMart = (() => {
  const API_URL = "https://fakestoreapi.com/products";
  let PRODUCTS = [];

  async function loadProducts() {
    if (PRODUCTS.length) return PRODUCTS;
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      PRODUCTS = data.map(p => ({
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

  const CART_KEY = "shopmart_cart";
  const money = (n) => `$${n.toFixed(2)}`;

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  }
  function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  function cartCount(cart = getCart()) { return cart.reduce((s, i) => s + i.qty, 0); }
  function updateCartCount() {
    document.querySelectorAll("#cart-count").forEach(el => el.textContent = cartCount());
  }
  function addToCart(id, qty = 1) {
    const cart = getCart();
    const item = cart.find(i => i.id === id);
    if (item) item.qty += qty; else cart.push({ id, qty });
    saveCart(cart);
    updateCartCount();
  }
  function setQty(id, qty) {
    let cart = getCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty = qty;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    saveCart(cart);
  }
  function removeFromCart(id) {
    saveCart(getCart().filter(i => i.id !== id));
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

  function renderProductCard(p) {
    return `<div class="card">
      <a href="product.html?id=${p.id}" class="img"><img src="${p.image}" alt="${p.name}"></a>
      <h3><a href="product.html?id=${p.id}">${p.name}</a></h3>
      <div class="rating">★ ${p.rating} (${p.reviews})</div>
      <div class="muted">${p.category}</div>
      <div class="price">${money(p.price)}</div>
      <button class="btn" data-add="${p.id}">Add to Cart</button>
    </div>`;
  }

  async function initHome() {
    updateCartCount();
    const grid = document.getElementById("product-grid");
    const category = document.getElementById("category-filter");
    const sort = document.getElementById("sort-filter");
    const searchForm = document.getElementById("search-form");
    const searchInput = document.getElementById("search-input");
    if (!grid) return;
    grid.innerHTML = `<div class="panel empty">Loading products...</div>`;
    await loadProducts();
    if (!PRODUCTS.length) { grid.innerHTML = `<div class="panel empty">Failed to load products.</div>`; return; }

    const categories = ["all", ...new Set(PRODUCTS.map(p => p.category))];
    category.innerHTML = categories.map(c => `<option value="${c}">${c === "all" ? "All" : c}</option>`).join("");
    const q = getParam("q") || "";
    searchInput.value = q;

    function render() {
      let list = [...PRODUCTS];
      const term = searchInput.value.trim().toLowerCase();
      if (category.value !== "all") list = list.filter(p => p.category === category.value);
      if (term) list = list.filter(p => (p.name + " " + p.category + " " + p.desc).toLowerCase().includes(term));
      if (sort.value === "price-asc") list.sort((a,b) => a.price - b.price);
      if (sort.value === "price-desc") list.sort((a,b) => b.price - a.price);
      if (sort.value === "rating") list.sort((a,b) => b.rating - a.rating);
      grid.innerHTML = list.length ? list.map(renderProductCard).join("") : `<div class="panel empty">No products found.</div>`;
      grid.querySelectorAll("[data-add]").forEach(btn => btn.addEventListener("click", () => {
        addToCart(Number(btn.dataset.add));
        btn.textContent = "Added!";
        setTimeout(() => btn.textContent = "Add to Cart", 800);
      }));
    }

    category.addEventListener("change", render);
    sort.addEventListener("change", render);
    searchForm.addEventListener("submit", (e) => { e.preventDefault(); render(); });
    render();
  }

  async function initProduct() {
    updateCartCount();
    const el = document.getElementById("product-detail");
    const id = Number(getParam("id"));
    if (!el) return;
    el.innerHTML = `<div class="panel empty">Loading product...</div>`;
    await loadProducts();
    const p = PRODUCTS.find(x => x.id === id);
    if (!p) { el.innerHTML = `<div class="panel empty">Product not found. <a href="index.html">Back to shop</a></div>`; return; }
    el.innerHTML = `<div class="detail-layout">
      <div class="detail-img"><img src="${p.image}" alt="${p.name}"></div>
      <div>
        <h1>${p.name}</h1>
        <div class="rating">★ ${p.rating} (${p.reviews} reviews)</div>
        <p class="muted">Category: ${p.category}</p>
        <p class="price">${money(p.price)}</p>
        <p>${p.desc}</p>
        <div class="cart-actions">
          <label>Qty <input id="qty" class="qty-input" type="number" min="1" value="1" style="width:70px"></label>
          <button id="add-btn" class="btn">Add to Cart</button>
          <a class="btn secondary" href="cart.html">Go to Cart</a>
        </div>
        <p class="muted">Free shipping on orders over $50.</p>
      </div>
    </div>`;
    document.getElementById("add-btn").addEventListener("click", () => {
      const qty = Math.max(1, Number(document.getElementById("qty").value) || 1);
      addToCart(p.id, qty);
      const btn = document.getElementById("add-btn");
      btn.textContent = "Added to Cart";
      setTimeout(() => btn.textContent = "Add to Cart", 900);
    });
  }

  async function initCart() {
    updateCartCount();
    const el = document.getElementById("cart-view");
    if (!el) return;
    el.innerHTML = `<div class="panel empty">Loading cart...</div>`;
    await loadProducts();
    function render() {
      const { items, subtotal, shipping, tax, total } = cartTotals();
      if (!items.length) {
        el.innerHTML = `<div class="panel empty">Your cart is empty. <a href="index.html">Continue shopping</a></div>`;
        return;
      }
      el.innerHTML = `<div class="panel">
        ${items.map(i => `<div class="cart-item">
          <div class="cart-thumb"><img src="${i.product.image}" alt="${i.product.name}"></div>
          <div>
            <h3><a href="product.html?id=${i.product.id}">${i.product.name}</a></h3>
            <div class="muted">${i.product.category}</div>
            <div class="price">${money(i.product.price)}</div>
            <div class="cart-actions">
              <label>Qty <input class="qty-input" data-qty="${i.id}" type="number" min="0" value="${i.qty}" style="width:70px"></label>
              <button class="btn secondary" data-remove="${i.id}">Remove</button>
            </div>
          </div>
          <div><strong>${money(i.product.price * i.qty)}</strong></div>
        </div>`).join("")}
      </div>
      <div class="panel">
        <h2>Order Summary</h2>
        <div class="summary-row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? "FREE" : money(shipping)}</span></div>
        <div class="summary-row"><span>Tax (8%)</span><span>${money(tax)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${money(total)}</span></div>
        <p class="muted">Orders $50+ ship free.</p>
        <a class="btn block" href="checkout.html">Proceed to Checkout</a>
      </div>`;
      el.querySelectorAll("[data-qty]").forEach(input => input.addEventListener("change", () => {
        setQty(Number(input.dataset.qty), Number(input.value));
        updateCartCount();
        render();
      }));
      el.querySelectorAll("[data-remove]").forEach(btn => btn.addEventListener("click", () => {
        removeFromCart(Number(btn.dataset.remove));
        updateCartCount();
        render();
      }));
    }
    render();
  }

  async function initCheckout() {
    updateCartCount();
    const el = document.getElementById("checkout-view");
    if (!el) return;
    el.innerHTML = `<div class="panel empty">Loading checkout...</div>`;
    await loadProducts();
    const { items, subtotal, shipping, tax, total } = cartTotals();
    if (!items.length) {
      el.innerHTML = `<div class="panel empty">Your cart is empty. <a href="index.html">Shop products</a></div>`;
      return;
    }
    el.innerHTML = `<form id="checkout-form" class="panel form">
      <h2>Shipping Information</h2>
      <label>Full Name <input required name="name"></label>
      <label>Email <input required type="email" name="email"></label>
      <label>Address <input required name="address"></label>
      <label>City <input required name="city"></label>
      <label>Payment Method
        <select name="payment"><option>Credit Card</option><option>Debit Card</option><option>Cash on Delivery</option></select>
      </label>
      <button class="btn" type="submit">Place Order</button>
    </form>
    <div class="panel">
      <h2>Order Summary</h2>
      ${items.map(i => `<div class="summary-row"><span>${i.product.name} × ${i.qty}</span><span>${money(i.product.price * i.qty)}</span></div>`).join("")}
      <div class="summary-row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? "FREE" : money(shipping)}</span></div>
      <div class="summary-row"><span>Tax</span><span>${money(tax)}</span></div>
      <div class="summary-row total"><span>Total</span><span>${money(total)}</span></div>
    </div>`;
    document.getElementById("checkout-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      localStorage.removeItem(CART_KEY);
      updateCartCount();
      el.innerHTML = `<div class="panel">
        <h2 class="success">Order placed successfully!</h2>
        <p>Thank you, <strong>${data.name}</strong>. A confirmation will be sent to <strong>${data.email}</strong>.</p>
        <p>Shipping to: ${data.address}, ${data.city}</p>
        <p>Order total: <strong>${money(total)}</strong></p>
        <a class="btn" href="index.html">Continue Shopping</a>
      </div>`;
    });
  }

  return { initHome, initProduct, initCart, initCheckout };
})();
