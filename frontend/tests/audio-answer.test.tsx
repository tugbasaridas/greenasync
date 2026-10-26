import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import AudioAnswer from '../src/components/AudioAnswer';

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
Object.defineProperty(window, 'isSecureContext', { value: true });
// Media APIs are simulated: these checks cover lifecycle, not actual codecs.
const streams: ReturnType<typeof makeStream>[] = [];
let request: () => Promise<unknown>;
let constraints: unknown;
let current: FakeRecorder;
let revoked: string[] = [];
let sequence = 0;
let root: Root;
const container = document.getElementById('root')!;
Object.assign(URL, { createObjectURL: () => `blob:qa-${++sequence}`, revokeObjectURL: (url: string) => revoked.push(url) });
dom.window.HTMLMediaElement.prototype.pause = function () {};
function makeStream() {
  const track = { readyState: 'live', onended: null as null | (() => void), stop() { this.readyState = 'ended'; } };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track], track };
  streams.push(stream);
  return stream;
}
class FakeRecorder {
  state = 'inactive';
  mimeType = 'audio/webm;codecs=opus';
  ondataavailable: null | ((event: { data: Blob }) => void) = null;
  onstop: null | (() => void) = null;
  onerror: null | (() => void) = null;
  static isTypeSupported(type: string) { return type.includes('webm'); }
  constructor() { current = this; }
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    queueMicrotask(() => { this.ondataavailable?.({ data: new Blob(['audio-bytes']) }); this.onstop?.(); });
  }
}
Object.assign(globalThis, { MediaRecorder: FakeRecorder });
Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: (options: unknown) => { constraints = options; return request(); } } });
const button = (text: string) => [...container.querySelectorAll('button')].find(b => b.textContent === text)!;
async function click(text: string) { await act(async () => { button(text).click(); }); }
async function mount(seconds = 60) { await act(async () => { root.render(<AudioAnswer questionId={1} maxSeconds={seconds} locked={false} onBusyChange={() => {}} />); }); }
beforeEach(async () => {
  if (root) await act(async () => root.unmount());
  streams.length = 0; revoked = []; constraints = null;
  request = async () => makeStream();
  root = createRoot(container);
});
after(async () => { await act(async () => root.unmount()); dom.window.close(); });

test('records audio only, stops microphone, creates preview, revokes URL on delete', async () => {
  await mount(); await click('Kaydı başlat');
  assert.equal((constraints as { video: boolean }).video, false);
  assert.equal(current.state, 'recording');
  await click('Kaydı durdur');
  assert.equal(streams[0].track.readyState, 'ended');
  assert.ok(container.querySelector('audio')?.src.startsWith('blob:qa-'));
  assert.ok(container.textContent?.includes('Mikrofon kapatıldı'));
  await click('Kaydı sil');
  assert.equal(container.querySelector('audio'), null);
  assert.equal(revoked.length, 1);
});
test('denied permission gives useful error and allows retry', async () => {
  request = async () => { throw new DOMException('denied', 'NotAllowedError'); };
  await mount(); await click('Kaydı başlat');
  assert.ok(container.textContent?.includes('Mikrofon izni verilmedi'));
  assert.ok(button('Kaydı başlat'));
  request = async () => makeStream();
  await click('Kaydı başlat'); await click('Kaydı durdur');
  assert.ok(container.querySelector('audio'));
});
test('time limit stops microphone automatically', async () => {
  await mount(0.03); await click('Kaydı başlat');
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 70)); });
  assert.equal(streams[0].track.readyState, 'ended');
  assert.ok(container.textContent?.includes('Süre sınırına ulaşıldı'));
  assert.ok(container.querySelector('audio'));
});
test('cancelled permission grant releases tracks and does not begin recording', async () => {
  let resolve!: (stream: unknown) => void;
  request = () => new Promise(r => { resolve = r; });
  await mount(); await click('Kaydı başlat'); await click('İzin isteğini iptal et');
  const delayed = makeStream();
  await act(async () => { resolve(delayed); });
  assert.equal(delayed.track.readyState, 'ended');
  assert.ok(button('Kaydı başlat'));
  assert.equal(container.querySelector('audio'), null);
});
test('late rejection from cancelled request does not stop a newer recording', async () => {
  let reject!: (error: Error) => void;
  request = () => new Promise((_resolve, r) => { reject = r; });
  await mount(); await click('Kaydı başlat'); await click('İzin isteğini iptal et');
  request = async () => makeStream();
  await click('Kaydı başlat');
  await act(async () => { reject(new DOMException('denied', 'NotAllowedError')); });
  assert.equal(streams[0].track.readyState, 'live');
  assert.equal(current.state, 'recording');
  await click('Kaydı durdur');
});
test('unmount releases microphone; late permission grant after unmount is closed', async () => {
  await mount(); await click('Kaydı başlat');
  await act(async () => { root.unmount(); });
  assert.equal(streams[0].track.readyState, 'ended');
  root = createRoot(container);
  let resolve!: (stream: unknown) => void;
  request = () => new Promise(r => { resolve = r; });
  await mount(); await click('Kaydı başlat');
  await act(async () => { root.unmount(); });
  const delayed = makeStream();
  await act(async () => { resolve(delayed); });
  assert.equal(delayed.track.readyState, 'ended');
  root = createRoot(container);
});
test('failed re-record permission preserves previous recording', async () => {
  await mount(); await click('Kaydı başlat'); await click('Kaydı durdur');
  const url = container.querySelector('audio')!.src;
  request = async () => { throw new DOMException('denied', 'NotAllowedError'); };
  await click('Yeniden kaydet');
  assert.equal(container.querySelector('audio')!.src, url);
  assert.equal(revoked.length, 0);
});
