/** Tickets CRM+ 1.1.1 */
(async function(){
try{
  await new Promise(function(res,rej){var s=document.createElement('script');s.src='js/tickets-crm-plus-0.js?v='+(window.SA_BUILD||'1.1.1');s.onload=res;s.onerror=rej;document.head.appendChild(s);});
  await new Promise(function(res,rej){var s=document.createElement('script');s.src='js/tickets-crm-plus-1.js?v='+(window.SA_BUILD||'1.1.1');s.onload=res;s.onerror=rej;document.head.appendChild(s);});
  var b64=window.__SA_PLUS_0+window.__SA_PLUS_1;
  var bin=atob(b64),bytes=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  var ds=new DecompressionStream('deflate-raw');
  var code=new TextDecoder().decode(await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer());
  (0,eval)(code);
}catch(e){console.error('[SA] CRM+',e);}
})();
