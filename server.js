// ShopMart server — serves the static site and creates Stripe Checkout Sessions.
// Keys live in .env (never exposed to the browser).
import express from "express";
import dotenv from "dotenv";
import Stripe from "stripe";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 4242;
const KEY = process.env.STRIPE_SECRET_KEY;

let stripe = null;
if (KEY && KEY.startsWith("sk_")) {
  stripe = new Stripe(KEY);
} else {
  console.warn("[warn] STRIPE_SECRET_KEY missing/invalid in .env — Stripe checkout disabled, running in demo mode.");
}

// Allow the site to call the API even when served from another local dev port
app.use("/api", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.static(__dirname, { index: "index.html" }));
// The cart lives in localStorage and is POSTed to us, so no JSON body parser
// is needed on this route — Stripe sends redirect-based checkout.

const PRICE_CURRENCY = "usd";

app.post("/api/create-checkout-session", express.json(), async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: "Stripe not configured. Add STRIPE_SECRET_KEY to .env and restart the server." });
  }
  try {
    const { items, email } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty." });
    }
    // Never trust prices from the browser — look them up server-side? In this
    // demo the catalog itself comes from fakestoreapi, so we validate shape
    // and clamp quantities instead of trusting arbitrary amounts blindly.
    const line_items = items
      .filter(i => Number.isFinite(i.price) && i.price >= 0 && Number.isFinite(i.qty) && i.qty > 0)
      .slice(0, 100) // Stripe allows max 100 line items
      .map(i => ({
        quantity: Math.min(Math.floor(i.qty), 99),
        price_data: {
          currency: PRICE_CURRENCY,
          unit_amount: Math.round(i.price * 100),
          product_data: {
            name: String(i.name || "Product").slice(0, 120),
            ...(i.image ? { images: [String(i.image).slice(0, 500)] } : {})
          }
        }
      }));

    if (line_items.length === 0) {
      return res.status(400).json({ error: "No valid items in cart." });
    }

    const origin = req.headers.origin || `http://localhost:${PORT}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      ...(email ? { customer_email: String(email).slice(0, 254) } : {}),
      metadata: { source: "shopmart-demo" },
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart.html`
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("[stripe] error creating checkout session:", err.message);
    res.status(500).json({ error: "Could not create checkout session." });
  }
});

app.listen(PORT, () => {
  console.log(`ShopMart running at http://localhost:${PORT}`);
  console.log(stripe ? "Stripe checkout: ENABLED" : "Stripe checkout: DISABLED (demo mode)");
});
