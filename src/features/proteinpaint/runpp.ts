import { PROTEINPAINT_API } from '@/core';

const runPp = await import(/* turbopackIgnore: true */ `${PROTEINPAINT_API}/bin/dist/app.js`)
export const {runproteinpaint, bindProteinPaint} = runPp
