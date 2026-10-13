/** Transport-only key sharing for the new Gate B tags. Nested proof codecs and
 * all previously published artifacts keep their exact formats. No tuple or
 * dictionary entry carries mathematical authority. */
import {demand,type ExecutionContext} from './execution';
import type {ExactArtifactBounds} from './artifact-bounds';
import {packAlgebraicArtifactEdges,unpackAlgebraicArtifactEdges} from './algebraic-artifact-edges';
import * as w from './decision-wire-algebra';
type Visit=Readonly<{kind:'visit';value:unknown}>;
function atom(value:unknown){return value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isSafeInteger(value);}
function keySignature(ctx:ExecutionContext,names:readonly string[]){let size=2;for(const name of names)size+=6*name.length+3;ctx.allocate(size);return JSON.stringify(names);}
function compact(ctx:ExecutionContext,input:unknown){
 const keys:(readonly string[])[]=[],schemas=new Map<string,number>(),done=new WeakMap<object,unknown>(),active=new WeakSet<object>();
 type Finish=Readonly<{kind:'finish';value:object;children:readonly unknown[];marker:number}>;
 const pending:(Visit|Finish)[]=[{kind:'visit',value:input}];ctx.allocate(5);
 const read=(value:unknown)=>{if(atom(value))return value;demand(value!==null&&typeof value==='object'&&done.has(value),'invalid-input','complete compact datum');return done.get(value);};
 while(pending.length){ctx.tick();const task=pending.pop()!;
  if(task.kind==='finish'){ctx.allocate(task.children.length+2);done.set(task.value,Object.freeze([task.marker,...task.children.map(read)]));active.delete(task.value);continue;}
  const value=task.value;if(atom(value))continue;demand(value!==null&&typeof value==='object','invalid-input','compact artifact datum');if(done.has(value))continue;demand(!active.has(value),'invalid-input','cyclic compact artifact');ctx.allocate(4);active.add(value);
  let children:readonly unknown[],marker:number;
  if(Array.isArray(value)){children=w.array(ctx,value);marker=-1;}
  else{const names=Object.keys(value),record=w.record(ctx,value,names),signature=keySignature(ctx,names);let index=schemas.get(signature);if(index===undefined){index=keys.length;ctx.allocate(names.length+signature.length+3);keys.push(Object.freeze([...names]));schemas.set(signature,index);}marker=index;children=names.map(name=>record[name]);}
  ctx.allocate(children.length+1);pending.push({kind:'finish',value,children,marker});for(let i=children.length-1;i>=0;i--)pending.push({kind:'visit',value:children[i]});
 }
 return Object.freeze({keys:Object.freeze(keys),value:read(input)});
}
function expand(ctx:ExecutionContext,input:unknown){
 const root=w.record(ctx,input,['keys','value']),rawKeys=w.array(ctx,root.keys),keys:(readonly string[])[]=[],signatures=new Set<string>();ctx.allocate(rawKeys.length);
 for(const value of rawKeys){const names=w.array(ctx,value),seen=new Set<string>();for(const name of names){ctx.tick();demand(typeof name==='string'&&!seen.has(name),'invalid-input','compact record key');ctx.allocate(name.length+1);seen.add(name);}const typed=names as readonly string[],signature=keySignature(ctx,typed);demand(!signatures.has(signature),'invalid-input','duplicate compact record schema');ctx.allocate(signature.length+1);signatures.add(signature);keys.push(typed);}
 const done=new WeakMap<object,unknown>(),active=new WeakSet<object>(),used=new Set<number>();
 type Finish=Readonly<{kind:'finish';value:readonly unknown[]}>;
 const pending:(Visit|Finish)[]=[{kind:'visit',value:root.value}];ctx.allocate(5);
 const read=(value:unknown)=>{if(atom(value))return value;demand(Array.isArray(value)&&done.has(value),'invalid-input','complete expanded datum');return done.get(value);};
 while(pending.length){ctx.tick();const task=pending.pop()!;
  if(task.kind==='finish'){const tuple=task.value,marker=tuple[0]as number;ctx.allocate(tuple.length*2);if(marker===-1)done.set(tuple,Object.freeze(tuple.slice(1).map(read)));else{const record:Record<string,unknown>=Object.create(null);for(let i=0;i<keys[marker].length;i++)record[keys[marker][i]]=read(tuple[i+1]);done.set(tuple,Object.freeze(record));}active.delete(tuple);continue;}
  const value=task.value;if(atom(value))continue;const tuple=w.array(ctx,value);if(done.has(tuple))continue;demand(!active.has(tuple),'invalid-input','cyclic compact data');demand(tuple.length>0&&typeof tuple[0]==='number'&&Number.isSafeInteger(tuple[0])&&tuple[0]>=-1&&(tuple[0]===-1||tuple[0]<keys.length&&tuple.length===keys[tuple[0]].length+1),'invalid-input','compact tuple schema/coverage');if(tuple[0]!==-1&&!used.has(tuple[0])){demand(tuple[0]===used.size,'invalid-input','canonical compact schema order');ctx.allocate(1);used.add(tuple[0]);}ctx.allocate(tuple.length+3);active.add(tuple);pending.push({kind:'finish',value:tuple});for(let i=tuple.length-1;i>=1;i--)pending.push({kind:'visit',value:tuple[i]});
 }
 demand(used.size===keys.length,'invalid-input','unused compact record schema');return read(root.value);
}
export function packAlgebraicArtifactData(ctx:ExecutionContext,input:unknown,bounds:ExactArtifactBounds){return packAlgebraicArtifactEdges(ctx,compact(ctx,input),bounds);}
export function unpackAlgebraicArtifactData(ctx:ExecutionContext,data:unknown,bounds:ExactArtifactBounds){return expand(ctx,unpackAlgebraicArtifactEdges(ctx,data,bounds));}
