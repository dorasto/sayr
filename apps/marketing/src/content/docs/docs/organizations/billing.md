---
title: Billing
description: Manage your Sayr Cloud plan, seats, and subscription
sidebar:
   order: 4
---

:::note[Cloud Only]
Billing is only available on Sayr Cloud. Self-hosted Community and Enterprise editions do not use the billing system — all resource limits are unlimited (Community) or license-governed (Enterprise). See [Editions](/docs/self-hosting/editions) for details.
:::

Billing is managed per organization under **Settings > Billing**. Only members with the **Manage billing** permission can access this page.

## Plans

Sayr Cloud offers two plans:

| | Free | Pro |
|---|---|---|
| **Price** | Free | $3 / seat / month |
| **Members** | 5 | Unlimited |
| **Saved views** | 3 | Unlimited |
| **Issue templates** | 3 | Unlimited |
| **Teams** | 1 | Unlimited |
| **Releases** | Not available | Unlimited |

The Free plan is a good starting point for small teams. The Pro plan removes all per-resource limits and adds Releases.

## Seats

The Pro plan is **seat-based** — you pay for the number of seats you purchase, and you control which organization members occupy those seats.

A seat represents a licensed user slot. Members without an assigned seat are still part of the organization but cannot actively participate (their access level is reduced to read-only). You can assign and unassign seats at any time without losing any data.

### Purchasing Seats

When upgrading to Pro or when you need more capacity:

1. Go to **Settings > Billing**
2. Use the **+ / −** controls in the **Seats** section to set the number of seats you want
3. The price preview updates in real time
4. Click **Update seats** to confirm — your subscription is adjusted immediately and prorated

### Assigning Seats to Members

After purchasing seats, you choose which members occupy them:

1. Go to **Settings > Billing**
2. Scroll to the **Seat assignment** table
3. Check the box next to each member you want to assign a seat to
4. Click **Apply changes**

Uncheck a member to unassign their seat (for example, if someone leaves the team and you want to reallocate their slot).

### Seat Limits

You cannot assign more members than you have purchased seats. If all seats are occupied and you try to assign a new member, you'll need to either purchase more seats or unassign an existing one first.

## Usage

The **Usage** section shows your current consumption against each plan limit:

| Resource | What's counted |
|---|---|
| Members | Members with an assigned seat |
| Saved views | Views created under Settings > Views |
| Issue templates | Templates created under Settings > Templates |
| Teams | Teams created (system teams excluded from count) |
| Releases | Releases created in your organization |

Each resource shows a progress bar. Resources at or near their limit are highlighted.

## Upgrading to Pro

1. Go to **Settings > Billing**
2. Click **Upgrade to Pro** (or **View all plans** for a side-by-side comparison)
3. You'll be directed to the Sayr checkout powered by [Polar](https://polar.sh)
4. Complete payment — your organization is upgraded immediately

Your billing cycle starts from the upgrade date. You'll receive an email receipt for each payment.

## Subscription Details

Once subscribed, the **Subscription** section shows:

- Current plan and status (active, trialing, past due)
- Billing period (monthly or annual)
- Next renewal date
- Per-seat pricing and total

### Past Due Subscriptions

If a payment fails, the subscription enters **past due** status. Sayr will retry the payment automatically. During this time your organization continues to function normally. If retries are exhausted, the subscription cancels and the organization reverts to Free plan limits.

Update your payment method via the link in the billing email you receive when a payment fails.

## Order History

Past invoices are listed in the **Order history** section. Each entry shows the date, amount, and status. Click an invoice to view or download it.

## Downgrading to Free

Downgrading is not yet available as a self-service action. Contact Sayr support to request a downgrade. When downgrading:

- The organization moves to the Free plan at the end of the current billing period
- Resources over the Free plan limits become read-only until you reduce them below the limits
