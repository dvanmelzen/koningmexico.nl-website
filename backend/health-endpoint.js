// Health check endpoint for Docker healthcheck
// Add this to your server.js:

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'mexico-backend',
        uptime: process.uptime()
    });
});
