// Barre d'outils injectée dans les transcripts générés par discord-html-transcripts
// (recherche, tri, onglet Membres, thèmes, impression) — pur HTML/CSS/JS, sans build.

const STYLE = `<style>
#vtx-toolbar {
  position: sticky; top: 0; z-index: 100;
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  padding: 10px 16px;
  background: #1e1f22;
  border-bottom: 1px solid #000;
  font-family: Whitney, 'Source Sans Pro', ui-sans-serif, system-ui, sans-serif;
  font-size: 13px;
  color: #dcddde;
}
#vtx-toolbar .vtx-group { display: flex; align-items: center; gap: 8px; }
#vtx-toolbar .vtx-spacer { flex: 1 1 auto; }
#vtx-toolbar select, #vtx-toolbar input, #vtx-toolbar button {
  background: #2b2d31; color: #dcddde; border: 1px solid #1e1f22; border-radius: 4px;
  padding: 6px 10px; font-size: 13px; font-family: inherit; outline: none;
}
#vtx-toolbar select:focus, #vtx-toolbar input:focus { border-color: #5865f2; }
#vtx-toolbar input[type=text] { min-width: 180px; }
#vtx-toolbar button { cursor: pointer; background: #4f545c; }
#vtx-toolbar button:hover { background: #5d6269; }

#vtx-members { display: none; padding: 8px 16px; background: #36393e; }
.vtx-member-row { display: flex; align-items: center; gap: 10px; padding: 8px 6px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.vtx-member-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
.vtx-member-name { font-weight: 600; }
.vtx-member-role { font-size: 12px; color: #949ba4; background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 8px; }
.vtx-member-count { margin-left: auto; font-size: 12px; color: #949ba4; }
.vtx-empty { padding: 24px; text-align: center; color: #949ba4; }

/* Thème : Semi-sombre */
html.vtx-theme-semi .discord-messages { background-color: #4f545c !important; }
html.vtx-theme-semi #vtx-members { background-color: #4f545c !important; }
html.vtx-theme-semi #vtx-toolbar { background: #3a3d44 !important; }

/* Thème : Clair (le mode discord-light-theme gère .discord-messages, on adapte juste la barre) */
html.vtx-theme-light #vtx-toolbar { background: #f2f3f5 !important; color: #2e3338 !important; border-color: #dedede !important; }
html.vtx-theme-light #vtx-toolbar select, html.vtx-theme-light #vtx-toolbar input, html.vtx-theme-light #vtx-toolbar button {
  background: #fff !important; color: #2e3338 !important; border-color: #dedede !important;
}
html.vtx-theme-light #vtx-toolbar button:hover { background: #e3e5e8 !important; }
html.vtx-theme-light #vtx-members { background: #fff !important; color: #2e3338 !important; }
html.vtx-theme-light .vtx-member-count, html.vtx-theme-light .vtx-member-role { color: #747f8d !important; }

@media print {
  #vtx-toolbar, #vtx-members { display: none !important; }
}
</style>`;

const HTML = `<div id="vtx-toolbar">
  <div class="vtx-group">
    <select id="vtx-tab" title="Affichage">
      <option value="messages">💬 Messages</option>
      <option value="members">👥 Membres</option>
    </select>
    <input id="vtx-search" type="text" placeholder="Rechercher...">
  </div>
  <div class="vtx-spacer"></div>
  <div class="vtx-group">
    <select id="vtx-sort-field"></select>
    <select id="vtx-sort-order">
      <option value="asc">A → Z</option>
      <option value="desc">Z → A</option>
    </select>
    <button id="vtx-print" type="button">🖨️ Imprimer</button>
    <select id="vtx-theme">
      <option value="dark">🌑 Sombre</option>
      <option value="semi" selected>🌗 Semi-sombre</option>
      <option value="light">☀️ Clair</option>
    </select>
  </div>
</div>
<div id="vtx-members"></div>`;

