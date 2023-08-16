import { z } from 'zod';

export const registerSchema = z
	.object({
		username: z
			.string({ required_error: 'username is required' })
			.min(2, { message: 'username must be at least 2 characters' })
			.max(64, { message: 'username must be less than 64 characters' })
			.trim(),
		email: z
			.string({ required_error: 'email is required' })
			.min(1)
			.max(64, { message: 'email must be less than 64 characters' })
			.email({ message: 'must be a valid email address' }),
		password: z
			.string({ required_error: 'password is required' })
			.min(6, { message: 'password must be more than 6 characters' })
			.max(32, { message: 'password must be less than 32 characters' })
			.trim(),
		passwordConfirm: z
			.string({ required_error: 'password confirmation is required' })
			.min(6, { message: 'password confirmation must be more than 6 characters' })
			.max(32, { message: 'password confirmation must be less than 32 characters' })
			.trim(),
	})
	.superRefine(({ passwordConfirm, password }, ctx) => {
		if (passwordConfirm !== password) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'password confirmation must match password',
				path: ['passwordConfirm'],
			});
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'password confirmation must match password',
				path: ['password'],
			});
		}
	});
