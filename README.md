# Wash Wizard

A laundry management system for UWI hall residents. Students can view machine availability, book time slots, and cancel appointments.

---

## Prerequisites

Make sure you have the following installed before getting started:

- [Node.js](https://nodejs.org/) v20 or higher
- [Git](https://git-scm.com/)
- [npm](https://www.npmjs.com/) (comes with Node.js)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/JustSomeGuy420/wash-wizard-next.git
cd wash-wizard-next
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and update the values if needed. For local development the defaults work out of the box.

### 4. Generate the Prisma client

```bash
npx prisma generate
```

### 5. Create the database and run migrations

```bash
npx prisma db push
```

This creates the SQLite database file at `prisma/wash_wizard.db` and sets up all the tables.

### 6. Seed the database

This creates the 5 laundry machines required for the app to work:

```bash
npm run db:seed
```

### 7. Start the development server

```bash
npm run dev
```

The app will be running at [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run db:generate` | Regenerate the Prisma client after schema changes |
| `npm run db:push` | Push schema changes to the database |
| `npm run db:seed` | Seed the database with initial data |
| `npm run db:studio` | Open Prisma Studio to browse the database |

---

## Project Structure

```
wash-wizard-next/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Database seed script
├── prisma.config.ts         # Prisma CLI configuration
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   └── register/route.ts
│   │   │   ├── appointments/
│   │   │   │   ├── route.ts
│   │   │   │   ├── slots/route.ts
│   │   │   │   └── [id]/cancel/route.ts
│   │   │   └── machines/route.ts
│   │   ├── appointments/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── lib/
│       ├── api.ts            # Client-side fetch helper
│       ├── auth.ts           # JWT and password utilities
│       ├── getCurrentUser.ts # Auth middleware helper
│       └── prisma.ts         # Prisma client singleton
└── .env.example
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create a new account |
| POST | `/api/auth/login` | No | Login and receive a JWT |
| GET | `/api/machines` | No | List all laundry machines |
| GET | `/api/appointments` | Yes | Get your appointments |
| POST | `/api/appointments` | Yes | Book an appointment |
| GET | `/api/appointments/slots` | No | Get today's availability grid |
| DELETE | `/api/appointments/[id]/cancel` | Yes | Cancel an appointment |

---

## Notes

- `.env` is excluded from version control. Never commit it.
- The app uses SQLite for local development. For production, swap the `DATABASE_URL` for a PostgreSQL connection string and update the `provider` in `prisma/schema.prisma` to `postgresql`.
- JWT tokens expire after 24 hours. Users will be redirected to `/login` when their token expires.