const SCRIPT = `<script>(function(){
  function ready(fn){ if(document.readyState!=='loading'){fn();}else{document.addEventListener('DOMContentLoaded',fn);} }
  ready(function(){
    var dm = document.querySelector('discord-messages');
    if(!dm) return;

    var msgEls = Array.prototype.slice.call(dm.querySelectorAll(':scope > discord-message, :scope > discord-system-message'));
    var wrapper = document.createElement('div');
    wrapper.id = 'vtx-msglist';
    if(msgEls.length){
      msgEls[0].parentNode.insertBefore(wrapper, msgEls[0]);
      msgEls.forEach(function(el){ wrapper.appendChild(el); });
    }

    var profiles = (window.$discordMessage && window.$discordMessage.profiles) || {};
    var memberCounts = {};
    msgEls.forEach(function(el){
      var pid = el.getAttribute('profile');
      if(!pid) return;
      memberCounts[pid] = (memberCounts[pid] || 0) + 1;
    });
    var members = Object.keys(profiles).map(function(id){
      var p = profiles[id];
      return { id: id, name: (p && p.author) || id, avatar: p && p.avatar, color: p && p.roleColor, role: p && p.roleName, count: memberCounts[id] || 0 };
    });

    var tabSel = document.getElementById('vtx-tab');
    var searchInp = document.getElementById('vtx-search');
    var fieldSel = document.getElementById('vtx-sort-field');
    var orderSel = document.getElementById('vtx-sort-order');
    var themeSel = document.getElementById('vtx-theme');
    var printBtn = document.getElementById('vtx-print');
    var membersPanel = document.getElementById('vtx-members');

    var FIELD_OPTIONS = {
      messages: [['date','Date'], ['author','Auteur'], ['content','Contenu']],
      members: [['name','Nom'], ['count','Nombre de messages']]
    };

    function setFieldOptions(tab){
      fieldSel.innerHTML = '';
      FIELD_OPTIONS[tab].forEach(function(o){
        var opt = document.createElement('option');
        opt.value = o[0]; opt.textContent = o[1];
        fieldSel.appendChild(opt);
      });
    }

    function applyMessages(){
      var q = searchInp.value.trim().toLowerCase();
      msgEls.forEach(function(el){
        var match = !q || el.textContent.toLowerCase().indexOf(q) !== -1;
        el.style.display = match ? '' : 'none';
      });
      var field = fieldSel.value, order = orderSel.value;
      var sorted = msgEls.slice().sort(function(a,b){
        var av, bv;
        if(field === 'date'){
          av = a.getAttribute('timestamp') || '';
          bv = b.getAttribute('timestamp') || '';
        } else if(field === 'author'){
          var pa = profiles[a.getAttribute('profile')];
          var pb = profiles[b.getAttribute('profile')];
          av = ((pa && pa.author) || '').toLowerCase();
          bv = ((pb && pb.author) || '').toLowerCase();
        } else {
          av = a.textContent.trim().toLowerCase();
          bv = b.textContent.trim().toLowerCase();
        }
        if(av < bv) return order === 'asc' ? -1 : 1;
        if(av > bv) return order === 'asc' ? 1 : -1;
        return 0;
      });
      sorted.forEach(function(el){ wrapper.appendChild(el); });
    }

    function renderMembers(){
      var q = searchInp.value.trim().toLowerCase();
      var field = fieldSel.value, order = orderSel.value;
      var list = members.filter(function(m){ return !q || m.name.toLowerCase().indexOf(q) !== -1; });
      list.sort(function(a,b){
        var av, bv;
        if(field === 'count'){ av = a.count; bv = b.count; }
        else { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
        if(av < bv) return order === 'asc' ? -1 : 1;
        if(av > bv) return order === 'asc' ? 1 : -1;
        return 0;
      });
      membersPanel.innerHTML = '';
      if(!list.length){
        var empty = document.createElement('div');
        empty.className = 'vtx-empty';
        empty.textContent = 'Aucun membre trouvé.';
        membersPanel.appendChild(empty);
        return;
      }
      list.forEach(function(m){
        var row = document.createElement('div');
        row.className = 'vtx-member-row';
        var img = document.createElement('img');
        img.className = 'vtx-member-avatar';
        img.src = m.avatar || '';
        var name = document.createElement('span');
        name.className = 'vtx-member-name';
        name.textContent = m.name;
        if(m.color) name.style.color = m.color;
        var role = document.createElement('span');
        role.className = 'vtx-member-role';
        role.textContent = m.role || '';
        var count = document.createElement('span');
        count.className = 'vtx-member-count';
        count.textContent = m.count + ' message' + (m.count === 1 ? '' : 's');
        row.appendChild(img);
        row.appendChild(name);
        if(m.role) row.appendChild(role);
        row.appendChild(count);
        membersPanel.appendChild(row);
      });
    }

    function applyAll(){
      if(tabSel.value === 'messages'){
        wrapper.style.display = '';
        membersPanel.style.display = 'none';
        applyMessages();
      } else {
        wrapper.style.display = 'none';
        membersPanel.style.display = '';
        renderMembers();
      }
    }

    tabSel.addEventListener('change', function(){
      setFieldOptions(tabSel.value);
      orderSel.value = 'asc';
      searchInp.value = '';
      applyAll();
    });
    searchInp.addEventListener('input', applyAll);
    fieldSel.addEventListener('change', applyAll);
    orderSel.addEventListener('change', applyAll);
    printBtn.addEventListener('click', function(){ window.print(); });

    themeSel.addEventListener('change', function(){
      var v = themeSel.value;
      document.documentElement.classList.remove('vtx-theme-dark','vtx-theme-semi','vtx-theme-light');
      document.documentElement.classList.add('vtx-theme-' + v);
      if(v === 'light'){ dm.setAttribute('light-theme','true'); }
      else { dm.removeAttribute('light-theme'); }
    });

    setFieldOptions('messages');
    document.documentElement.classList.add('vtx-theme-semi');
    applyAll();
  });
})();</script>`;

/**
 * Injecte la barre d'outils (recherche, tri, onglet Membres, thèmes, impression)
 * dans le HTML généré par discord-html-transcripts.
 * @param {string} html
 * @returns {string}
 */
function injectToolbar(html) {
  let out = html.replace('</head>', STYLE + '</head>');
  out = out.replace(/<body([^>]*)>/, (m, attrs) => `<body${attrs}>${HTML}`);
  out = out.replace('</body>', SCRIPT + '</body>');
  return out;
}

module.exports = { injectToolbar };
