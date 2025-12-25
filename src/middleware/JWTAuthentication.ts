import jwt from 'jsonwebtoken';

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    // 1. Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract "TOKEN" from "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ message: 'Access token missing' });
    }

    // 2. Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            // Token is invalid or expired
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        // 3. Attach decoded user information to request object
        req.user = decoded;
        next();
    });
};

module.exports = authenticateToken;
