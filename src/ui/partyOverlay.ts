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
  private readonly rules = document.createElement('details');
  private readonly rulesText = document.createElement('p');
  private readonly lifecycle = document.createElement('p');
  private rulesSignature = '';
  private deadlineTimer?: ReturnType<typeof setTimeout>;
  private statusTimer?: ReturnType<typeof setTimeout>;
  private networkStatus: 'connected' | 'reconnecting' | 'closed' = 'connected';
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
    const summary = document.createElement('summary');
    summary.textContent = 'World rules';
    this.rules.append(summary, this.rulesText);
    this.root.append(
      title,
      this.status,
      this.lifecycle,
      this.players,
      this.notice,
      copy,
      leave,
      this.invite,
      this.rules,
    );
    this.root.addEventListener('keydown', (event) => event.stopPropagation());
    document.body.append(this.root);
  }
  setStatus(status: 'connected' | 'reconnecting' | 'closed'): void {
    clearTimeout(this.statusTimer);
    clearTimeout(this.deadlineTimer);
    this.networkStatus = status;
    if (status === 'reconnecting') {
      this.statusTimer = setTimeout(() => {
        this.status.textContent = 'Reconnecting...';
      }, 350);
      this.deadlineTimer = setTimeout(() => this.setPredictionExhausted(true), 3000);
    } else this.status.textContent = status === 'connected' ? 'Connected' : 'Disconnected';
  }
  setPredictionExhausted(exhausted: boolean): void {
    if (this.networkStatus === 'reconnecting' && exhausted) {
      clearTimeout(this.statusTimer);
      this.status.textContent = 'Reconnecting... Movement is waiting for the server.';
    }
  }
  showNotice(message: string): void {
    this.notice.textContent = message;
  }
  update(snapshot: GameSnapshot): void {
    this.lifecycle.textContent =
      snapshot.lifecycle?.kind === 'creating'
        ? 'Creating your character at origin.'
        : snapshot.lifecycle?.kind === 'death'
          ? 'Your death encounter is waiting for you.'
          : '';
    const rulesSignature = JSON.stringify(snapshot.serverRules ?? null);
    if (rulesSignature !== this.rulesSignature) {
      this.rulesSignature = rulesSignature;
      this.rulesText.textContent = `Equipment, quests, lives and relationships are personal. Towns and terrain are shared. Returning after death keeps your progress. Autosave attempts every ${Math.round((snapshot.serverRules?.autosaveIntervalMs ?? 30000) / 1000)} seconds; restart restores the last successful checkpoint. Unavailable here: ${snapshot.serverRules?.unavailableFeatures.join(', ') ?? 'see host settings'}.`;
    }
    const peers = Object.values(snapshot.connections ?? {});
    const rows = peers.map((peer) => {
      const player = snapshot.players[peer.playerId];
      const expression = player?.activeEmoticon
        ? getEmoticonDefinition(player.activeEmoticon)
        : undefined;
      const row = document.createElement('li');
      row.textContent = `${peer.displayName}${peer.suspended ? ' (reconnecting)' : ''}${peer.playerId === snapshot.localPlayerId ? ' (you)' : ''} | ${player?.activity === 'creating-character' ? 'creating character in room' : player?.activity === 'death-encounter' ? 'away from the living board in room' : player?.alive ? 'room' : 'down in'} ${player?.roomId ?? '?'}${expression ? ` | ${expression.symbol} ${expression.label}` : ''}`;
      return row;
    });
    this.players.replaceChildren(...rows);
  }
  destroy(): void {
    clearTimeout(this.deadlineTimer);
    clearTimeout(this.statusTimer);
    this.root.remove();
  }
}
