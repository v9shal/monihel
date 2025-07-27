import { Request, Response, NextFunction } from 'express';
import { authService } from '../../service/authService';

declare global {
    namespace Express {
        export interface Request {
            user?: {
                id: number;
            };
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    let token = req.cookies?.authToken;
    
    if (!token) {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No token provided.' });
        }
        
        token = authHeader.split(' ')[1];
    }

    const userPayload = authService.verifyToken(token);

    if (!userPayload) {
        if (req.cookies?.authToken) {
            res.clearCookie('authToken', {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
            });
        }
        
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
    }

    req.user = { id: userPayload.id };
    
    next();
};