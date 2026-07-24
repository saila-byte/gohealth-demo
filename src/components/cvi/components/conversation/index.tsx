import React, {
	useEffect,
	useCallback,
	useRef,
	useState,
	useLayoutEffect,
} from 'react';
import {
	DailyAudio,
	DailyVideo,
	useDevices,
	useLocalSessionId,
	useMeetingState,
	useScreenVideoTrack,
	useVideoTrack,
} from '@daily-co/daily-react';
import { MicSelectBtn, CameraSelectBtn, ScreenShareButton } from '../device-select';
import { useLocalScreenshare } from '../../hooks/use-local-screenshare';
import { useReplicaIDs } from '../../hooks/use-replica-ids';
import { useCVICall } from '../../hooks/use-cvi-call';
import { useChat, type ChatMessage } from '../../hooks/use-chat';
import { useClosedCaption } from '../../hooks/use-closed-caption';
import { AudioWave } from '../audio-wave';
import styles from './conversation.module.css';

interface ConversationProps {
	onLeave: (messages: ChatMessage[]) => void;
	conversationUrl: string;
	conversationId?: string;
}

const VideoPreview = React.memo(
	({ id, size = 'default' }: { id: string; size?: 'default' | 'compact' }) => {
		const videoState = useVideoTrack(id);
		const widthVideo = videoState.track?.getSettings()?.width;
		const heightVideo = videoState.track?.getSettings()?.height;
		const isVertical = widthVideo && heightVideo ? widthVideo < heightVideo : false;

		return (
			<div
				className={`${styles.previewVideoContainer} ${size === 'compact' ? styles.previewVideoContainerCompact : ''} ${isVertical ? styles.previewVideoContainerVertical : ''} ${videoState.isOff ? styles.previewVideoContainerHidden : ''}`}
			>
				<DailyVideo
					automirror
					sessionId={id}
					type="video"
					className={`${styles.previewVideo} ${size === 'compact' ? styles.previewVideoCompact : ''} ${isVertical ? styles.previewVideoVertical : ''} ${videoState.isOff ? styles.previewVideoHidden : ''}`}
				/>
				{size !== 'compact' ? (
					<div className={styles.audioWaveContainer}>
						<AudioWave id={id} />
					</div>
				) : null}
			</div>
		);
	}
);

const PreviewVideos = React.memo(() => {
	const localId = useLocalSessionId();
	const { isScreenSharing: isLocalScreenSharing } = useLocalScreenshare();
	const replicaIds = useReplicaIDs();
	const replicaId = replicaIds[0];
	const replicaScreen = useScreenVideoTrack(replicaId ?? '');
	// Presentation mode: replica (or local) screenVideo track is active
	const isPresenting = isLocalScreenSharing || !replicaScreen.isOff;

	return (
		<>
			{isPresenting && replicaId ? (
				<VideoPreview id={replicaId} size="compact" />
			) : null}
			{!isPresenting && localId ? <VideoPreview id={localId} /> : null}
		</>
	);
});
const MainVideo = React.memo(() => {
	const replicaIds = useReplicaIDs();
	const localId = useLocalSessionId();
	const replicaId = replicaIds[0];
	const videoState = useVideoTrack(replicaId ?? '');
	const replicaScreen = useScreenVideoTrack(replicaId ?? '');
	const localScreen = useScreenVideoTrack(localId);
	// Tavus presentation publishes slides on the replica's screenVideo track
	const isReplicaPresenting = !replicaScreen.isOff;
	const isLocalScreenSharing = !localScreen.isOff;
	const showingScreen = isReplicaPresenting || isLocalScreenSharing;
	const mainSessionId = isReplicaPresenting
		? replicaId
		: isLocalScreenSharing
			? localId
			: replicaId;
	const mainType = showingScreen ? 'screenVideo' : 'video';

	if (!replicaId) {
		return (
			<div className={styles.waitingContainer}>
				<p>Connecting…</p>
			</div>
		);
	}

	return (
		<div
			className={`${styles.mainVideoContainer} ${showingScreen ? styles.mainVideoContainerScreenSharing : ''}`}
		>
			<DailyVideo
				automirror={!showingScreen}
				sessionId={mainSessionId}
				type={mainType}
				className={`${styles.mainVideo}
				${showingScreen ? styles.mainVideoScreenSharing : ''}
				${!showingScreen && videoState.isOff ? styles.mainVideoHidden : ''}`}
			/>
		</div>
	);
});

const CaptionOverlay = React.memo(() => {
	const caption = useClosedCaption();
	if (!caption) return null;
	return (
		<div className={styles.captionOverlay}>
			<span className={styles.captionSpeaker}>
				{caption.role === 'replica' ? 'Alex' : 'You'}
			</span>
			<span className={styles.captionText}>{caption.text}</span>
		</div>
	);
});

