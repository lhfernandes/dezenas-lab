import { simulate } from './core.js';
import { GAMES } from './games.js';
self.onmessage = ({data}) => { try { self.postMessage({result:simulate(data.events, data.training, 100, 42, data.size, GAMES[data.gameId])}); } catch(e) { self.postMessage({error:e.message}); } };
