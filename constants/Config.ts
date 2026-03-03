// Network Configuration
// Update this URL based on your current network setup

// Common network configurations:
// - Home WiFi: Usually starts with 192.168.x.x or 10.0.x.x
// - Mobile Tethering: Usually starts with 192.168.x.x or 172.20.x.x
// - Office/Public WiFi: May have different ranges

export const Config = {
  // === UPDATE THIS URL WHEN CHANGING NETWORKS ===
  API_BASE_URL: 'http://localhost:5400/api',
  getHealthUrl: () => {
    const base = Config.API_BASE_URL.replace(/\/api\/?$/, '') || Config.API_BASE_URL;
    return `${base}/health`;
  },
  
  // Alternative configurations (uncomment the one you need):
  // API_BASE_URL: 'http://localhost:5400/api', // For web development
  // API_BASE_URL: 'http://192.168.100.79:5400/api', // Common home WiFi
  // API_BASE_URL: 'http://172.20.10.2:5400/api', // Common tethering IP
  // API_BASE_URL: 'http://10.0.0.100:5400/api', // Alternative home network
  
  // === OTHER CONFIGURATION ===
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  
  // === HELPFUL TIPS ===
  // To find your current IP address:
  // 1. On Mac: System Preferences > Network > Advanced > TCP/IP
  // 2. On Windows: Command Prompt > ipconfig
  // 3. On Linux: Terminal > ifconfig or ip addr
  // 4. Or use: ifconfig | grep "inet " | grep -v 127.0.0.1
}; 