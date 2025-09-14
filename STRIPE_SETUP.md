# Stripe Payment Integration Setup Guide

## Overview
This application includes Stripe integration for handling tier upgrades (Free → Pay-per-Design → Premium).

## Environment Variables Required

### Essential Variables
```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key (test or live)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key (must be prefixed with VITE_)

# Stripe Price IDs (from your Stripe Dashboard)
STRIPE_PAY_PER_DESIGN_PRICE_ID=price_... # One-time payment price ID for Pay-per-Design tier
STRIPE_PREMIUM_PRICE_ID=price_... # Recurring subscription price ID for Premium tier

# Optional: For production webhook verification
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook signing secret from Stripe Dashboard
```

## Setup Steps

### 1. Create Stripe Account
1. Sign up at https://stripe.com
2. Navigate to the Dashboard

### 2. Get API Keys
1. Go to Developers → API Keys
2. Copy your publishable and secret keys
3. Use test keys for development, live keys for production

### 3. Create Products and Prices
1. Go to Products in Stripe Dashboard
2. Create two products:
   - **Pay-per-Design**: One-time payment product ($10)
   - **Premium**: Subscription product ($29/month)
3. Copy the price IDs for each product

### 4. Configure Webhook (Production Only)
1. Go to Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret

### 5. Add Environment Variables
1. In Replit, go to Secrets (🔒 icon)
2. Add each environment variable listed above
3. Restart the application

## Demo Mode

If Stripe is not fully configured, the application runs in **demo mode**:
- Checkout sessions return demo session IDs
- Payments are simulated
- User tiers are still updated for testing
- Perfect for development and testing

## Testing the Integration

### Test Upgrade Flow
1. Log in as a user
2. Navigate to any feature that requires upgrade
3. Click "Upgrade" in the modal
4. In demo mode: See success message
5. With Stripe configured: Redirected to Stripe checkout

### Test Card Numbers (Stripe Test Mode)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

## Troubleshooting

### "Payment processing not configured" error
- Ensure `VITE_STRIPE_PUBLISHABLE_KEY` is set
- The key must start with `VITE_` prefix
- Restart the application after adding secrets

### Webhook not working
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check that the endpoint URL is accessible
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:5000/api/stripe-webhook`

### User tier not updating
- Check browser console for errors
- Verify webhook events in Stripe Dashboard
- Check server logs for webhook processing

## Security Notes
- Never commit API keys to version control
- Use test keys for development
- Enable webhook signature verification in production
- Regularly rotate API keys
- Monitor failed payment attempts