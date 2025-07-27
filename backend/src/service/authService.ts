// service/authService.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

class AuthService {
    private jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    private saltRounds = 12;

    // Hash password
    async hashPassword(password: string): Promise<string> {
        return await bcrypt.hash(password, this.saltRounds);
    }

    // Compare password
    async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(password, hashedPassword);
    }

    // Generate JWT token
    generateToken(userId: number): string {
        return jwt.sign(
            { userId, id: userId }, // Include both for compatibility
            this.jwtSecret,
            { expiresIn: '7d' }
        );
    }

    // Verify JWT token
    verifyToken(token: string): { id: number; userId: number } | null {
        try {
            const decoded = jwt.verify(token, this.jwtSecret) as any;
            return {
                id: decoded.userId || decoded.id,
                userId: decoded.userId || decoded.id
            };
        } catch (error) {
            console.error('[AuthService] Token verification failed:', error);
            return null;
        }
    }
}

export const authService = new AuthService();