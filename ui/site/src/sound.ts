import { storage } from 'common/storage';
import { isIos } from 'common/device';
import { throttle } from 'common/timing';
import { defined } from 'common';
import { speakable } from 'chess/sanWriter';

type Name = string;
type Path = string;

export default new (class implements SoundI {
  ctx = makeAudioContext();
  listeners = new Set<SoundListener>();
  sounds = new Map<Path, Sound>(); // All loaded sounds and their instances
  paths = new Map<Name, Path>(); // sound names to paths
  theme = document.body.dataset.soundSet!;
  speechStorage = storage.boolean('speech.enabled');
  volumeStorage = storage.make('sound-volume');
  music?: SoundMove;
  primerEvents = ['touchend', 'pointerup', 'pointerdown', 'mousedown', 'keydown'];
  primer = () =>
    this.ctx?.resume().then(() => {
      setTimeout(() => $('#warn-no-autoplay').removeClass('shown'), 500);
      for (const e of this.primerEvents) window.removeEventListener(e, this.primer, { capture: true });
    });

  constructor() {
    this.primerEvents.forEach(e => window.addEventListener(e, this.primer, { capture: true }));
  }

  async load(name: Name, path?: Path): Promise<Sound | undefined> {
    if (!this.ctx) return;
    if (path) this.paths.set(name, path);
    else path = this.paths.get(name) ?? this.resolvePath(name);
    if (!path) return;
    if (this.sounds.has(path)) return this.sounds.get(path);

    const result = await fetch(path);
    if (!result.ok) throw new Error(`${path} failed ${result.status}`);

    const arrayBuffer = await result.arrayBuffer();
    const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      if (this.ctx?.decodeAudioData.length === 1)
        this.ctx?.decodeAudioData(arrayBuffer).then(resolve).catch(reject);
      else this.ctx?.decodeAudioData(arrayBuffer, resolve, reject);
    });
    const sound = new Sound(this.ctx, audioBuffer);
    this.sounds.set(path, sound);
    return sound;
  }

  resolvePath(name: Name): string | undefined {
    if (!this.enabled()) return;
    let dir = this.theme;
    if (this.theme === 'music' || this.speech()) {
      if (['move', 'capture', 'check', 'checkmate'].includes(name)) return;
      dir = 'standard';
    }
    return this.url(`${dir}/${name[0].toUpperCase() + name.slice(1)}.mp3`);
  }

  url(name: Name): string {
    return site.asset.url(`sound/${name}`, { pathVersion: '_____1' });
  }

  async play(name: Name, volume = 1): Promise<void> {
    if (!this.enabled()) return;
    const sound = await this.load(name);
    if (sound && (await this.resumeWithTest())) await sound.play(this.getVolume() * volume);
  }

  throttled = throttle(100, (name: Name, volume: number) => this.play(name, volume));

  async move(o?: SoundMoveOpts) {
    const volume = o?.volume ?? 1;
    if (o?.filter !== 'music' && this.theme !== 'music') {
      if (o?.name) this.throttled(o.name, volume);
      else {
        if (o?.san?.includes('x')) this.throttled('capture', volume);
        else this.throttled('move', volume);
        if (o?.san?.includes('#')) {
          this.throttled('checkmate', volume);
        } else if (o?.san?.includes('+')) {
          this.throttled('check', volume);
        }
      }
    }
    if (o?.filter === 'game' || this.theme !== 'music') return;
    this.music ??= await site.asset.loadEsm<SoundMove>('bits.soundMove');
    this.music(o);
  }

  async playAndDelayMateResultIfNecessary(name: Name): Promise<void> {
    if (this.theme === 'standard') this.play(name);
    else setTimeout(() => this.play(name), 600);
  }

  async countdown(count: number, interval = 500): Promise<void> {
    if (!this.enabled()) return;
    try {
      while (count > 0) {
        const promises = [new Promise(r => setTimeout(r, interval)), this.play(`countDown${count}`)];

        if (--count > 0) promises.push(this.load(`countDown${count}`));
        await Promise.all(promises);
      }
      await this.play('genericNotify');
    } catch (e) {
      console.error(e);
    }
  }

  playOnce(name: string): void {
    // increase chances that the first tab can put a local storage lock
    const doIt = () => {
      const store = storage.make('just-played');
      if (Date.now() - parseInt(store.get()!, 10) < 2000) return;
      store.set('' + Date.now());
      this.play(name);
    };
    if (document.hasFocus()) doIt();
    else setTimeout(doIt, 10 + Math.random() * 500);
  }

  setVolume = this.volumeStorage.set;

  getVolume = () => {
    // garbage has been stored here by accident (e972d5612d)
    const v = parseFloat(this.volumeStorage.get() || '');
    return v >= 0 ? v : 0.7;
  };

  enabled = () => this.theme !== 'silent';

  speech = (v?: boolean): boolean => {
    if (defined(v)) this.speechStorage.set(v);
    return this.speechStorage.get();
  };

  say = (text: string, cut = false, force = false, translated = false) => {
    if (typeof window.speechSynthesis === 'undefined') return false;
    try {
      if (cut) speechSynthesis.cancel();
      if (!this.speech() && !force) return false;
      const msg = new SpeechSynthesisUtterance(text);
      msg.volume = this.getVolume();
      msg.lang = translated ? document.documentElement.lang : 'en-US';
      if (!isIos()) {
        // speech events are unreliable on iOS, but iphones do their own cancellation
        msg.onstart = () => this.listeners.forEach(l => l('start', text));
        msg.onend = msg.onerror = () => this.listeners.forEach(l => l('stop'));
      }
      window.speechSynthesis.speak(msg);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  saySan = (san?: San, cut?: boolean, force?: boolean) => this.say(speakable(san), cut, force);

  sayOrPlay = (name: string, text: string) => this.say(text) || this.play(name);

  changeSet = (s: string) => {
    if (isIos()) this.ctx?.resume();
    this.theme = s;
  };

  preloadBoardSounds() {
    for (const name of ['move', 'capture', 'check', 'checkmate', 'genericNotify']) this.load(name);
  }

  async resumeWithTest(): Promise<boolean> {
    if (!this.ctx) return false;
    if (this.ctx.state !== 'running' && this.ctx.state !== 'suspended') {
      // in addition to 'closed', iOS has 'interrupted'. who knows what else is out there
      if (this.ctx.state !== 'closed') this.ctx.close();
      this.ctx = makeAudioContext();
      if (this.ctx) {
        for (const s of this.sounds.values()) s.rewire(this.ctx);
      }
    }
    // if suspended, try audioContext.resume() with a timeout (sometimes it never resolves)
    if (this.ctx?.state === 'suspended')
      await new Promise<void>(resolve => {
        const resumeTimer = setTimeout(() => {
          $('#warn-no-autoplay').addClass('shown');
          resolve();
        }, 400);
        this.ctx?.resume().then(() => {
          clearTimeout(resumeTimer);
          resolve();
        });
      });
    if (this.ctx?.state !== 'running') return false;
    $('#warn-no-autoplay').removeClass('shown');
    return true;
  }
})();

class Sound {
  node: GainNode;
  ctx: AudioContext;

  constructor(
    ctx: AudioContext,
    readonly buffer: AudioBuffer,
  ) {
    this.rewire(ctx);
  }

  play(volume = 1): Promise<void> {
    this.node.gain.setValueAtTime(volume, this.ctx.currentTime);
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    source.connect(this.node);
    return new Promise<void>(resolve => {
      source.onended = () => {
        source.disconnect();
        resolve();
      };
      source.start(0);
    });
  }
  rewire(ctx: AudioContext) {
    this.node?.disconnect();
    this.ctx = ctx;
    this.node = this.ctx.createGain();
    this.node.connect(this.ctx.destination);
  }
}

function makeAudioContext(): AudioContext | undefined {
  return window.webkitAudioContext
    ? new window.webkitAudioContext({ latencyHint: 'interactive' })
    : typeof AudioContext !== 'undefined'
      ? new AudioContext({ latencyHint: 'interactive' })
      : undefined;
}
