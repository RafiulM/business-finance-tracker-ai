# **Technical Specification: AI-Powered Business Finance Tracker**

Version: 1.0  
Date: October 3, 2025

## **1\. Introduction**

This document outlines the technical specifications for the AI-Powered Business Finance Tracker. The application is designed to provide businesses with a seamless and intelligent way to track their expenses, income, and assets. The core of the application is an AI assistant that allows users to input financial data using natural language, which is then processed and stored. A comprehensive dashboard will provide visualizations and AI-generated insights to help users understand their financial health.

## **2\. Core Features**

### **2.1. AI Assistant for Data Entry**

* **Natural Language Input:** Users can chat with an AI assistant to log transactions and assets. For example: "I just spent $85.50 on marketing materials from VistaPrint" or "Received a payment of $1,200 from Acme Corp for project alpha."  
* **Data Parsing:** The AI (powered by GPT-4o) will parse the user's text to extract key information: transaction type (income/expense), amount, date, category, and vendor/client.  
* **Confirmation Step:** Before committing to the database, the UI will present the parsed data to the user for confirmation or correction.  
* **Asset Tracking:** The assistant will also handle asset registration, such as "Added a new company laptop, a MacBook Pro, valued at $2,500."

### **2.2. Financial Dashboard**

* **At-a-Glance Overview:** A central dashboard will display key financial metrics.  
* **Visualizations:**  
  * Income vs. Expense chart (monthly/quarterly/yearly).  
  * Expense breakdown by category (Pie or Donut chart).  
  * Net Worth and Asset Value trend line.  
  * Cash flow summary.  
* **Recent Activity:** A feed showing the latest transactions and newly added assets.

### **2.3. AI-Generated Insights**

* **Automated Analysis:** The system will periodically analyze the financial data to generate actionable insights.  
* **Insight Examples:** "Your spending on 'Software Subscriptions' has increased by 30% this quarter." or "Cash flow is strong this month, consider moving excess funds to a high-yield savings account."  
* **Dashboard Display:** Insights will be displayed in a dedicated section on the dashboard.

### **2.4. User Authentication and Authorization**

* **Secure Sign-up/Login:** User management will be handled by Better Auth, ensuring secure access.  
* **Data Isolation:** Each user's financial data will be strictly isolated and accessible only to them.

## **3\. User Flow**

1. **Onboarding:**  
   * The user lands on the marketing page and signs up for a new account using Better Auth.  
   * Upon first login, the user is greeted with a welcome message and a brief tutorial on how to use the AI assistant.  
2. **Data Entry via AI Assistant:**  
   * The user navigates to the main interface, which features a prominent chat input.  
   * The user types a financial activity, e.g., "paid $50 for office snacks".  
   * The application sends this text to the backend, which queries the GPT-4o API.  
   * The API returns a structured JSON object.  
   * The UI displays the parsed information (e.g., Amount: $50.00, Type: Expense, Category: Office Supplies) and asks for user confirmation.  
   * Upon confirmation, the data is saved to the Postgres database.  
3. **Viewing the Dashboard:**  
   * The user navigates to the "Dashboard" tab.  
   * The frontend fetches aggregated financial data from the backend.  
   * The dashboard renders charts and metrics, providing a clear view of the business's financial status.  
   * The user can filter views by date range (e.g., Last 30 Days, This Quarter).

## **4\. Tech Stack**

* **Framework:** Next.js 15 (with App Router)  
* **UI Components:** Shadcn/ui  
* **ORM:** Drizzle ORM  
* **Database:** Postgres  
* **Authentication:** Better Auth  
* **AI Model:** GPT-4o (via OpenAI API)  
* **Deployment:** Vercel

## **5\. Database Schema**

The database will be managed using Drizzle ORM with a Postgres database. The schema is designed to be simple yet scalable.

\-- Users table (Managed primarily by Better Auth, but we link to it)  
CREATE TABLE users (  
    id TEXT PRIMARY KEY, \-- Corresponds to Better Auth user ID  
    email VARCHAR(255) UNIQUE,  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT\_TIMESTAMP  
);

