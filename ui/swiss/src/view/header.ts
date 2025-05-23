import { h, type Hooks, type VNode } from 'snabbdom';
import * as licon from 'lib/licon';
import { dataIcon, onInsert } from 'lib/snabbdom';
import type SwissCtrl from '../ctrl';
import { setClockWidget } from 'lib/game/clock/clockWidget';

const startClock = (time: number): Hooks => ({
  insert: (vnode: VNode) => setClockWidget(vnode.elm as HTMLElement, { time }),
});

const oneDayInSeconds = 60 * 60 * 24;

function clock(ctrl: SwissCtrl): VNode | undefined {
  const next = ctrl.data.nextRound;
  if (!next) return;
  if (next.in > oneDayInSeconds)
    return h('div.clock', [
      h('time.timeago.shy', {
        attrs: { datetime: Date.now() + next.in * 1000 },
        hook: onInsert(el => el.setAttribute('datetime', '' + (Date.now() + next.in * 1000))),
      }),
    ]);
  return h(`div.clock.clock-created.time-cache-${next.at}`, [
    h('span.shy', ctrl.data.status === 'created' ? i18n.site.startingIn : i18n.swiss.nextRound),
    h('span.time.text', { hook: startClock(next.in + 1) }),
  ]);
}

function ongoing(ctrl: SwissCtrl): VNode | undefined {
  const nb = ctrl.data.nbOngoing;
  return nb ? h('div.ongoing', [h('span.nb', [nb]), h('span.shy', i18n.swiss.ongoingGames(nb))]) : undefined;
}

export default function (ctrl: SwissCtrl): VNode {
  const greatPlayer = ctrl.data.greatPlayer;
  return h('div.swiss__main__header', [
    h('i.img', dataIcon(licon.Trophy)),
    h(
      'h1',
      greatPlayer
        ? [h('a', { attrs: { href: greatPlayer.url, target: '_blank' } }, greatPlayer.name), ' Tournament']
        : [ctrl.data.name],
    ),
    ctrl.data.status === 'finished' ? undefined : clock(ctrl) || ongoing(ctrl),
  ]);
}
