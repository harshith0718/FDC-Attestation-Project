const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        res.status(429).json({
            success: false,
            message: 'Too many requests, please try again later.'
        });
    }
});

const createAccountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 create account requests per windowMs
    message: {
        success: false,
        message: 'Too many accounts created from this IP, please try again after an hour'
    }
});

module.exports = {
    apiLimiter,
    createAccountLimiter
};
