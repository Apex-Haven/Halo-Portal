# HALO (Haven's AI Logistic Operator)

A comprehensive system for managing airport transfers and guest logistics during large-scale corporate events.

## 🏗️ Project Structure

```
Halo/
├── halo-engine/          # Backend API (Node.js/Express)
├── halo-portal/          # Frontend Dashboard (React/Vite)
└── docs/                 # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v18.0.0 or higher)
- MongoDB (v5.0 or higher) - Local or MongoDB Atlas
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Halo
   ```

2. **Backend Setup**
   ```bash
   cd halo-engine
   cp env.example .env
   # Edit .env with your configuration
   npm install
   npm run init:admin  # Initialize admin user
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd halo-portal
   cp env.example .env
   # Edit .env with your configuration (add Google Maps API key)
   npm install
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:7070
   - Backend API: http://localhost:7007/api
   - Default Admin: `admin@halo.com` / `admin123`

## 📚 Documentation

### Development
- [Backend README](./halo-engine/README.md) - Backend setup and API documentation
- [Frontend README](./halo-portal/README.md) - Frontend setup guide
- [Security Guide](./halo-engine/SECURITY.md) - Security best practices

### Deployment
- [Deployment Guide](./DEPLOYMENT.md) - Complete deployment guide (Netlify frontend + Render/Fly.io backend)
- [Environment Variables Template](./ENV_VARIABLES_TEMPLATE.md) - Environment variables reference
- [Flight Tracking Guide](./FLIGHT_TRACKING_GUIDE.md) - Flight tracking feature documentation

## 🔧 Environment Variables

### Backend (`halo-engine/.env`)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key (min 32 characters)
- `PORT` - Server port (default: 7007)
- See `halo-engine/env.example` for all variables

### Frontend (`halo-portal/.env`)
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key (required for maps)
- See `halo-portal/env.example` for all variables

## 🛠️ Development

### Running Both Servers
```bash
# Terminal 1 - Backend
cd halo-engine && npm run dev

# Terminal 2 - Frontend
cd halo-portal && npm run dev
```

Or use the convenience scripts:
```bash
./setup-dev.sh    # Install dependencies
./start-halo.sh   # Start both servers
```

## 📝 Features

- ✅ Real-time flight tracking
- ✅ Automated notifications (WhatsApp, SMS, Email)
- ✅ Driver & vendor coordination
- ✅ Live map tracking
- ✅ Hotel recommendations
- ✅ Travel advisory system
- ✅ Role-based access control
- ✅ Audit logging

## 🔐 Security

- JWT authentication
- Rate limiting
- Input validation & sanitization
- Brute force protection
- CORS configuration
- Security audit logging

## 📄 License

MIT

## 👥 Support

For issues and questions, please refer to the documentation in the `docs/` folder.