const ChatMessageRow = React.memo(({ message }: { message: ChatMessage }) => {
	const isReplica = message.role === 'replica';
	return (
		<div
			className={`${styles.chatRow} ${isReplica ? styles.chatRowReplica : styles.chatRowUser}`}
		>
			<span className={styles.chatAuthor}>{isReplica ? 'Alex' : 'You'}</span>
			<div className={styles.chatBubble}>{message.text}</div>
		</div>
	);
});

const ChatPanel = React.memo(
	({
		open,
		onClose,
		messages,
		onSend,
		canSend,
	}: {
		open: boolean;
		onClose: () => void;
		messages: ChatMessage[];
		onSend: (text: string) => void;
		canSend: boolean;
	}) => {
		const [draft, setDraft] = useState('');
		const listRef = useRef<HTMLDivElement>(null);

		useLayoutEffect(() => {
			const el = listRef.current;
			if (el) el.scrollTop = el.scrollHeight;
		}, [messages, open]);

		const submit = useCallback(
			(e: React.FormEvent) => {
				e.preventDefault();
				const text = draft.trim();
				if (!text) return;
				onSend(text);
				setDraft('');
			},
			[draft, onSend]
		);

		return (
			<aside
				className={`${styles.chatPanel} ${open ? styles.chatPanelOpen : ''}`}
				aria-hidden={!open}
			>
				<div className={styles.chatHeader}>
					<span className={styles.chatTitle}>Live transcript & chat</span>
					<button
						type="button"
						className={styles.chatClose}
						onClick={onClose}
						aria-label="Close chat"
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</button>
				</div>
				<div className={styles.chatMessages} ref={listRef}>
					{messages.length === 0 ? (
						<p className={styles.chatEmpty}>
							The conversation transcript will appear here. You can also type a
							message to Alex.
						</p>
					) : (
						messages.map((m) => <ChatMessageRow key={m.id} message={m} />)
					)}
				</div>
				<form className={styles.chatInputRow} onSubmit={submit}>
					<input
						className={styles.chatInput}
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						placeholder={canSend ? 'Message Alex…' : 'Connecting…'}
						disabled={!canSend}
					/>
					<button
						type="submit"
						className={styles.chatSend}
						disabled={!canSend || !draft.trim()}
						aria-label="Send message"
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</button>
				</form>
			</aside>
		);
	}
);

const ChatToggleButton = React.memo(
	({ open, onToggle }: { open: boolean; onToggle: () => void }) => (
		<button
			type="button"
			className={`${styles.chatToggleButton} ${open ? styles.chatToggleButtonActive : ''}`}
			onClick={onToggle}
			aria-label="Toggle transcript and chat"
			aria-pressed={open}
		>
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		</button>
	)
);

export const Conversation = React.memo(
	({ onLeave, conversationUrl, conversationId }: ConversationProps) => {
	const { joinCall, leaveCall } = useCVICall();
	const meetingState = useMeetingState();
	const { hasMicError } = useDevices();
	const joinedOnce = useRef(false);
	const [chatOpen, setChatOpen] = useState(false);
	const { messages, conversationId: liveConversationId, sendMessage } =
		useChat(conversationId);

	const messagesRef = useRef(messages);
	messagesRef.current = messages;

	useEffect(() => {
		if (meetingState === 'error') onLeave(messagesRef.current);
	}, [meetingState, onLeave]);

	useEffect(() => {
		if (joinedOnce.current) return;
		joinedOnce.current = true;
		joinCall({ url: conversationUrl });
	}, [joinCall, conversationUrl]);

	const handleLeave = useCallback(() => {
		leaveCall();
		onLeave(messagesRef.current);
	}, [leaveCall, onLeave]);

	return (
		<div className={`${styles.container} ${chatOpen ? styles.containerChatOpen : ''}`}>
			<div className={styles.videoContainer}>
				{hasMicError ? (
					<div className={styles.errorContainer}>
						<p>Camera or microphone access denied.</p>
					</div>
				) : null}
				<div className={styles.mainVideoContainer}>
					<MainVideo />
				</div>
				<div className={styles.selfViewContainer}>
					<PreviewVideos />
				</div>
				<CaptionOverlay />
			</div>
			<div className={styles.footer}>
				<div className={styles.footerControls}>
					<MicSelectBtn />
					<CameraSelectBtn />
					<ScreenShareButton />
					<ChatToggleButton open={chatOpen} onToggle={() => setChatOpen((v) => !v)} />
					<button type="button" className={styles.leaveButton} onClick={handleLeave} aria-label="Leave call">
						<span className={styles.leaveButtonIcon}>
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</span>
					</button>
				</div>
			</div>
			<ChatPanel
				open={chatOpen}
				onClose={() => setChatOpen(false)}
				messages={messages}
				onSend={sendMessage}
				canSend={Boolean(liveConversationId)}
			/>
			<DailyAudio />
		</div>
	);
});
