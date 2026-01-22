import { signupSchema, signInSchema } from '#validations/auth.validation.js';
import { formatValidationError } from '#utils/format.js';
import logger from '#config/logger.js';
import { createUser, authenticateUser } from '#services/auth.service.js';
import { jwttoken } from '#utils/jwt.js';
import { cookies } from '#utils/cookies.js';

export const signup = async (req, res, next) => {
    try {
        const validationResult = signupSchema.safeParse(req.body);

        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Validation Error',
                details: formatValidationError(validationResult.error)
            });
        }

        const { name, email, password, role } = validationResult.data;

        const user = await createUser({ name, email, password, role });

        const token = jwttoken.sign({ id: user.id, email: user.email, role: user.role });

        cookies.set(res, 'token', token);

        logger.info(`User registered successfully: ${email}`);
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id, name: user.name, email: user.email, role: user.role
            }
        });
    } catch (e) {
        logger.error('Signup error', e);

        if (e.message === 'User already exists') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        next(e);
    }
};

export const signin = async (req, res, next) => {
    try {
        const validationResult = signInSchema.safeParse(req.body);

        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Validation Error',
                details: formatValidationError(validationResult.error)
            });
        }

        const { email, password } = validationResult.data;

        const user = await authenticateUser({ email, password });

        const token = jwttoken.sign({ id: user.id, email: user.email, role: user.role });

        cookies.set(res, 'token', token);

        logger.info(`User logged in successfully: ${email}`);
        res.status(200).json({
            message: 'User logged in successfully',
            user: {
                id: user.id, name: user.name, email: user.email, role: user.role
            }
        });
    } catch (e) {
        logger.error('Signin error', e);

        if (e.message === 'Invalid credentials') {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        next(e);
    }
};

export const signout = async (req, res, next) => {
    try {
        const token = cookies.get(req, 'token');

        if (token) {
            try {
                const payload = jwttoken.verify(token);
                logger.info(`User logged out successfully: ${payload.email}`);
            } catch (verifyError) {
                logger.error('Failed to verify token during logout', verifyError);
            }
        }

        cookies.clear(res, 'token');

        return res.status(200).json({ message: 'User logged out successfully' });
    } catch (e) {
        logger.error('Signout error', e);
        next(e);
    }
};
