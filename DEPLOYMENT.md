# Deployment Guide - Them to Jesus NGO

## 🚀 Recommended Deployment Stack

### Production Setup
- **Hosting**: Vercel (optimal for Next.js)
- **Database**: Supabase PostgreSQL or Railway
- **File Storage**: Supabase Storage (already configured)
- **Real-time**: Ably (already configured)

---

## Option 1: Deploy to Vercel (Recommended)

### Prerequisites
- GitHub account
- Vercel account (free tier works)
- Supabase account
- Ably account

### Step 1: Prepare Repository
```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - Them to Jesus NGO System"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/them-to-jesus-ngo.git
git branch -M main
git push -u origin main
```

### Step 2: Setup Production Database

#### Option A: Supabase (Recommended)
1. Go to https://supabase.com
2. Create new project
3. Wait for database to provision
4. Go to Settings > Database
5. Copy connection string (choose "Session Pooler" for Prisma)
6. Format: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`

#### Option B: Railway
1. Go to https://railway.app
2. Create new project
3. Add PostgreSQL service
4. Copy DATABASE_URL from variables

### Step 3: Deploy to Vercel

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:

**Build Settings:**
- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

**Environment Variables:** (Add all of these)

```env
# Database
DATABASE_URL=your_production_database_url

# NextAuth
NEXTAUTH_SECRET=generate_new_secret_with_openssl_rand_base64_32
NEXTAUTH_URL=https://your-domain.vercel.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# Ably
NEXT_PUBLIC_ABLY_KEY=your_ably_api_key
ABLY_API_KEY=your_ably_api_key
```

5. Click "Deploy"

### Step 4: Run Database Migrations

After first deployment, you need to setup the database:

**Option A: Using Vercel CLI (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link to your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run migration
npx prisma migrate deploy

# Seed database
npx prisma db seed
```

**Option B: Using GitHub Actions**

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy Database

on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - run: npx prisma db seed
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Step 5: Configure Supabase Storage

1. Go to Supabase Dashboard > Storage
2. Create these buckets:
   - `emergency-documents` (public)
   - `post-images` (public)
   - `receipts` (public)
   - `avatars` (public)

3. For each bucket, add policies:

```sql
-- Policy 1: Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bucket-name');

-- Policy 2: Allow public reads
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'bucket-name');

-- Policy 3: Allow authenticated deletes
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bucket-name');
```

### Step 6: Setup Custom Domain (Optional)

1. In Vercel Dashboard > Settings > Domains
2. Add your custom domain (e.g., `app.themtojesus.org`)
3. Configure DNS records as instructed
4. Update `NEXTAUTH_URL` environment variable
5. Redeploy

### Step 7: Verify Deployment

Test these endpoints:
- `https://your-domain.vercel.app/` → Should redirect to login
- `https://your-domain.vercel.app/login` → Login page
- `https://your-domain.vercel.app/api/auth/signin` → NextAuth

Test login with:
- Email: `olivier@themtojesus.org`
- Password: `password123`

---

## Option 2: Deploy to Railway

### Step 1: Create Railway Project

1. Go to https://railway.app
2. Create new project
3. Add PostgreSQL service (automatically provisions)
4. Add service from GitHub repository

### Step 2: Configure Environment Variables

Add all environment variables from `.env.example` in Railway Dashboard

**Important:** Railway provides `DATABASE_URL` automatically

### Step 3: Configure Build

Railway detects Next.js automatically, but verify:

**Build Command:**
```bash
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
```

**Start Command:**
```bash
npm start
```

**Root Directory:** `/`

### Step 4: Deploy

Click "Deploy" - Railway will automatically:
- Install dependencies
- Run migrations
- Build application
- Start server

### Step 5: Get Public URL

Railway provides a URL like: `https://your-app.up.railway.app`

Update `NEXTAUTH_URL` environment variable with this URL

---

## Option 3: Self-Hosted (VPS)

### Prerequisites
- Ubuntu 22.04 server
- Node.js 18+ installed
- PostgreSQL installed
- Nginx installed
- Domain pointed to server

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Nginx
sudo apt install nginx -y

# Install PM2 (process manager)
sudo npm install -g pm2
```

### Step 2: Database Setup

```bash
# Create database
sudo -u postgres createdb themtojesus

