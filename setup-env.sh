#!/bin/bash

# Environment Setup Script for Prodeklarant Backend

echo "🔐 Setting up environment variables..."

cd /var/www/prodeklarant/backend

# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)

echo "📝 Generated secure credentials:"
echo "   Database Password: $DB_PASSWORD"
echo "   JWT Secret: $JWT_SECRET"
echo ""

# Create .env file
cat > .env << EOF
DATABASE_URL="postgresql://prodeklarant:${DB_PASSWORD}@localhost:5432/prodeklarant?schema=public"
JWT_SECRET="${JWT_SECRET}"
PORT=3001
NODE_ENV=production
EOF

echo "✅ .env file created successfully!"
echo ""
echo "🔄 Updating PostgreSQL user password..."

# Update PostgreSQL user password
sudo -u postgres psql -c "ALTER USER prodeklarant WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null || \
sudo -u postgres psql -c "CREATE USER prodeklarant WITH PASSWORD '${DB_PASSWORD}';"

echo "✅ Database password updated!"
echo ""
echo "📋 Please save these credentials securely:"
echo "   Database Password: $DB_PASSWORD"
echo "   JWT Secret: $JWT_SECRET"
echo ""
echo "🔄 Restarting backend..."
pm2 restart prodeklarant-backend

echo "✅ Setup complete!"

