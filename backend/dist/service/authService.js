import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
class AuthService {
    jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    saltRounds = 12;
    async hashPassword(password) {
        return await bcrypt.hash(password, this.saltRounds);
    }
    async comparePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }
    generateToken(userId) {
        return jwt.sign({ userId, id: userId }, this.jwtSecret, { expiresIn: '7d' });
    }
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            return {
                id: decoded.userId || decoded.id,
                userId: decoded.userId || decoded.id
            };
        }
        catch (error) {
            console.error('[AuthService] Token verification failed:', error);
            return null;
        }
    }
}
export const authService = new AuthService();
//# sourceMappingURL=authService.js.map