# Create user
sudo -u postgres psql
CREATE USER themtojesus_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE themtojesus TO themtojesus_user;
\q
```

### Step 3: Deploy Application

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/yourusername/them-to-jesus-ngo.git
cd them-to-jesus-ngo

# Install dependencies
sudo npm install

# Create .env file
sudo nano .env
# Add all environment variables

# Generate Prisma Client
sudo npx prisma generate

# Run migrations
sudo npx prisma migrate deploy

# Seed database
sudo npx prisma db seed

# Build application
sudo npm run build

# Start with PM2
sudo pm2 start npm --name "themtojesus" -- start
sudo pm2 save
sudo pm2 startup
```

### Step 4: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/themtojesus
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/themtojesus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## Post-Deployment Checklist

### ✅ Security
- [ ] All environment variables are set
- [ ] Production database has strong password
- [ ] SSL/HTTPS is enabled
- [ ] NEXTAUTH_SECRET is unique and secure
- [ ] Supabase RLS policies are configured
- [ ] CORS is properly configured

### ✅ Functionality
- [ ] Login works for all user roles
- [ ] Emergency requests can be created
- [ ] Budget calculations are correct
- [ ] File uploads work
- [ ] Chat messages send/receive
- [ ] Posts can be created

### ✅ Performance
- [ ] Images are optimized
- [ ] Database queries are indexed
- [ ] Caching is enabled
- [ ] CDN is configured (Vercel does this automatically)

### ✅ Monitoring
- [ ] Error logging configured (Vercel provides this)
- [ ] Uptime monitoring setup (use UptimeRobot)
- [ ] Database backups automated
- [ ] Audit logs are being created

---

## Maintenance & Updates

### Regular Updates

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Run any new migrations
npx prisma migrate deploy

# Rebuild application
npm run build

# Restart application
pm2 restart themtojesus  # For PM2
# OR vercel --prod       # For Vercel
```

### Database Backups

#### Automated (Supabase/Railway)
Both platforms provide automatic daily backups.

#### Manual Backup
```bash
pg_dump -U username -h hostname -d themtojesus > backup_$(date +%Y%m%d).sql
```

### Monitoring

**Vercel:** Built-in analytics and error tracking

**Self-hosted:** Install monitoring
```bash
# PM2 Monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
```

---

## Troubleshooting Deployment

### Issue: Database Migration Fails

**Solution:**
```bash
# Reset migrations (development only!)
npx prisma migrate reset

# Force deploy
npx prisma migrate deploy --force
```

### Issue: Environment Variables Not Working

**Solution:**
- Check variable names match exactly
- No quotes around values in Vercel
- Rebuild/redeploy after adding variables

### Issue: File Upload Fails

**Solution:**
- Verify Supabase bucket is public
- Check CORS settings in Supabase
- Verify file size limits

### Issue: Chat Not Working

**Solution:**
- Check Ably API key is correct
- Verify WebSocket is not blocked
- Check browser console for errors

---

## Production Environment Variables

```env
# Database - Use production database URL
DATABASE_URL="postgresql://user:password@host:5432/themtojesus"

# Auth - Generate new secrets for production
NEXTAUTH_SECRET="production_secret_here"
NEXTAUTH_URL="https://your-production-domain.com"

# Supabase - Production project
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-production-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-production-service-key"

# Ably - Production account
NEXT_PUBLIC_ABLY_KEY="your-production-ably-key"
ABLY_API_KEY="your-production-ably-key"
```

---

## Scaling Considerations

### Database
- Supabase free tier: 500MB storage, 2GB transfer
- For growth, upgrade to Pro: $25/month (8GB storage, 100GB transfer)

### File Storage
- Supabase free tier: 1GB storage, 2GB transfer
- For growth, upgrade as needed

### Hosting
- Vercel free tier: Sufficient for small team
- For scaling, upgrade to Pro: $20/month per user

---

## Cost Estimate (Monthly)

**Free Tier Setup:**
- Vercel Hosting: $0
- Supabase (Database + Storage): $0
- Ably (Real-time): $0 (includes 6M messages)
- **Total: $0/month**

**Small Team (Recommended):**
- Vercel Pro: $20
- Supabase Pro: $25
- Ably Pro: $29
- **Total: $74/month**

**Growing Organization:**
- Vercel Enterprise: $Custom
- Supabase Team: $599
- Ably Scale: $Custom
- **Total: ~$650+/month**

---

## Support

For deployment issues:
- Check Vercel/Railway/Supabase documentation
- Review application logs
- Contact: olivier@themtojesus.org

## Next Steps After Deployment

1. ✅ Test all features thoroughly
2. ✅ Train users on the system
3. ✅ Setup monitoring and alerts
4. ✅ Create user documentation
5. ✅ Schedule regular backups verification
6. ✅ Plan for scaling as organization grows

---

**Deployed Successfully?** Time to train your users! Check the USER_GUIDE.md for training materials.
