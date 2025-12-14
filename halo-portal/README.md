# HALO UI - React Dashboard

A beautiful, modern React dashboard for the HALO (Haven's AI Logistic Operator) airport transfer management system.

## 🚀 Features

### ✨ Modern UI/UX
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Dark/Light Mode** - Toggle between themes (coming soon)
- **Smooth Animations** - Framer Motion powered transitions
- **Beautiful Components** - Custom-designed UI components
- **Real-time Updates** - WebSocket integration for live data

### 📊 Dashboard Features
- **Overview Dashboard** - Key metrics and recent transfers
- **Transfer Management** - Complete CRUD operations
- **Vendor Management** - Vendor performance and assignments
- **Flight Tracking** - Real-time flight status monitoring
- **Notification System** - WhatsApp, SMS, and email integration
- **Settings Panel** - Comprehensive system configuration

### 🛠️ Technical Features
- **React 18** with modern hooks and patterns
- **Vite** for fast development and building
- **Tailwind CSS** for utility-first styling
- **Framer Motion** for smooth animations
- **React Router** for navigation
- **Axios** for API communication
- **React Hot Toast** for notifications
- **Lucide React** for beautiful icons

## 📋 Prerequisites

- **Node.js** (v18.0.0 or higher)
- **npm** or **yarn**
- **HALO Backend** running on port 3000

## 🛠️ Installation

### 1. Clone and Install
```bash
# Navigate to the UI directory
cd halo-ui

# Install dependencies
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:7007/api

# WebSocket Configuration
VITE_WS_URL=ws://localhost:7007/ws

# App Configuration
VITE_APP_NAME=HALO Dashboard
VITE_APP_VERSION=1.0.0
```

### 3. Start Development Server
```bash
npm run dev
```

The UI will be available at `http://localhost:70070`

## 🏗️ Project Structure

```
halo-ui/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── Layout.jsx     # Main layout wrapper
│   │   ├── Sidebar.jsx    # Navigation sidebar
│   │   ├── Header.jsx     # Top header with search
│   │   ├── TransferCard.jsx # Transfer display card
│   │   └── StatsCard.jsx  # Statistics display card
│   ├── pages/             # Main application pages
│   │   ├── Dashboard.jsx  # Overview dashboard
│   │   ├── Transfers.jsx  # Transfer management
│   │   ├── Vendors.jsx    # Vendor management
│   │   ├── Flights.jsx    # Flight tracking
│   │   ├── Settings.jsx   # System settings
│   │   └── NotFound.jsx   # 404 page
│   ├── hooks/             # Custom React hooks
│   │   ├── useApi.js      # API communication
│   │   ├── useWebSocket.js # WebSocket connection
│   │   └── useRealTimeUpdates.js # Real-time data
│   ├── services/          # API service layers
│   │   ├── transferService.js
│   │   ├── flightService.js
│   │   ├── notificationService.js
│   │   └── vendorService.js
│   ├── styles/            # CSS and styling
│   │   └── index.css      # Tailwind CSS imports
│   ├── utils/             # Utility functions
│   ├── App.jsx            # Main app component
│   └── main.jsx           # Application entry point
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── README.md              # This file
```

## 🎨 UI Components

### Layout Components
- **Layout** - Main application wrapper with sidebar and header
- **Sidebar** - Navigation menu with active state indicators
- **Header** - Top bar with search, notifications, and user menu

### Data Display Components
- **TransferCard** - Comprehensive transfer information display
- **StatsCard** - Key metrics with icons and trend indicators
- **FlightCard** - Flight status and details (coming soon)

### Form Components
- **Input** - Styled input fields with validation
- **Select** - Dropdown selectors
- **Button** - Various button styles and states
- **Modal** - Overlay dialogs for detailed views

## 📱 Responsive Design

The UI is fully responsive with breakpoints:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Features
- Collapsible sidebar
- Touch-friendly interactions
- Optimized layouts for small screens
- Swipe gestures (coming soon)

## 🔄 Real-time Updates

### WebSocket Integration
- **Connection Management** - Automatic reconnection with exponential backoff
- **Message Handling** - Structured message types for different events
- **Error Recovery** - Graceful handling of connection issues

### Update Types
- **Transfer Updates** - Status changes, driver assignments
- **Flight Status** - Real-time flight information
- **Notifications** - Delivery confirmations
- **System Alerts** - Critical system events

## 🎯 Key Features

### Dashboard
- **Real-time Statistics** - Live transfer counts and status breakdown
- **Recent Activity** - Latest transfers and updates
- **Alert System** - Attention-required items
- **Quick Actions** - Fast access to common tasks

### Transfer Management
- **Advanced Filtering** - Search by multiple criteria
- **Bulk Operations** - Mass actions on transfers
- **Status Tracking** - Visual status indicators
- **Driver Assignment** - Easy driver management
- **Notification History** - Complete audit trail

### Vendor Management
- **Performance Metrics** - Success rates and ratings
- **Contact Information** - Complete vendor details
- **Transfer History** - Past and current assignments
- **Dashboard View** - Vendor-specific overview

### Flight Tracking
- **Real-time Status** - Live flight information
- **Delay Notifications** - Automatic alerts for delays
- **Transfer Correlation** - Link flights to transfers
- **Batch Operations** - Sync multiple flights

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 7070
CMD ["npm", "run", "preview"]
```

## 🔧 Configuration

### Vite Configuration
- **Proxy Setup** - API requests proxied to backend
- **Build Optimization** - Production-ready builds
- **Source Maps** - Debug-friendly development

### Tailwind Configuration
- **Custom Colors** - HALO brand colors
- **Component Classes** - Reusable utility classes
- **Responsive Breakpoints** - Mobile-first design

## 🧪 Testing

### Component Testing
```bash
# Run component tests (when implemented)
npm run test

# Run tests in watch mode
npm run test:watch
```

### E2E Testing
```bash
# Run end-to-end tests (when implemented)
npm run test:e2e
```

## 📊 Performance

### Optimization Features
- **Code Splitting** - Lazy loading of routes
- **Image Optimization** - Optimized asset loading
- **Bundle Analysis** - Build size monitoring
- **Caching** - Efficient data caching strategies

### Metrics
- **First Contentful Paint** < 1.5s
- **Largest Contentful Paint** < 2.5s
- **Cumulative Layout Shift** < 0.1
- **First Input Delay** < 100ms

## 🔒 Security

### Security Features
- **XSS Protection** - Input sanitization
- **CSRF Protection** - Token-based requests
- **Content Security Policy** - Restricted resource loading
- **Authentication** - JWT token management

## 🎨 Customization

### Theming
- **Color Schemes** - Easily customizable brand colors
- **Typography** - Custom font configurations
- **Spacing** - Consistent spacing system
- **Components** - Modular component architecture

### Branding
- **Logo Integration** - Easy logo replacement
- **Color Palette** - Brand-consistent colors
- **Typography** - Custom font choices
- **Icons** - Consistent icon system

## 📞 Support

### Getting Help
- **Documentation** - Comprehensive component docs
- **Examples** - Sample implementations
- **Community** - Developer community support
- **Issues** - GitHub issue tracking

### Common Issues
- **CORS Errors** - Check API proxy configuration
- **WebSocket Issues** - Verify backend WebSocket setup
- **Build Errors** - Check Node.js version compatibility
- **Styling Issues** - Verify Tailwind CSS configuration

## 🚀 Future Enhancements

### Planned Features
- **Dark Mode** - Complete dark theme support
- **Offline Support** - PWA capabilities
- **Mobile App** - React Native companion app
- **Advanced Analytics** - Detailed reporting dashboard
- **Multi-language** - Internationalization support
- **Advanced Filters** - More sophisticated filtering options

### Performance Improvements
- **Virtual Scrolling** - For large data sets
- **Service Workers** - Background sync capabilities
- **Image Lazy Loading** - Optimized image loading
- **Bundle Optimization** - Further size reductions

---

**HALO UI** - Beautiful, modern, and efficient airport transfer management dashboard. ✈️🚗
