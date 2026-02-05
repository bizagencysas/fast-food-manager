# FastFood Manager PWA

A comprehensive Progressive Web App (PWA) designed for managing sales, inventory, and finances for a fast-food business. Built with the Modern Web Stack.

## 🚀 Features

- **Point of Sale (POS)**: Agile, touch-friendly interface for recording daily sales.
- **Inventory Management**:
  - Real-time stock tracking.
  - Purchase recording with receipt image uploads (Cloudinary).
  - Low stock alerts.
- **Financial Tracking**:
  - Expense management categorized by type.
  - Partner investment and withdrawal tracking.
  - Bank statement upload and storage.
- **Reporting**:
  - Daily financial summary (Sales vs Expenses).
  - Top-selling products.
  - **WhatsApp Integration**: Share daily reports with one click.
- **Security**:
  - Role-based Authentication via NextAuth.js (Admin/Operator).
  - Secure image storage with Cloudinary.
  - PostgreSQL database via Neon.tech.

## 🛠 Tech Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Neon](https://neon.tech/))
- **ORM**: [Prisma](https://www.prisma.io/)
- **Auth**: [NextAuth.js](https://authjs.dev/) (v5)
- **Storage**: [Cloudinary](https://cloudinary.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## ⚙️ Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd nuevo_proyecto
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory based on `.env.example`:
   ```env
   DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
   AUTH_SECRET="your-secret-key"
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   ```

4. **Initialize Database**:
   Push the schema to your database and seed initial data:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

5. **Run Development Server**:
   ```bash
   npm run dev
   ```

## 📱 PWA Support

This app is configured as a PWA. It includes a `manifest.json` and basic service worker configuration (via Next.js PWA plugins if configured, or standard manifest). It can be installed on mobile devices for a native-like experience.

## 🔐 Default Credentials (Demo)

- **Email**: `admin@demo.com`
- **Password**: `admin`
