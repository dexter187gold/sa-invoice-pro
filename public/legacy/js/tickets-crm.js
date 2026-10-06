/** SA Tickets CRM 1.1.0 */
(async function(){
  var n=4;
  try {
    for (var i=0;i<n;i++) {
      await new Promise(function(res,rej){
        var s=document.createElement('script');
        s.src='js/tickets-crm-b64-'+i+'.js?v='+(window.SA_BUILD||'1.1.0');
        s.onload=res; s.onerror=function(){rej(new Error('b64 '+i));};
        document.head.appendChild(s);
      });
    }
    var b64='';
    for (var j=0;j<n;j++) b64+=window['__SA_CRM_B64_'+j];
    var bin=atob(b64), bytes=new Uint8Array(bin.length);
    for (var k=0;k<bin.length;k++) bytes[k]=bin.charCodeAt(k);
    var ds=new DecompressionStream('deflate-raw');
    var stream=new Blob([bytes]).stream().pipeThrough(ds);
    var code=new TextDecoder().decode(await new Response(stream).arrayBuffer());
    (0,eval)(code);
  } catch(e) { console.error('[SA] Tickets CRM', e); }
})();
