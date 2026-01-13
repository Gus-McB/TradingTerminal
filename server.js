const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);


app.use(express.json());
app.use(express.static('public'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().now() });
});

io.on('connection', (socket) => {

    console.log('A client connected:', socket.id);

    socket.on('subscribe', (symbol) => {
        console.log('Client subscribed to', symbol);
        socket.join(symbol);
    });

    socket.on('disconnect', () => {
        console.log('A client disconnected:', socket.id);
    });
});

httpServer.listen(3000, () => {
    console.log('Server is running on port 3000');
});
