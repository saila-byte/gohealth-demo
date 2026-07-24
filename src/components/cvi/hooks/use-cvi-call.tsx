import { useCallback } from 'react';
import { useDaily } from '@daily-co/daily-react';

export const useCVICall = (): {
	joinCall: (props: { url: string; token?: string }) => void;
	leaveCall: () => void;
} => {
	const daily = useDaily();

	const joinCall = useCallback(
		({ url, token }: { url: string; token?: string }) => {
			daily?.join({
				url,
				...(token ? { token } : {}),
				inputSettings: {
					audio: {
						processor: {
							type: 'noise-cancellation',
						},
					},
				},
			});
		},
		[daily]
	);

	const leaveCall = useCallback(() => {
		daily?.leave();
	}, [daily]);

	return { joinCall, leaveCall };
};
