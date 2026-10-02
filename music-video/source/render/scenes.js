'use strict';
const C = require('./core');
const parts = ['./scenes1', './scenes2', './scenes3', './scenes4'].map((p) => { try { return require(p); } catch (e) { if (e.code === 'MODULE_NOT_FOUND' && e.message.includes(p.slice(2))) return { S: [] }; throw e; } });
const SCENES = parts.flatMap((p) => p.S);
const DUR = C.DUR;
// bg: board | blue | dark | hype ; cap: bottom | big | cine | none ; cam: beat zoom amount
const SECTIONS = [
  { a: 0, b: 8.75, bg: 'board', cap: 'none', cam: 0.0, camImpact: 0, label: '', tagA: 0 },
  { a: 8.75, b: 31.73, bg: 'board', cap: 'bottom', cam: 0.006, camImpact: 0.01, label: 'INTRO · THE ROAST' },
  { a: 31.73, b: 41.2, bg: 'hype', cap: 'none', cam: 0.025, label: 'ISMB 300 · Fe 410', tag: false },
  { a: 41.2, b: 73.45, bg: 'board', cap: 'bottom', cam: 0.01, label: 'VERSE 1 · DEMAND' },
  { a: 73.45, b: 83.75, bg: 'board', cap: 'bottom', cam: 0.012, label: 'PRE-CHORUS · THE ROAST' },
  { a: 83.75, b: 105.2, bg: 'hype', cap: 'big', cam: 0.02, label: 'CHORUS · RESTRAINED', capY: 880, rayColor: '#3fe0ff' },
  { a: 105.2, b: 132.3, bg: 'blue', cap: 'bottom', cam: 0.01, label: 'VERSE 2 · CLASSIFICATION', hud: true },
  { a: 132.3, b: 162.25, bg: 'dark', cap: 'cine', cam: 0.0, camImpact: 0.004, drift: 0.002, label: 'BRIDGE · SHEAR', tagA: 0.5, bgIn: 1.0 },
  { a: 162.25, b: 171.07, bg: 'hype', cap: 'big', cam: 0.022, label: 'NO REDUCTION', capY: 900, rayColor: '#ff5fd2' },
  { a: 171.07, b: 193.9, bg: 'hype', cap: 'bottom', cam: 0.022, label: 'VERSE 3 · CAPACITY', capNoBand: false },
  { a: 193.9, b: 209.45, bg: 'board', cap: 'bottom', cam: 0.008, label: 'VERDICT', bgIn: 0.6 },
  { a: 209.45, b: DUR + 1, bg: 'hype', cap: 'none', cam: 0.03, label: '', tag: false },
];
const CAP_SKIP = new Set(parts.flatMap((p) => p.CAP_SKIP || []));
module.exports = { SCENES, SECTIONS, CAP_SKIP };
