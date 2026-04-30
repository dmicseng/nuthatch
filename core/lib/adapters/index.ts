// Side-effect import: ensures every concrete adapter has registered itself
// before any code calls getAdapter()/listAdapters().
import './manifest';

export * from './types';
export * from './registry';
