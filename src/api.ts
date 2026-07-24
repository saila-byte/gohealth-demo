export type Conversation = {
  conversation_id: string;
  conversation_url: string;
};

export async function createConversation(opts: {
  conversational_context: string;
}): Promise<Conversation> {
  const res = await fetch('/api/tavus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      conversational_context: opts.conversational_context,
      conversation_name: 'GoHealth Onboarding Demo',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.message || err.error || `Create failed (${res.status})`
    );
  }

  return res.json();
}

export async function endConversation(conversationId: string): Promise<void> {
  await fetch('/api/tavus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'end',
      conversationId,
    }),
  });
}
