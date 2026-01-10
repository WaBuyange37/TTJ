# Them to Jesus - NGO Management System
## Complete Setup Guide

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database
- Supabase account (for file storage)
- Ably account (for real-time chat)

## Step 1: Database Setup

### Create PostgreSQL Database
```bash
# Using psql
createdb themtojesus

# Or via GUI tool like pgAdmin or TablePlus
```

### Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your actual values:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/themtojesus?schema=public"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
NEXT_PUBLIC_ABLY_KEY="your-ably-api-key"
ABLY_API_KEY="your-ably-api-key"
```

## Step 2: Supabase Setup

1. Go to https://supabase.com and create a new project
2. In Storage, create these buckets:
   - `emergency-documents` (public)
   - `post-images` (public)
   - `receipts` (public)
   - `avatars` (public)

### Bucket Policies
For each bucket, set this policy:
```sql
-- Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bucket-name');

-- Allow public reads
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'bucket-name');
```

## Step 3: Ably Setup

1. Go to https://ably.com and create account
2. Create a new app
3. Get your API key from the dashboard
4. Add to .env file

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed initial users
npx prisma db seed
```

### Create Seed File

Create `prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10)

  // Create Founders
  const founder1 = await prisma.user.upsert({
    where: { email: 'founder1@themtojesus.org' },
    update: {},
    create: {
      email: 'founder1@themtojesus.org',
      name: 'Founder One',
      password: hashedPassword,
      role: 'FOUNDER',
      country: 'Germany',
      location: 'Berlin',
    },
  })

  const founder2 = await prisma.user.upsert({
    where: { email: 'founder2@themtojesus.org' },
    update: {},
    create: {
      email: 'founder2@themtojesus.org',
      name: 'Founder Two',
      password: hashedPassword,
      role: 'FOUNDER',
      country: 'Germany',
      location: 'Munich',
    },
  })

  // Create Country Director
  const director = await prisma.user.upsert({
    where: { email: 'olivier@themtojesus.org' },
    update: {},
    create: {
      email: 'olivier@themtojesus.org',
      name: 'Olivier (Country Director)',
      password: hashedPassword,
      role: 'COUNTRY_DIRECTOR',
      country: 'Rwanda',
      location: 'Kigali',
    },
  })

  // Create Social Worker
  const worker = await prisma.user.upsert({
    where: { email: 'nicole@themtojesus.org' },
    update: {},
    create: {
      email: 'nicole@themtojesus.org',
      name: 'Nicole (Social Worker)',
      password: hashedPassword,
      role: 'SOCIAL_WORKER',
      country: 'Rwanda',
      location: 'Muhanga',
    },
  })

  // Create initial chat channels
  const founderDirectorChannel = await prisma.chatChannel.create({
    data: {
      name: 'Founders & Director',
      isGroup: true,
      participants: [founder1.id, founder2.id, director.id],
    },
  })

  const groupChannel = await prisma.chatChannel.create({
    data: {
      name: 'All Team',
      isGroup: true,
      participants: [founder1.id, founder2.id, director.id, worker.id],
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('\nLogin credentials (all passwords: password123):')
  console.log('- Founder 1: founder1@themtojesus.org')
  console.log('- Founder 2: founder2@themtojesus.org')
  console.log('- Director: olivier@themtojesus.org')
  console.log('- Social Worker: nicole@themtojesus.org')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

Add to `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Install ts-node:
```bash
npm install -D ts-node
```

## Step 6: Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Default Login Credentials

All accounts use password: `password123`

- **Founder 1**: founder1@themtojesus.org
- **Founder 2**: founder2@themtojesus.org  
- **Country Director**: olivier@themtojesus.org
- **Social Worker**: nicole@themtojesus.org

## Project Structure

