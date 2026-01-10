import * as Ably from "ably";

let ablyClient: Ably.Realtime | null = null;

export function getAblyClient(): Ably.Realtime {
  if (!ablyClient) {
    ablyClient = new Ably.Realtime({
      key: process.env.NEXT_PUBLIC_ABLY_KEY!,
      clientId: "ngo-client",
    });
  }
  return ablyClient;
}

export function subscribeToChannel(
  channelName: string,
  callback: (message: Ably.Types.Message) => void
) {
  const client = getAblyClient();
  const channel = client.channels.get(channelName);
  channel.subscribe("message", callback);
  return channel;
}

export async function publishToChannel(
  channelName: string,
  data: unknown
): Promise<void> {
  const client = getAblyClient();   // ✅ FIXED
  const channel = client.channels.get(channelName);
  await channel.publish("message", data);
}

export function unsubscribeFromChannel(channelName: string): void {
  const client = getAblyClient();
  const channel = client.channels.get(channelName);
  channel.unsubscribe();
}
