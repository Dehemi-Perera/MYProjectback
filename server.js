require('dotenv').config()
const express = require('express')
const app = express()
const path = require('path')
const { logger, logEvents } = require('./middleware/logger')
const errorHandler = require('./middleware/errorHandler')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const corsOptions = require('./config/corsOptions')
const connectDB = require('./config/dbConn')
const mongoose = require('mongoose')
const PORT = process.env.PORT || 3000

console.log(process.env.NODE_ENV)

// Connect to MongoDB
connectDB()

// ------------------ MIDDLEWARE ------------------
app.use(logger)
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

// Strip newlines from incoming URLs to fix %0A issue
app.use((req, res, next) => {
    req.url = req.url.replace(/\r?\n/g, '')
    next()
})

// ------------------ HEALTH CHECK ROUTE ------------------
// Add this before other routes for Railway health checks
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    })
})

// ------------------ ROUTES ------------------

// Serve static files
app.use('/', express.static(path.join(__dirname, 'public')))

// Mount your API routes
app.use('/', require('./routes/root'))
app.use('/auth', require('./routes/authRoutes'))   // Auth route
app.use('/users', require('./routes/userRoutes'))  // User route (JWT protected)
app.use('/notes', require('./routes/noteRoutes'))  // Notes route (JWT protected)

// ------------------ 404 HANDLER ------------------
app.all('*', (req, res) => {
    res.status(404)
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'views', '404.html'))
    } else if (req.accepts('json')) {
        res.json({ message: '404 Not Found' })
    } else {
        res.type('txt').send('404 Not Found')
    }
})

// Global error handler
app.use(errorHandler)

// ------------------ PROCESS HANDLERS ------------------
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully')
    process.exit(0)
})

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully')
    process.exit(0)
})

// ------------------ START SERVER ------------------
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB')
    // Add host binding for Railway
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`)
    })
})

mongoose.connection.on('error', err => {
    console.log(err)
    logEvents(`${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`, 'mongoErrLog.log')
})