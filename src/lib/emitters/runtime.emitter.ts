import EventEmitter from 'eventemitter3';

const eventEmitter = new EventEmitter();

let listeners = 0;

const RuntimeEmitter = {
  on: (event: string, fn: any) => eventEmitter.on(event, fn),
  once: (event: string, fn: any) => eventEmitter.once(event, fn),
  off: (event: string, fn: any) => eventEmitter.off(event, fn),
  emit: (event: string, payload: any) => eventEmitter.emit(event, payload),
  registerWithSafety: (event: string, fn: any) => {
    if (listeners === 0) {
      RuntimeEmitter.on(event, fn);
      listeners++;
    }
  },
  getListeners: () => listeners,
};

export default RuntimeEmitter;
