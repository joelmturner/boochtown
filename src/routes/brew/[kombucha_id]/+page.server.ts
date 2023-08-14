import { getRatingCounts } from '$lib';
import { supabase } from '$lib/supabaseClient';
import { AuthApiError } from '@supabase/supabase-js';
import { fail, type Actions, redirect } from '@sveltejs/kit';
import type { KombuchaWithReviews } from '../../../app';

export async function load({ params, url, locals }) {
	const { data: kombucha, error } = await supabase
		.from('kombucha')
		.select(
			`
            id,
            name,
            attributes (
                *,
                brands (
                    *
                )
            ),
            reviews (
                *
            )
        `
		)
		.eq('id', params.kombucha_id);

	const reviews = kombucha?.[0]?.reviews;

	const users = reviews?.map((review) => !!review.user_id && review.user_id)?.filter(Boolean) ?? [];
	const { data: userDetails, error: err2 } = await supabase
		.from('user_details')
		.select()
		.in('user_id', users);

	const enhancedReviews = reviews
		?.map(({ user_id, ...rest }) => ({
			...rest,
			user: userDetails?.find((user) => user.user_id === user_id)
		}))
		?.sort((a, b) => b.user.user_id.localeCompare(a.user.user_id));

	const { avg, ratingCount } = getRatingCounts(reviews ?? []);

	const userId = (await locals.getSession())?.user.id;
	const userHasReviewed = reviews?.some((review) => review.user_id === userId);

	const attributes = kombucha?.[0]?.attributes?.[0] ?? {};
	const { created_at, kombucha_id, brand_id, brands, ...restAttributes } = attributes;

	const resolvedKombucha: KombuchaWithReviews = {
		id: kombucha?.[0]?.id,
		name: kombucha?.[0]?.name,
		...restAttributes,
		brand: brands,
		reviews: enhancedReviews,
		rating: {
			avg,
			count: ratingCount
		}
	};

	return {
		kombucha: resolvedKombucha,
		userHasReviewed,
		reviewedSuccess: url.searchParams.get('reviewedSuccessfully') === 'true',
		isLoggedIn: !!userId
	};
}

export const actions: Actions = {
	addReview: async ({ request, url, locals }) => {
		const body = Object.fromEntries(await request.formData());

		const userId = (await locals.getSession())?.user.id;
		const { error: err } = await locals.supabase.from('reviews').insert({
			kombucha_id: body.kombuchaId,
			review: body.review,
			rating: body.rating,
			user_id: userId
		});

		if (err) {
			if (err instanceof AuthApiError && err.status === 400) {
				return fail(400, {
					error: 'Not authorized to review'
				});
			}
			return fail(500, {
				error: 'Server error. Please try again later'
			});
		}

		throw redirect(303, `${url.pathname}?reviewedSuccessfully=true`);
	}
};
