import { Request, Response } from 'express';
import prisma from '../../config/prisma';
import { authService } from '../../service/authService';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
};

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'A user with this email already exists.' });
        }

        const hashPassword = await authService.hashPassword(password);
        const newUser = await prisma.user.create({
            data: {
                email,
                name: name || 'Unnamed User',
                password: hashPassword
            }
        });

        await prisma.notificationChannel.create({
            data: {
                type: 'EMAIL',
                target: newUser.email,
                isDefault: true,
                userId: newUser.id,
            }
        });

        const token = authService.generateToken(newUser.id);

        res.cookie('authToken', token, COOKIE_OPTIONS);

        res.status(201).json({
            message: 'User has been registered',
            token, 
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name
            }
        });

    } catch (error) {
        console.error('[AuthController] Error in register:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const isValidPassword = await authService.comparePassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = authService.generateToken(user.id);

        
        res.cookie('authToken', token, COOKIE_OPTIONS);

        res.status(200).json({
            message: 'Login successful!',
            token, 
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });

    } catch (error) {
        console.error('[AuthController] Error in login:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        res.clearCookie('authToken', {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

        res.status(200).json({
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('[AuthController] Error in logout:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
};

export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                notificationChannels: {
                    select: {
                        id: true,
                        type: true,
                        target: true,
                        isDefault: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            user
        });

    } catch (error) {
        console.error('[AuthController] Error in getProfile:', error);
        res.status(500).json({ error: 'Failed to get user profile' });
    }
};