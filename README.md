# TrulyCollectables

A trading card ecommerce platform with integrated collection management built with Node.js, Express, PostgreSQL, and Bootstrap 5.

## Features

### Public Features
- Browse trading cards and figurines
- Advanced search and filtering
- View detailed card information
- Contact seller about specific cards
- User registration and authentication

### User Features
- Personal collection management (track cards you have and want)
- Collection matcher (find wanted cards in seller inventory)
- Export collection to CSV
- Shopping cart
- Checkout and order placement
- Order history tracking
- Submit inquiries about cards

### Admin Features
- Card inventory management
- Image upload for cards
- Order management and status updates
- Figurine approval system
- Inquiry management

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Frontend**: Bootstrap 5, EJS templates
- **Session**: express-session with PostgreSQL store
- **Authentication**: bcrypt
- **File Upload**: Multer
- **Process Manager**: PM2

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- PM2 (for production deployment)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd trulycollectables
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up PostgreSQL database

```bash
# Create database
createdb trulycollectables

# Create database user
psql -c "CREATE USER trulycollectables_user WITH PASSWORD 'your_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE trulycollectables TO trulycollectables_user;"

# Run schema
psql trulycollectables < database/schema.sql
psql trulycollectables < database/session.sql
```

### 4. Configure environment variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
NODE_ENV=production

DB_HOST=localhost
DB_PORT=5432
DB_NAME=trulycollectables
DB_USER=trulycollectables_user
DB_PASSWORD=your_secure_password

SESSION_SECRET=your_random_secret_key_here

ADMIN_EMAIL=admin@trulycollectables.co.nz
```

### 5. Create uploads directory

```bash
mkdir -p uploads
chmod 755 uploads
```

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Mode

```bash
npm start
```

## Deployment with PM2

### Install PM2 globally

```bash
npm install -g pm2
```

### Start the application

```bash
pm2 start ecosystem.config.js
```

### PM2 Commands

```bash
# View application status
pm2 status

# View logs
pm2 logs trulycollectables

# Restart application
pm2 restart trulycollectables

# Stop application
pm2 stop trulycollectables

# Delete from PM2
pm2 delete trulycollectables

# Save PM2 configuration
pm2 save

# Set PM2 to start on system boot
pm2 startup
```

## Creating the First Admin User

After setting up the database, you need to create an admin user. You can do this by:

1. Register a normal user through the web interface at `/auth/register`
2. Connect to the database and update the user's role:

```sql
psql trulycollectables

UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Project Structure

```
trulycollectables/
├── config/              # Database configuration
├── database/            # SQL schema files
├── middleware/          # Express middleware (authentication, etc.)
├── models/              # Database models
├── routes/              # Route handlers
│   ├── public.js        # Public routes
│   ├── auth.js          # Authentication routes
│   ├── user.js          # User routes
│   └── admin.js         # Admin routes
├── views/               # EJS templates
│   ├── public/          # Public pages
│   ├── user/            # User pages
│   ├── admin/           # Admin pages
│   └── partials/        # Shared components
├── public/              # Static assets
│   ├── css/             # Stylesheets
│   ├── js/              # Client-side JavaScript
│   └── images/          # Static images
├── uploads/             # User-uploaded files
├── logs/                # PM2 logs
├── server.js            # Main application file
├── package.json         # Dependencies
├── ecosystem.config.js  # PM2 configuration
└── README.md            # This file
```

## Color Scheme

- **Background**: White (#FFFFFF)
- **Primary Color**: Cornflower Blue (#6495ED)
- **Text**: Black (#000000)

## Database Schema

The application uses the following main tables:

- **users**: User accounts and authentication
- **cards**: Seller's card inventory
- **figurines**: Seller's figurine inventory
- **user_collections**: User's personal card collections
- **cart**: Shopping cart items
- **orders**: Customer orders
- **order_items**: Items in each order
- **inquiries**: Customer inquiries about cards
- **session**: Session storage

See `database/schema.sql` for the complete schema.

## Security Considerations

1. **Change default passwords**: Update all default passwords in `.env`
2. **Session secret**: Use a strong, random session secret
3. **File uploads**: Only image files are allowed, with a 5MB size limit
4. **SQL injection**: All database queries use parameterized statements
5. **Password hashing**: Passwords are hashed using bcrypt with salt rounds of 10
6. **HTTPS**: In production, use HTTPS (configure via reverse proxy like Nginx)

## Nginx Configuration (Optional)

For production deployment with Nginx:

```nginx
server {
    listen 80;
    server_name trulycollectables.co.nz;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads {
        alias /path/to/trulycollectables/uploads;
        expires 30d;
    }
}
```

## Backup

### Database Backup

```bash
# Create backup
pg_dump trulycollectables > backup_$(date +%Y%m%d).sql

# Restore backup
psql trulycollectables < backup_20240101.sql
```

### File Backup

```bash
# Backup uploaded files
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```

## Troubleshooting

### Database Connection Issues

1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Verify database credentials in `.env`
3. Ensure database user has proper permissions

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### PM2 Issues

```bash
# Clear PM2 processes
pm2 kill

# Restart PM2
pm2 start ecosystem.config.js
```

## Support

For issues or questions, contact: admin@trulycollectables.co.nz

## License

Proprietary - All rights reserved

## Version

1.0.0
