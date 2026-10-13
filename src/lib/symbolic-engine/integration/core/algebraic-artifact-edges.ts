/** New Gate B wire edge lists use canonical decimal indices. Mathematical
 * atoms remain separate structured graph nodes; only adjacency storage changes. */
import {demand,type ExecutionContext} from './execution';
import {checkArtifactBounds,inspectExactArtifact,type ExactArtifactBounds} from './artifact-bounds';
import {buildRecursiveArtifactGraphWithin,replayRecursiveArtifactGraphWithin,type RecursiveArtifactNode} from './recursive-artifact-graph';
import * as w from './decision-wire-algebra';
const format='canonical-decimal-edges-v1';
function encodeEdges(ctx:ExecutionContext,edges:readonly number[]):string{ctx.allocate(edges.length*18+1);for(const edge of edges){ctx.tick();demand(Number.isSafeInteger(edge)&&edge>=0,'invalid-input','artifact edge index');}return edges.join(',');}
function decodeEdges(ctx:ExecutionContext,value:unknown,index:number,maximum:number):readonly number[]{
 demand(typeof value==='string','invalid-input','artifact decimal edges');ctx.allocate(value.length+1);const edges:number[]=[];let number=0,digits=0,zero=false;
 for(let i=0;i<=value.length;i++){ctx.tick();const code=i===value.length?44:value.charCodeAt(i);if(code===44){if(value.length===0)return Object.freeze([]);demand(digits>0&&number<index,'invalid-input','artifact backward edge coverage');if(edges.length+2>maximum)ctx.exhaust('differential-artifact-nodes');ctx.allocate(1);edges.push(number);number=0;digits=0;zero=false;continue;}
  demand(code>=48&&code<=57&&(!zero||digits===0),'invalid-input','canonical artifact decimal index');zero=digits===0&&code===48;number=number*10+code-48;digits++;demand(Number.isSafeInteger(number),'invalid-input','safe artifact edge index');
 }
 return Object.freeze(edges);
}
export function packAlgebraicArtifactEdges(ctx:ExecutionContext,input:unknown,bounds:ExactArtifactBounds){
 checkArtifactBounds(ctx,bounds);const graph=buildRecursiveArtifactGraphWithin(ctx,input);for(const node of graph.nodes){ctx.tick();const size=node[0]==='atom'?0:node[0]==='list'?node[1].length:node[2].length;if(size+1>bounds.artifactNodes)ctx.exhaust('differential-artifact-nodes');}ctx.allocate(graph.nodes.length+3);
 const nodes=Object.freeze(graph.nodes.map(node=>{ctx.tick();if(node[0]==='atom')return node;if(node[0]==='list')return Object.freeze(['list',encodeEdges(ctx,node[1])]);return Object.freeze(['record',node[1],encodeEdges(ctx,node[2])]);}));
 const data=Object.freeze({format,root:graph.root,nodes});inspectExactArtifact(ctx,bounds,data);return data;
}
export function unpackAlgebraicArtifactEdges(ctx:ExecutionContext,data:unknown,bounds:ExactArtifactBounds):unknown{
 checkArtifactBounds(ctx,bounds);inspectExactArtifact(ctx,bounds,data);const raw=w.record(ctx,data,['format','root','nodes']);demand(raw.format===format,'invalid-input','artifact edge format');const source=w.array(ctx,raw.nodes);ctx.allocate(source.length+2);
 const nodes:RecursiveArtifactNode[]=source.map((value,index)=>{const node=w.array(ctx,value);if(node[0]==='atom'){demand(node.length===2,'invalid-input','artifact atom coverage');return node as RecursiveArtifactNode;}
  if(node[0]==='list'){demand(node.length===2,'invalid-input','artifact list coverage');return Object.freeze(['list',decodeEdges(ctx,node[1],index,bounds.artifactNodes)]);}
  demand(node[0]==='record'&&node.length===3,'invalid-input','artifact record coverage');const names=w.array(ctx,node[1]);demand(names.every(name=>typeof name==='string'),'invalid-input','artifact record names');return Object.freeze(['record',names as readonly string[],decodeEdges(ctx,node[2],index,bounds.artifactNodes)]);
 });
 // The whole stored artifact has already passed every physical bound. These
 // temporary exact edges are charged and then replayed by the same verifier
 // used by published formats: shape, topology, uniqueness and reachability.
 return replayRecursiveArtifactGraphWithin(ctx,Object.freeze({root:raw.root,nodes:Object.freeze(nodes)}));
}