```
them-to-jesus-ngo/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # NextAuth endpoints
│   │   ├── income/       # Income management
│   │   ├── expense/      # Expense management
│   │   ├── emergency/    # Emergency requests
│   │   ├── chat/         # Real-time chat
│   │   └── post/         # News posts
│   ├── dashboard/        # Main dashboard (role-based)
│   ├── founder/          # Founder-specific pages
│   ├── director/         # Director-specific pages
│   ├── worker/           # Social Worker pages
│   ├── login/            # Authentication
│   ├── globals.css       # Global styles
│   └── layout.tsx        # Root layout
├── components/
│   ├── ui/               # Shadcn components
│   ├── dashboard/        # Dashboard components
│   ├── chat/             # Chat components
│   └── forms/            # Form components
├── lib/
│   ├── prisma.ts         # Database client
│   ├── auth.ts           # NextAuth config
│   ├── supabase.ts       # File storage
│   ├── ably.ts           # Real-time messaging
│   └── utils.ts          # Utility functions
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
├── middleware.ts         # Route protection
└── .env                  # Environment variables
```

## Key Features Implementation

### 1. Role-Based Access Control
- Middleware checks user role on every request
- Each role has specific permissions
- UI components adapt based on role

### 2. Emergency Request Workflow
```
Social Worker → Submit Request
      ↓
Country Director → Review (Approve/Reject)
      ↓
Founders → Review (Approve/Reject)
      ↓
Country Director → Complete & Sign
```

### 3. Budget Calculation
```typescript
total_available = sum(income) - sum(expenses) - sum(approved_emergency)
```
Only visible to Founders and Country Director.

### 4. Real-Time Chat
- Uses Ably for WebSocket connections
- Separate channels for different groups
- Message history stored in PostgreSQL

### 5. File Upload
- All files stored in Supabase Storage
- Organized in separate buckets
- Public URLs for easy access

## Security Features

1. **Password Hashing**: bcrypt with salt rounds
2. **JWT Sessions**: Secure token-based auth
3. **Role Validation**: Server-side role checks
4. **Audit Logging**: Track all financial actions
5. **File Upload Limits**: Max 5MB per file
6. **CSRF Protection**: Built into NextAuth

## Mobile Responsive

- Tailwind CSS for responsive design
- Mobile-first approach
- Touch-friendly UI elements
- Optimized for screens 320px+

## Performance Optimizations

1. **Database Indexing**: Key fields indexed
2. **Image Optimization**: Next.js Image component
3. **Code Splitting**: Automatic with App Router
4. **Static Generation**: Where possible
5. **Real-time Caching**: Ably handles connection pooling

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Test connection
psql -U username -d themtojesus
```

### Prisma Migration Errors
```bash
# Reset database (development only!)
npx prisma migrate reset

# Force deploy
npx prisma migrate deploy
```

### Supabase Upload Issues
- Check bucket permissions
- Verify file size < 5MB
- Ensure public access enabled

### Ably Connection Issues
- Verify API key is correct
- Check account limits
- Review browser console for errors

## Production Deployment

### Recommended Platforms
- **Vercel** (easiest, Next.js optimized)
- **Railway** (includes PostgreSQL)
- **DigitalOcean App Platform**

### Environment Variables in Production
Set all .env variables in your hosting platform:
- DATABASE_URL (use production database)
- NEXTAUTH_SECRET (new secret for production)
- NEXTAUTH_URL (your production domain)
- All Supabase and Ably keys

### Database Migration
```bash
npx prisma migrate deploy
```

### Build Command
```bash
npm run build
```

### Start Command
```bash
npm run start
```

## Support & Maintenance

### Backup Strategy
1. Daily PostgreSQL backups
2. Supabase automatic backups
3. Export data monthly

### Monitoring
- Check Ably dashboard for connection stats
- Monitor Supabase storage usage
- Review audit logs weekly

### Updates
- Update dependencies monthly
- Review security advisories
- Test in staging before production

## License
Private - Them to Jesus NGO

## Contact
For technical support, contact: olivier@themtojesus.org
