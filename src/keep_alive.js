const http = require('http');

function startKeepAliveServer(port = 8080) {
    const server = http.createServer(function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write("I'm alive");
        res.end();
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️  Port ${port} is already in use, trying port ${port + 1}...`);
            startKeepAliveServer(port + 1);
        } else {
            console.error('❌ Keep-alive server error:', err);
        }
    });

    server.listen(port, () => {
        console.log(`✅ Keep-alive server running on port ${port}`);
    });

    return server;
}

// Start the keep-alive server
startKeepAliveServer();