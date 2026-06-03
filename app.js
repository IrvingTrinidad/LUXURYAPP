function openMaps(query){
  const q = encodeURIComponent(query || 'lugares para cita en Veracruz');
  window.open(`https://www.google.com/maps/search/${q}`, '_blank');
}
function toggleBot(){
  const bot = document.getElementById('bot');
  if(bot) bot.classList.toggle('hidden');
}
async function askBot(e){
  e.preventDefault();
  const input = document.getElementById('botInput');
  const box = document.getElementById('botMessages');
  const msg = input.value.trim();
  if(!msg) return;
  box.innerHTML += `<p class="user-msg">${escapeHtml(msg)}</p>`;
  input.value='';
  const res = await fetch('/api/gemini-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,profileId:null})}).catch(()=>null);
  let reply = 'Puedo ayudarte a buscar lugares, ideas de mensaje o planes para una cita en Veracruz.';
  if(res && res.ok){ const data = await res.json(); reply = data.reply || reply; }
  box.innerHTML += `<p class="bot-msg">${escapeHtml(reply)}</p>`;
  box.scrollTop = box.scrollHeight;
}
async function sendChat(e, profileId){
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const box = document.getElementById('messages');
  const msg = input.value.trim();
  if(!msg) return;
  box.innerHTML += `<div class="bubble me">${escapeHtml(msg)}</div>`;
  input.value='';
  const res = await fetch('/api/gemini-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,profileId})});
  const data = await res.json();
  box.innerHTML += `<div class="bubble ai">${escapeHtml(data.reply)}</div>`;
  box.scrollTop = box.scrollHeight;
}
function escapeHtml(text){return String(text).replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
