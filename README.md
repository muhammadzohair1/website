# ShopMart

A simple e-commerce demo storefront built with **Express** and **Stripe Checkout**.

## Features

- Product listing, product detail, cart (localStorage-based), and checkout pages
- Stripe Checkout integration for secure payments
- Order success page after completed payment
- Static front end (HTML/CSS/vanilla JS) served by the Express server

## Project Structure

| File | Purpose |
|---|---|
| `server.js` | Express server â€” serves static files and creates Stripe Checkout sessions |
| `index.html` | Home / product listing page |
| `product.html` | Individual product page |
| `cart.html` | Shopping cart page |
| `checkout.html` | Checkout page |
| `success.html` | Post-payment success page |
| `assets/js/app.js` | Front-end logic (cart management, API calls) |
| `docs/styles-legacy.css` | Global styles |

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure your Stripe keys:

   Copy `.env.example` to `.env` and fill in your own keys from
   [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys):

   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   PORT=4242
   ```

3. Start the server:

   ```bash
   npm start
   ```

4. Open [http://localhost:4242](http://localhost:4242) in your browser.

## API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/create-checkout-session` | Receives the cart (JSON body) and returns a Stripe Checkout session URL |

## Notes

- The cart is stored client-side in `localStorage` and sent to the server at checkout time.
- Use Stripe test cards (e.g. `4242 4242 4242 4242`) to complete test purchases.
- Never commit your real `.env` file â€” it is excluded via `.gitignore`.

