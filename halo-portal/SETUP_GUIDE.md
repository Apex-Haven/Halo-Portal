# HALO UI Setup Guide

This guide will help you set up and run the HALO React dashboard UI.

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** or **yarn**
- **HALO Backend** running on port 3000

### 1. Install Dependencies
```bash
cd halo-ui
npm install
```

### 2. Configure Environment
```bash
# Copy the example environment file
cp env.example .env

# Edit the .env file with your configuration
nano .env
```

### 3. Start Development Server
```bash
npm run dev
```

The UI will be available at `http://localhost:70070`

## 📋 Detailed Setup

### Environment Configuration

Edit the `.env` file with your settings:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:7007/api
VITE_WS_URL=ws://localhost:7007/ws

# App Configuration
VITE_APP_NAME=HALO Dashboard
VITE_APP_VERSION=1.0.0
VITE_NODE_ENV=development

# Feature Flags
VITE_ENABLE_WEBSOCKET=true
VITE_ENABLE_DEBUG_MODE=true
```

### Backend Connection

Ensure your HALO backend is running:
```bash
# In the backend directory
cd /path/to/halo-backend
npm run dev
```

The backend should be running on `http://localhost:0707`

### WebSocket Connection

For real-time updates, ensure WebSocket support is enabled in your backend. The UI will automatically connect to the WebSocket endpoint.

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Project Structure

```
halo-ui/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Main application pages
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API service layers
│   ├── styles/        # CSS and styling
│   └── utils/         # Utility functions
├── public/            # Static assets
└── package.json       # Dependencies
```

### Key Components

#### Layout Components
- **Layout** - Main application wrapper
- **Sidebar** - Navigation menu
- **Header** - Top bar with search and notifications

#### Page Components
- **Dashboard** - Overview and statistics
- **Transfers** - Transfer management
- **Vendors** - Vendor management
- **Flights** - Flight tracking
- **Settings** - System configuration

#### Service Layers
- **transferService** - Transfer API operations
- **flightService** - Flight API operations
- **notificationService** - Notification API operations
- **vendorService** - Vendor API operations

## 🎨 Styling

### Tailwind CSS
The UI uses Tailwind CSS for styling with custom configuration:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { /* HALO brand colors */ },
        success: { /* Success states */ },
        warning: { /* Warning states */ },
        danger: { /* Error states */ }
      }
    }
  }
}
```

### Custom Components
Pre-built component classes for common UI patterns:

```css
.btn-primary    /* Primary button */
.btn-secondary  /* Secondary button */
.card          /* Card container */
.input         /* Input field */
.badge         /* Status badge */
```

## 🔄 Real-time Updates

### WebSocket Integration
The UI connects to the backend WebSocket for real-time updates:

```javascript
// Automatic connection management
const { isConnected, lastMessage } = useWebSocket('ws://localhost:7007/ws')

// Subscribe to specific updates
const { subscribeToTransfer } = useRealTimeUpdates()
```

### Update Types
- **Transfer Updates** - Status changes, driver assignments
- **Flight Status** - Real-time flight information
- **Notifications** - Delivery confirmations
- **System Alerts** - Critical events

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Features
- Collapsible sidebar
- Touch-friendly interactions
- Optimized layouts
- Responsive navigation

## 🧪 Testing

### Component Testing
```bash
# Run tests (when implemented)
npm run test

# Run tests in watch mode
npm run test:watch
```

### Manual Testing
1. **Dashboard** - Check statistics and recent transfers
2. **Transfers** - Test CRUD operations
3. **Vendors** - Verify vendor management
4. **Flights** - Test flight tracking
5. **Settings** - Configure system preferences

## 🚀 Deployment

### Production Build
```bash
# Build for production
npm run build

# Preview production build
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

### Static Hosting
The built files can be deployed to any static hosting service:
- **Vercel** - Recommended for easy deployment
- **Netlify** - Great for static sites
- **AWS S3** - Scalable static hosting
- **GitHub Pages** - Free hosting option

## 🔧 Configuration

### Vite Configuration
```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    port: 7070,
    proxy: {
      '/api': {
        target: 'http://localhost:0707',
        changeOrigin: true,
      },
    },
  },
})
```

### API Proxy
The development server proxies API requests to the backend:
- `/api/*` → `http://localhost:0707/api/*`
- WebSocket connections handled separately

## 🐛 Troubleshooting

### Common Issues

#### 1. Backend Connection Failed
```
Error: Network Error
```
**Solution**: Ensure the HALO backend is running on port 3000

#### 2. WebSocket Connection Failed
```
WebSocket connection failed
```
**Solution**: Check WebSocket support in backend and firewall settings

#### 3. Build Errors
```
Module not found
```
**Solution**: Run `npm install` to ensure all dependencies are installed

#### 4. Styling Issues
```
Tailwind classes not working
```
**Solution**: Check Tailwind CSS configuration and imports

### Debug Mode
Enable debug mode in `.env`:
```env
VITE_ENABLE_DEBUG_MODE=true
```

This will show additional console logs and error details.

## 📊 Performance

### Optimization Features
- **Code Splitting** - Lazy loading of routes
- **Tree Shaking** - Remove unused code
- **Asset Optimization** - Compressed images and fonts
- **Caching** - Efficient data caching

### Performance Metrics
- **First Contentful Paint** < 1.5s
- **Largest Contentful Paint** < 2.5s
- **Time to Interactive** < 3s

## 🔒 Security

### Security Features
- **XSS Protection** - Input sanitization
- **CSRF Protection** - Token-based requests
- **Content Security Policy** - Restricted resource loading
- **Authentication** - JWT token management

## 🎯 Best Practices

### Code Organization
- **Component Structure** - Consistent file organization
- **Naming Conventions** - Clear and descriptive names
- **Code Splitting** - Lazy load heavy components
- **Error Boundaries** - Graceful error handling

### Performance
- **Memoization** - Use React.memo and useMemo
- **Lazy Loading** - Load components on demand
- **Image Optimization** - Use appropriate image formats
- **Bundle Analysis** - Monitor bundle size

## 📞 Support

### Getting Help
- **Documentation** - Check component documentation
- **Examples** - Review sample implementations
- **Issues** - Report bugs on GitHub
- **Community** - Join developer discussions

### Common Solutions
- **CORS Issues** - Check API proxy configuration
- **WebSocket Issues** - Verify backend WebSocket setup
- **Build Errors** - Check Node.js version compatibility
- **Styling Issues** - Verify Tailwind configuration

## 🚀 Next Steps

After setup is complete:

1. **Test All Features** - Verify all functionality works
2. **Configure Settings** - Set up system preferences
3. **Add Customizations** - Brand the UI for your organization
4. **Deploy to Production** - Set up production hosting
5. **Monitor Performance** - Track usage and performance metrics

---

**HALO UI** - Beautiful, modern, and efficient airport transfer management dashboard! ✈️🚗
