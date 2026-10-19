import { getEmoticonDefinition } from '../emoticons/emoticonCatalog.js';
import type { GameSnapshot } from '../session/GameSnapshot.js';
import { serverInviteUrl } from '../session/connectionSettings.js';
import './partyOverlay.css';

/** A small view of the current server crew, not a separate party model. */
export class PartyOverlay {
  private readonly root = document.createElement('aside');
  private readonly status = document.createElement('p');
  private readonly players = document.createElement('ul');
  private readonly notice = document.createElement('p');
  private readonly invite = document.createElement('input');
  constructor(serverUrl: string, onLeave: () => void) {
    this.root.className = 'snake-party';
    this.root.setAttribute('aria-label', 'Connected players');
    this.status.setAttribute('role', 'status');
    this.notice.setAttribute('aria-live', 'polite');
    const title = document.createElement('strong');
    title.textContent = 'Server crew';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Invite friend';
    this.invite.readOnly = true;
    this.invite.hidden = true;
    this.invite.setAttribute('aria-label', 'Invite link');
    this.invite.value = serverInviteUrl(location.href, serverUrl);
    copy.onclick = () => {
      this.invite.hidden = false;
      this.invite.select();
      void navigator.clipboard
        ?.writeText(this.invite.value)
        .then(() => {
          this.notice.textContent = 'Invite link copied.';
        })
        .catch(() => {
          this.notice.textContent = 'Copy the invite link below.';
        });
    };
    const leave = document.createElement('button');
    leave.type = 'button';
    leave.textContent = 'Leave server';
    leave.onclick = onLeave;
    this.root.append(title, this.status, this.players, this.notice, copy, leave, this.invite);
    this.root.addEventListener('keydown', (event) => event.stopPropagation());
    document.body.append(this.root);
  }
  setStatus(status: 'connected' | 'reconnecting' | 'closed'): void {
    this.status.textContent =
      status === 'connected'
        ? 'Connected'
        : status === 'reconnecting'
          ? 'Reconnecting... Your snake is waiting.'
          : 'Disconnected';
  }
  showNotice(message: string): void {
    this.notice.textContent = message;
  }
  update(snapshot: GameSnapshot): void {
    const peers = Object.values(snapshot.connections ?? {});
    const rows = peers.map((peer) => {
      const player = snapshot.players[peer.playerId];
      const expression = player?.activeEmoticon
        ? getEmoticonDefinition(player.activeEmoticon)
        : undefined;
      const row = document.createElement('li');
      row.textContent = `${peer.displayName}${peer.playerId === snapshot.localPlayerId ? ' (you)' : ''} | ${player?.alive ? 'room' : 'down in'} ${player?.roomId ?? '?'}${expression ? ` | ${expression.symbol} ${expression.label}` : ''}`;
      return row;
    });
    this.players.replaceChildren(...rows);
  }
  destroy(): void {
    this.root.remove();
  }
}
