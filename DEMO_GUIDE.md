# Prophecy AI — Demo & Presentation Guide

> **Purpose**: Step-by-step walkthrough to present this project to your teacher.  
> **Time estimate**: 15–20 minutes for a full demo.

---

## 🎯 One-Liner Pitch

> "Prophecy AI is an AI-powered real estate platform where customers can search for properties using plain English instead of filling out search forms — the AI understands their intent and finds matching listings."

---

## 📋 Pre-Demo Checklist

Before you start presenting, make sure:

- [ ] The dev server is running (`npm run dev`)
- [ ] Browser is open at `http://localhost:3000`
- [ ] You have the `SECRET_KEY` value from `.env.local` ready (needed for admin registration)
- [ ] Internet is connected (Groq AI calls need it)

---

## 🗂️ Presentation Flow (7 Acts)

### Act 1: Admin Registration & Authentication (2 min)

**What to show**: The app uses role-based authentication with JWT sessions.

1. Open `http://localhost:3000` → you'll be redirected to `/login`
2. Click **"Register as admin"** link at the bottom
3. Fill in the registration form:
   - **Full name**: `Admin User`
   - **Email**: `admin@prophecy.com`
   - **Password**: `admin1234`
   - **Secret key**: paste the `SECRET_KEY` value from your `.env.local` file
4. Click **"Create admin & sign in"**
5. You'll be redirected to the **Admin Dashboard**

**Talking points**:
- "The secret key prevents unauthorized people from creating admin accounts"
- "We use JWT tokens stored in HTTP-only cookies for session management"
- "Passwords are hashed with bcrypt before storing in the database"

---

### Act 2: Admin Dashboard Overview (2 min)

**What to show**: The admin sees a real-time operational overview.

1. Point out the **stat cards**: Total properties, Customers, Agents, Inventory value (PKR)
2. Show the **Listings by Status** bar chart (Available / Sold / Rented)
3. Show the **User Mix** donut chart (Customers / Agents / Admins)
4. Show the **mini stats** at the bottom: Locations, Categories, AI smart searches

**Talking points**:
- "All numbers are pulled live from the database using aggregate SQL queries"
- "The dashboard gives the admin a bird's-eye view of the entire platform"

---

### Act 3: Setting Up Data — Locations, Categories, Users (3 min)

**What to show**: Full CRUD operations and relational data management.

#### 3a. Create Locations
1. Click **"Locations"** in the sidebar
2. Add 2–3 locations:
   - City: `Karachi`, Area: `DHA Phase 6`, Zip: `75500`
   - City: `Lahore`, Area: `Gulberg`, Zip: `54000`
   - City: `Islamabad`, Area: `F-7`, Zip: `44000`

#### 3b. Create Categories
1. Click **"Categories"** in the sidebar
2. Add 2–3 categories:
   - Name: `Residential`, Type: `House`
   - Name: `Residential`, Type: `Apartment`
   - Name: `Commercial`, Type: `Office`

#### 3c. Create Users (Agent + Customer)
1. Click **"Users"** in the sidebar
2. Create an **Agent**:
   - Name: `Ali Khan`, Email: `ali@prophecy.com`, Password: `agent1234`, Role: `AGENT`
3. Create a **Customer**:
   - Name: `Sara Ahmed`, Email: `sara@prophecy.com`, Password: `customer1234`, Role: `CUSTOMER`

**Talking points**:
- "Only admins can create user accounts — this is the access control layer"
- "Locations and Categories are normalized tables — they avoid data duplication"
- "You can edit or delete any record inline"

---

### Act 4: Adding Properties (2 min)

**What to show**: Property listing creation with foreign key validation.

1. Click **"Properties"** in the sidebar
2. Click or scroll to the **Add Property** form
3. Create 2–3 properties:
   - **Property 1**: Title: `3-Bed Villa in DHA`, Price: `25000000`, Description: `Spacious 3-bedroom villa with garden, parking, and modern kitchen in DHA Phase 6`, Agent: select `Ali Khan`, Location: `Karachi - DHA Phase 6`, Category: `Residential - House`
   - **Property 2**: Title: `2-Bed Apartment Gulberg`, Price: `12000000`, Description: `Modern 2-bedroom apartment with balcony view in the heart of Gulberg, Lahore`, Agent: select `Ali Khan`, Location: `Lahore - Gulberg`, Category: `Residential - Apartment`
   - **Property 3**: Title: `Office Space F-7`, Price: `8000000`, Description: `Prime commercial office space in F-7 Islamabad, 1200 sq ft with parking`, Agent: select `Ali Khan`, Location: `Islamabad - F-7`, Category: `Commercial - Office`

**Talking points**:
- "The system validates that the agent exists and the location/category IDs are real — all inside a database transaction"
- "Prices are in PKR (Pakistani Rupees) and stored as precise Decimal values"
- "If an n8n webhook is configured, creating a property can trigger external automations"

---

### Act 5: Customer Portal — The AI Experience ⭐ (5 min)

> **This is the star of the demo. Spend the most time here.**

1. **Sign out** from the admin account (bottom of sidebar)
2. **Log in** as the customer: `sara@prophecy.com` / `customer1234`
3. You'll land on the **Customer Portal**

#### 5a. AI Natural Language Search (the main AI feature)
1. Click **"AI search"** in the navigation bar
2. Type a natural query, for example:
   > `I'm looking for a house in Karachi under 30 million`
3. Click **"Search with AI"**
4. Show the results:
   - The **extracted filters** are displayed (City: Karachi, Max: PKR 30M)
   - Matching properties appear as cards
5. Try another query:
   > `Show me apartments in Lahore`