\-- Accounts table to represent different financial sources (e.g., checking, credit card)  
CREATE TABLE accounts (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    user\_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
    name VARCHAR(100) NOT NULL,  
    type VARCHAR(50) NOT NULL, \-- e.g., 'Bank Account', 'Credit Card', 'Cash'  
    balance DECIMAL(15, 2\) NOT NULL DEFAULT 0.00,  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT\_TIMESTAMP  
);

\-- Transactions table for all income and expenses  
CREATE TABLE transactions (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    user\_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
    account\_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,  
    type VARCHAR(50) NOT NULL, \-- 'income' or 'expense'  
    amount DECIMAL(15, 2\) NOT NULL,  
    description TEXT,  
    category VARCHAR(100) DEFAULT 'Uncategorized',  
    transaction\_date DATE NOT NULL DEFAULT CURRENT\_DATE,  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT\_TIMESTAMP  
);

\-- Assets table for tracking business assets and investments  
CREATE TABLE assets (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    user\_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
    name VARCHAR(255) NOT NULL,  
    type VARCHAR(100), \-- e.g., 'Equipment', 'Property', 'Investment'  
    initial\_value DECIMAL(15, 2\) NOT NULL,  
    current\_value DECIMAL(15, 2),  
    acquisition\_date DATE NOT NULL,  
    created\_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT\_TIMESTAMP  
);

\-- AI Insights table to store generated tips and observations  
CREATE TABLE insights (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    user\_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
    content TEXT NOT NULL,  
    generated\_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT\_TIMESTAMP,  
    is\_read BOOLEAN DEFAULT FALSE  
);

## **6\. AI Assistant Logic**

The interaction with the GPT-4o API will be a critical component.

### **6.1. API Request Flow**

1. Client-side captures the user's natural language input.  
2. A Next.js API route (/api/ai/parse-transaction) receives the text.  
3. The API route constructs a request to the OpenAI GPT-4o endpoint.  
4. The request includes a carefully crafted **system prompt** to guide the model's response format.

### **6.2. System Prompt Example for GPT-4o**

You are an expert financial assistant. Your task is to extract structured financial data from user text. The user will provide a description of a transaction or an asset. You must return a single JSON object with the extracted information.

\- For transactions, identify the 'type' ('income' or 'expense'), 'amount', 'description', 'category', and 'transaction\_date'.  
\- For assets, identify the 'name', 'type', 'initial\_value', and 'acquisition\_date'.  
\- Today's date is {{current\_date}}. Use this if the user says "today" or does not specify a date.  
\- Infer a likely category from the description. Common expense categories include: 'Office Supplies', 'Marketing', 'Software', 'Travel', 'Meals & Entertainment', 'Utilities', 'Rent', 'Salaries'. Common income categories include: 'Client Payment', 'Sales', 'Refunds'.  
\- If you cannot determine a field, return null for its value.  
\- Do not add any commentary. Only return the JSON object.

Example Transaction Input: "bought a new chair for the office for 250 dollars yesterday"  
Example Transaction Output:  
{  
  "entry\_type": "transaction",  
  "data": {  
    "type": "expense",  
    "amount": 250.00,  
    "description": "new chair for the office",  
    "category": "Office Supplies",  
    "transaction\_date": "{{yesterday\_date}}"  
  }  
}

Example Asset Input: "we just purchased a new delivery van for $35,000 on October 1st"  
Example Asset Output:  
{  
  "entry\_type": "asset",  
  "data": {  
    "name": "new delivery van",  
    "type": "Equipment",  
    "initial\_value": 35000.00,  
    "acquisition\_date": "2025-10-01"  
  }  
}

## **7\. API Endpoints**

The application will expose the following RESTful API endpoints via Next.js API routes.

* POST /api/ai/parse: Takes natural language text and returns structured JSON.  
* GET /api/dashboard-data?range={range}: Fetches all necessary data for the dashboard visualizations.  
* POST /api/transactions: Manually create a transaction.  
* PUT /api/transactions/{id}: Update a transaction.  
* DELETE /api/transactions/{id}: Delete a transaction.  
* GET /api/transactions: List all transactions with pagination.  
* (Similar CRUD endpoints will be created for /api/assets and /api/accounts).