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

// ------------------ START SERVER ------------------
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB')
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
})

mongoose.connection.on('error', err => {
    console.log(err)
    logEvents(`${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`, 'mongoErrLog.log')
})