6. Try a query that won't match:
   > `5-bedroom penthouse in Peshawar under 2 million`
   - Show how the system handles zero results gracefully

**Talking points**:
- "The user types in natural language — no dropdowns, no forms"
- "Behind the scenes, we send this text to the Groq LLM (LLaMA 3.3 70B model)"
- "The AI returns structured JSON with fields like city, maxPrice, and minBedrooms"
- "We then use those filters to query our PostgreSQL database via Prisma ORM"
- "If the bedroom filter gives zero results, the system automatically relaxes it and tries again"
- "Every AI search is logged in the AiLog table for auditing"

#### 5b. Browse All Listings
1. Click **"All listings"**
2. Show the property cards with prices in PKR

#### 5c. AI Property Summarization (second AI feature)
1. On any property card, click **"Summarise with AI"**
2. Show the 3-bullet summary that appears:
   - ✅ **Key feature** — what stands out
   - 💰 **Value assessment** — price-grounded analysis
   - 📍 **Location perk** — neighborhood advantage

**Talking points**:
- "This is the second AI use case — the LLM reads the full property description and generates a concise buyer-focused summary"
- "The server post-processes the value assessment to ensure it mentions the actual listing price — no vague 'affordable' claims"

#### 5d. Book a Viewing
1. On a property card, scroll to **"Book viewing"**
2. Pick a date/time and click **"Request appointment"**
3. Show the confirmation message

#### 5e. Leave a Review
1. On a property, click **"Load reviews"**
2. Write a review: select a rating (e.g., 4 stars), add a comment
3. Submit → show it appears in the review list

---

### Act 6: Back to Admin — Verify AI Logs & Transactions (2 min)

1. **Sign out** from customer account
2. **Log in** as admin: `admin@prophecy.com` / `admin1234`

#### 6a. Check AI Logs
1. Click **"AI logs"** in the sidebar
2. Show the logged entries: each row has:
   - The **original query** the customer typed
   - The **extracted JSON filters** the AI produced
   - The **user** who searched
   - The **timestamp**

**Talking points**:
- "This is the AI audit trail — the admin can see exactly what the AI understood from each query"
- "This is valuable for debugging, improving prompts, and understanding user behavior"

#### 6b. Record a Transaction (Sale)
1. Click **"Transactions"** in the sidebar
2. Select a property, enter the customer's email (`sara@prophecy.com`)
3. Click **"Record transaction"**
4. Show the property status changes to **SOLD**

#### 6c. Check Dashboard Updates
1. Go back to **Dashboard**
2. Show that the stats have updated: property counts, user counts, sold status

---

### Act 7: Database & Architecture (1 min — optional for technical Q&A)

If your teacher asks about the database:

1. Show `prisma/schema.prisma` — 8 tables with relationships
2. Show `QUERIES.txt` — the SQL reference
3. Mention the tech stack:
   - **Frontend**: Next.js 16 + React 19 + TailwindCSS
   - **Backend**: Next.js API Routes
   - **Database**: Supabase (PostgreSQL) with Prisma ORM
   - **AI Provider**: Groq API (LLaMA 3.3 70B)
   - **Auth**: JWT with HTTP-only cookies (jose library)

---

## 🧠 Common Questions Your Teacher Might Ask

| Question | Answer |
|----------|--------|
| **Why Groq and not OpenAI/Gemini?** | Groq offers a free tier with low-latency inference. The architecture is provider-agnostic — switching to OpenAI only requires changing the API URL and key. |
| **How does the AI search work technically?** | We send the user's text + a strict JSON schema in the system prompt to the LLM. It returns structured JSON (city, maxPrice, minBedrooms). We validate and use those as Prisma query filters. |
| **Is the AI output reliable?** | We use temperature 0.1 for deterministic output, enforce JSON mode, and validate the response server-side. If parsing fails, the user gets a clear error — not garbage data. |
| **How do you handle rate limiting?** | Groq 429 responses are caught and forwarded to the user with a retry-after timer. |
| **What about SQL injection?** | Prisma uses parameterized queries (`$queryRaw` with tagged templates), so user input is never concatenated into SQL strings. |
| **What's the AiLog table for?** | Audit trail — stores every AI query and what the model extracted, linked to the user. Useful for debugging, analytics, and compliance. |
| **How are passwords stored?** | Hashed with bcrypt before storage. The raw password is never saved. |
| **What's the n8n webhook?** | Optional automation — when a property is created, it can trigger an external workflow (e.g., send an email, post to Slack). |

---

## 🏗️ Database Schema (Quick Reference)

```
User ──────────┐
  │             │
  ├── Property ─┼── Location
  │     │       │
  │     │       └── Category
  │     │
  │     ├── Appointment (Customer ↔ Property)
  │     ├── Transaction  (Buyer ↔ Property)
  │     └── Review       (Customer ↔ Property)
  │
  └── AiLog (AI search audit trail)
```

**8 tables total**: User, Property, Location, Category, Appointment, Transaction, Review, AiLog

---

## ⚡ Quick Reference: Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@prophecy.com` | `admin1234` |
| Agent | `ali@prophecy.com` | `agent1234` |
| Customer | `sara@prophecy.com` | `customer1234` |

> **Note**: Create these users during the demo (Act 1 & Act 3). They don't exist yet.

---

## 💡 Pro Tips for the Presentation

1. **Start with the customer AI search** if your teacher is impatient — it's the most impressive feature
2. **Have a backup query ready** in case the Groq API is slow or rate-limited
3. **Show the AI logs after the search** — it proves the AI isn't a black box
4. **Keep the terminal visible** so you can show server logs if anything goes wrong
5. **Mention PKR** — it shows the app is localized for the Pakistani market
