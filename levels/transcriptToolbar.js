// Barre d'outils + panneau "Membres" injectés dans les transcripts générés par
// discord-html-transcripts (recherche, tri, thèmes, impression) — pur HTML/CSS/JS,
// sans build. Mise en page 2 colonnes : chat à gauche, membres toujours visibles à droite.

const STYLE = `<style>
html, body { height: 100%; }
body {
  display: flex; flex-direction: column;
  min-height: 100vh; height: 100vh; overflow: hidden;
}

#vtx-toolbar {
  flex: 0 0 auto;
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
#vtx-toolbar select, #vtx-toolbar input,
#vtx-sidebar select, #vtx-sidebar input,
#vtx-toolbar button {
  background: #2b2d31; color: #dcddde; border: 1px solid #1e1f22; border-radius: 4px;
  padding: 6px 10px; font-size: 13px; font-family: inherit; outline: none;
}
#vtx-toolbar select:focus, #vtx-toolbar input:focus,
#vtx-sidebar select:focus, #vtx-sidebar input:focus { border-color: #5865f2; }
#vtx-toolbar input[type=text] { min-width: 180px; }
#vtx-toolbar button { cursor: pointer; background: #4f545c; }
#vtx-toolbar button:hover { background: #5d6269; }
#vtx-toggle-members { display: none; }

#vtx-layout { flex: 1 1 auto; min-height: 0; display: flex; }
#vtx-chat { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; }
#vtx-chat .discord-messages, #vtx-chat discord-messages { min-height: 100%; width: 100%; box-sizing: border-box; }

#vtx-sidebar {
  flex: 0 0 280px; min-height: 0; display: flex; flex-direction: column;
  overflow: hidden; background: #2b2d31; border-left: 1px solid #000;
  font-family: Whitney, 'Source Sans Pro', ui-sans-serif, system-ui, sans-serif;
  color: #dcddde;
}
#vtx-sidebar-header {
  flex: 0 0 auto; display: flex; flex-direction: column; gap: 6px;
  padding: 10px; border-bottom: 1px solid #1e1f22;
}
#vtx-sidebar-header .vtx-row { display: flex; gap: 6px; }
#vtx-sidebar-header select, #vtx-sidebar-header input { flex: 1 1 auto; min-width: 0; }
#vtx-sidebar-title { font-weight: 700; font-size: 12px; text-transform: uppercase; color: #949ba4; padding: 0 2px; }
#vtx-members { overflow-y: auto; flex: 1 1 auto; }

.vtx-member-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
.vtx-member-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex: 0 0 auto; }
.vtx-member-info { min-width: 0; flex: 1 1 auto; }
.vtx-member-name { font-weight: 600; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vtx-member-role { font-size: 11px; color: #949ba4; }
.vtx-member-count { font-size: 11px; color: #949ba4; white-space: nowrap; }
.vtx-empty { padding: 24px; text-align: center; color: #949ba4; }

/* Thème : Semi-sombre */
html.vtx-theme-semi .discord-messages { background-color: #4f545c !important; }
html.vtx-theme-semi #vtx-sidebar { background: #5d6269 !important; }
html.vtx-theme-semi #vtx-sidebar-header { border-color: #4f545c !important; }
html.vtx-theme-semi #vtx-toolbar { background: #3a3d44 !important; }

/* Thème : Clair (le mode discord-light-theme gère .discord-messages, on adapte le reste) */
html.vtx-theme-light #vtx-toolbar { background: #f2f3f5 !important; color: #2e3338 !important; border-color: #dedede !important; }
html.vtx-theme-light #vtx-toolbar select, html.vtx-theme-light #vtx-toolbar input, html.vtx-theme-light #vtx-toolbar button,
html.vtx-theme-light #vtx-sidebar select, html.vtx-theme-light #vtx-sidebar input {
  background: #fff !important; color: #2e3338 !important; border-color: #dedede !important;
}
html.vtx-theme-light #vtx-toolbar button:hover { background: #e3e5e8 !important; }
html.vtx-theme-light #vtx-sidebar { background: #fff !important; color: #2e3338 !important; border-color: #dedede !important; }
html.vtx-theme-light #vtx-sidebar-header { border-color: #dedede !important; }
html.vtx-theme-light .vtx-member-count, html.vtx-theme-light .vtx-member-role,
html.vtx-theme-light #vtx-sidebar-title { color: #747f8d !important; }

@media (max-width: 860px) {
  #vtx-toggle-members { display: inline-block; }
  #vtx-sidebar { display: none; position: fixed; inset: 49px 0 0 0; flex: 0 0 auto; z-index: 90; border-left: none; }
  #vtx-sidebar.vtx-open { display: flex; }
}

@media print {
  #vtx-toolbar, #vtx-sidebar { display: none !important; }
  body { height: auto; overflow: visible; }
  #vtx-layout, #vtx-chat { display: block; height: auto; overflow: visible; }
}
</style>`;

