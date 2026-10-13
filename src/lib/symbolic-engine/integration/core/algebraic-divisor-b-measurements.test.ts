import {it} from 'vitest';
import {writeFileSync} from 'node:fs';
import {algebraicDivisorGateBMeasurements} from './__tests__/algebraic-divisor-b-measurements';
it.skipIf(process.env.CALCWIZ_DIVISOR_B_MEASURE!=='1')('records serial algebraic-divisor Gate B observations',()=>{
 const result=algebraicDivisorGateBMeasurements((name,record)=>{writeFileSync('.task_tmp/2026-10-13__integration-algebraic-divisor1/gate-b-progress.json',JSON.stringify({name,record},null,2));});
 writeFileSync('.task_tmp/2026-10-13__integration-algebraic-divisor1/gate-b-performance.json',JSON.stringify(result,null,2));
},1200000);
