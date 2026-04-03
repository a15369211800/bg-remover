require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const axios   = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

const {
    PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET,
    PAYPAL_ENV,
    PORT = 4000
} = process.env;

const PAYPAL_BASE = PAYPAL_ENV === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

// ── Pricing config ────────────────────────────────────────────────────────────
const PLANS = {
    pack_1:         { type: 'onetime', amount: '0.59', credits: 1,   desc: 'Single Removal' },
    pack_10:        { type: 'onetime', amount: '1.99', credits: 10,  desc: '10 Removals Pack' },
    member_monthly: { type: 'subscription', amount: '7.90',  credits: 100, desc: 'Member Plan',       interval: 'MONTH' },
    super_monthly:  { type: 'subscription', amount: '19.90', credits: 300, desc: 'Super Member Plan', interval: 'MONTH' },
};

// ── PayPal access token ───────────────────────────────────────────────────────
async function getAccessToken() {
    const res = await axios.post(
        `${PAYPAL_BASE}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            auth: { username: PAYPAL_CLIENT_ID, password: PAYPAL_CLIENT_SECRET }
        }
    );
    return res.data.access_token;
}

// ── One-time: create order ────────────────────────────────────────────────────
app.post('/api/orders/create', async (req, res) => {
    const { plan } = req.body;
    const p = PLANS[plan];
    if (!p || p.type !== 'onetime') return res.status(400).json({ error: 'Invalid plan' });

    try {
        const token = await getAccessToken();
        const order = await axios.post(
            `${PAYPAL_BASE}/v2/checkout/orders`,
            {
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: { currency_code: 'USD', value: p.amount },
                    description: p.desc
                }]
            },
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        res.json({ id: order.data.id });
    } catch (e) {
        console.error(e.response?.data || e.message);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// ── One-time: capture order ───────────────────────────────────────────────────
app.post('/api/orders/capture', async (req, res) => {
    const { orderID, plan } = req.body;
    const p = PLANS[plan];
    if (!p) return res.status(400).json({ error: 'Invalid plan' });

    try {
        const token = await getAccessToken();
        const capture = await axios.post(
            `${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`,
            {},
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        if (capture.data.status === 'COMPLETED') {
            res.json({ success: true, credits: p.credits, plan });
        } else {
            res.status(400).json({ error: 'Payment not completed' });
        }
    } catch (e) {
        console.error(e.response?.data || e.message);
        res.status(500).json({ error: 'Failed to capture order' });
    }
});

// ── Subscription: create product + plan + subscription ───────────────────────
app.post('/api/subscriptions/create', async (req, res) => {
    const { plan } = req.body;
    const p = PLANS[plan];
    if (!p || p.type !== 'subscription') return res.status(400).json({ error: 'Invalid plan' });

    try {
        const token = await getAccessToken();
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

        // 1. Create product
        const product = await axios.post(`${PAYPAL_BASE}/v1/catalogs/products`, {
            name: p.desc,
            type: 'SERVICE',
            category: 'SOFTWARE'
        }, { headers });

        // 2. Create billing plan
        const billingPlan = await axios.post(`${PAYPAL_BASE}/v1/billing/plans`, {
            product_id: product.data.id,
            name: p.desc,
            billing_cycles: [{
                frequency: { interval_unit: p.interval, interval_count: 1 },
                tenure_type: 'REGULAR',
                sequence: 1,
                total_cycles: 0,
                pricing_scheme: { fixed_price: { value: p.amount, currency_code: 'USD' } }
            }],
            payment_preferences: { auto_bill_outstanding: true }
        }, { headers });

        // 3. Create subscription
        const subscription = await axios.post(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
            plan_id: billingPlan.data.id,
            application_context: {
                return_url: `https://background-remover.website/success?plan=${plan}`,
                cancel_url: 'https://background-remover.website/pricing'
            }
        }, { headers });

        const approveLink = subscription.data.links.find(l => l.rel === 'approve');
        res.json({ approveUrl: approveLink.href, subscriptionId: subscription.data.id });
    } catch (e) {
        console.error(e.response?.data || e.message);
        res.status(500).json({ error: 'Failed to create subscription' });
    }
});

// ── Subscription: activate after approval ────────────────────────────────────
app.post('/api/subscriptions/activate', async (req, res) => {
    const { subscriptionId, plan } = req.body;
    const p = PLANS[plan];
    if (!p) return res.status(400).json({ error: 'Invalid plan' });

    try {
        const token = await getAccessToken();
        const sub = await axios.get(
            `${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (sub.data.status === 'ACTIVE') {
            res.json({ success: true, credits: p.credits, plan, subscriptionId });
        } else {
            res.status(400).json({ error: 'Subscription not active', status: sub.data.status });
        }
    } catch (e) {
        console.error(e.response?.data || e.message);
        res.status(500).json({ error: 'Failed to verify subscription' });
    }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, env: PAYPAL_ENV }));

app.listen(PORT, () => console.log(`BG-Remover server running on port ${PORT} [${PAYPAL_ENV}]`));