const HTML = `<div id="vtx-toolbar">
  <div class="vtx-group">
    <input id="vtx-search" type="text" placeholder="Rechercher...">
    <select id="vtx-sort-field">
      <option value="date">Date</option>
      <option value="author">Auteur</option>
      <option value="content">Contenu</option>
    </select>
    <select id="vtx-sort-order">
      <option value="asc">A → Z</option>
      <option value="desc">Z → A</option>
    </select>
  </div>
  <div class="vtx-spacer"></div>
  <div class="vtx-group">
    <button id="vtx-toggle-members" type="button">👥 Membres</button>
    <button id="vtx-print" type="button">🖨️ Imprimer</button>
    <select id="vtx-theme">
      <option value="dark">🌑 Sombre</option>
      <option value="semi" selected>🌗 Semi-sombre</option>
      <option value="light">☀️ Clair</option>
    </select>
  </div>
</div>
<div id="vtx-layout">
  <div id="vtx-chat"></div>
  <aside id="vtx-sidebar">
    <div id="vtx-sidebar-header">
      <div id="vtx-sidebar-title">Membres</div>
      <input id="vtx-member-search" type="text" placeholder="Rechercher...">
      <div class="vtx-row">
        <select id="vtx-member-field">
          <option value="name">Nom</option>
          <option value="count">Nombre de messages</option>
        </select>
        <select id="vtx-member-order">
          <option value="asc">A → Z</option>
          <option value="desc">Z → A</option>
        </select>
      </div>
    </div>
    <div id="vtx-members"></div>
  </aside>
</div>`;

const SCRIPT = `<script>(function(){
  function ready(fn){ if(document.readyState!=='loading'){fn();}else{document.addEventListener('DOMContentLoaded',fn);} }
  ready(function(){
    var dm = document.querySelector('discord-messages');
    if(!dm) return;

    document.getElementById('vtx-chat').appendChild(dm);

    // IMPORTANT : <discord-message>/<discord-system-message> DOIVENT rester des
    // enfants directs de <discord-messages> (le composant lève une erreur sinon
    // et ne s'affiche plus du tout). On ne les déplace donc jamais dans un wrapper :
    // le tri se fait via insertBefore juste avant le footer, en place.
    var allChildren = Array.prototype.slice.call(dm.children);
    var footer = allChildren[allChildren.length - 1];
    var msgEls = allChildren.filter(function(el){
      var tag = el.tagName.toLowerCase();
      return tag === 'discord-message' || tag === 'discord-system-message';
    });

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

    var searchInp = document.getElementById('vtx-search');
    var fieldSel = document.getElementById('vtx-sort-field');
    var orderSel = document.getElementById('vtx-sort-order');
    var themeSel = document.getElementById('vtx-theme');
    var printBtn = document.getElementById('vtx-print');
    var toggleBtn = document.getElementById('vtx-toggle-members');
    var sidebar = document.getElementById('vtx-sidebar');
    var memberSearchInp = document.getElementById('vtx-member-search');
    var memberFieldSel = document.getElementById('vtx-member-field');
    var memberOrderSel = document.getElementById('vtx-member-order');
    var membersPanel = document.getElementById('vtx-members');

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
      sorted.forEach(function(el){ dm.insertBefore(el, footer); });
    }

    function renderMembers(){
      var q = memberSearchInp.value.trim().toLowerCase();
      var field = memberFieldSel.value, order = memberOrderSel.value;
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
        var info = document.createElement('div');
        info.className = 'vtx-member-info';
        var name = document.createElement('span');
        name.className = 'vtx-member-name';
        name.textContent = m.name;
        if(m.color) name.style.color = m.color;
        info.appendChild(name);
        if(m.role){
          var role = document.createElement('span');
          role.className = 'vtx-member-role';
          role.textContent = m.role;
          info.appendChild(role);
        }
        var count = document.createElement('span');
        count.className = 'vtx-member-count';
        count.textContent = m.count + ' msg';
        row.appendChild(img);
        row.appendChild(info);
        row.appendChild(count);
        membersPanel.appendChild(row);
      });
    }

    searchInp.addEventListener('input', applyMessages);
    fieldSel.addEventListener('change', applyMessages);
    orderSel.addEventListener('change', applyMessages);
    printBtn.addEventListener('click', function(){ window.print(); });

    memberSearchInp.addEventListener('input', renderMembers);
    memberFieldSel.addEventListener('change', renderMembers);
    memberOrderSel.addEventListener('change', renderMembers);

    toggleBtn.addEventListener('click', function(){
      sidebar.classList.toggle('vtx-open');
    });

    themeSel.addEventListener('change', function(){
      var v = themeSel.value;
      document.documentElement.classList.remove('vtx-theme-dark','vtx-theme-semi','vtx-theme-light');
      document.documentElement.classList.add('vtx-theme-' + v);
      if(v === 'light'){ dm.setAttribute('light-theme','true'); }
      else { dm.removeAttribute('light-theme'); }
    });

    document.documentElement.classList.add('vtx-theme-semi');
    applyMessages();
    renderMembers();
  });
})();</script>`;

/**
 * Injecte la barre d'outils et le panneau Membres (mise en page 2 colonnes :
 * chat à gauche, membres à droite) dans le HTML généré par discord-html-transcripts.
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
