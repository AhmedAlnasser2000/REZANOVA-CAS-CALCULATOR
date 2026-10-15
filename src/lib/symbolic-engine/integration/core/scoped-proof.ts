import type {ExecutionContext} from './execution';

interface Node {readonly children:Map<object,Node>;proof?:Entry}
interface Entry {readonly path:readonly object[]}
interface Scope {readonly root:Node;readonly entries:Map<Entry,true>;readonly immutable:WeakMap<object,readonly object[]>}
const separator=Object.freeze({});
/** Exact successful obligations belong to one verifier and one cold operation.
 * The key includes ordered owners as well as inputs/evidence/target. Immutable
 * graph eligibility is reusable, but grants no mathematical proof authority. */
export class ScopedProof {
  #scopes=new WeakMap<object,Scope>();
  check(ctx:ExecutionContext,keys:readonly object[],verify:()=>void,owners:readonly object[]=[]):void {
    ctx.tick();const token=ctx.operationToken;if(!token){verify();return;}
    let scope=this.#scopes.get(token);
    if(!scope){ctx.allocate(8);scope={root:{children:new Map()},entries:new Map(),immutable:new WeakMap()};
      const retained=scope;ctx.onOperationEnd(()=>{retained.root.children.clear();retained.entries.clear();this.#scopes.delete(token);});this.#scopes.set(token,scope);}
    ctx.allocate(keys.length+owners.length+1);const path=[...keys,separator,...owners];
    let node:Node|undefined=scope.root;
    for(const key of path){ctx.tick();node=node?.children.get(key);if(!node)break;}
    if(node?.proof)return;
    if(!immutable(ctx,scope,keys,owners)){verify();return;}
    verify(); // Failure/exhaustion never registers success.
    if(path.length!==keys.length+owners.length+1 || !keys.every((key,i)=>{ctx.tick();return path[i]===key;})
      || !owners.every((owner,i)=>{ctx.tick();return path[keys.length+1+i]===owner;}))return;
    if(scope.entries.size===128){ctx.allocate(2);const oldest=scope.entries.keys().next().value!;remove(ctx,scope.root,oldest.path);scope.entries.delete(oldest);}
    ctx.allocate(5);const entry:Entry={path};let target=scope.root;
    for(const key of path){ctx.tick();let child:Node|undefined=target.children.get(key);if(!child){ctx.allocate(5);child={children:new Map()};target.children.set(key,child);}target=child;}
    ctx.allocate(3);scope.entries.set(entry,true);target.proof=entry;
  }
}
function remove(ctx:ExecutionContext,root:Node,path:readonly object[]):void {
  ctx.allocate(path.length);const parents:Node[]=[];let node=root;
  for(const key of path){ctx.tick();parents.push(node);node=node.children.get(key)!;}
  node.proof=undefined;
  for(let i=path.length-1;i>=0;i--){ctx.tick();if(node.proof||node.children.size)break;parents[i].children.delete(path[i]);node=parents[i];}
}
function immutable(ctx:ExecutionContext,scope:Scope,keys:readonly object[],owners:readonly object[]):boolean {
  ctx.allocate(keys.length+owners.length+5);ctx.tick(owners.length);const allowed=new Set(owners),seen=new Set<object>(),pending:unknown[]=[...keys];
  while(pending.length){ctx.tick();const value=pending.pop();
    if(typeof value==='function')return false;if(value===null||typeof value!=='object')continue;
    const known=scope.immutable.get(value);
    if(known?.every(owner=>{ctx.tick();return allowed.has(owner);}))continue;
    if(!Object.isFrozen(value))return false;
    if(allowed.has(value)||seen.has(value))continue;
    const prototype=Object.getPrototypeOf(value);if(prototype!==Object.prototype&&prototype!==Array.prototype&&prototype!==null)return false;
    ctx.allocate(1);seen.add(value);let count=Array.isArray(value)?1:0;
    for(const key in value){ctx.tick();if(!Object.hasOwn(value,key))return false;
      const descriptor=Object.getOwnPropertyDescriptor(value,key)!;if(!('value' in descriptor))return false;
      ctx.allocate(3);pending.push(descriptor.value);count++;
    }
    ctx.allocate(count);if(Reflect.ownKeys(value).length!==count)return false;
  }
  // Every visited object is immutable relative to these exact owner exclusions.
  // Reusing this eligibility fact with a smaller owner set is forbidden.
  ctx.allocate(owners.length);const required=Object.freeze([...owners]);
  // Memoize requested immutable graph roots. Retaining metadata for every leaf
  // costs more than its reuse in fresh arithmetic graphs; shared roots still
  // avoid repeat walks when later obligations bind them to another target.
  for(const value of keys){ctx.tick();if(allowed.has(value))continue;ctx.allocate(3);scope.immutable.set(value,required);}
  return true;
}
